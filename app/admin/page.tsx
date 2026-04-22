"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [groups, setGroups] = useState<any>({});
  const [matches, setMatches] = useState<any[]>([]);
  const [scoreInputs, setScoreInputs] = useState<any>({});
  const [showPopup, setShowPopup] = useState(false);
  const [newName, setNewName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  
  // States für die Turniererstellung
  const [newStartTime, setNewStartTime] = useState("");
  const [newMaxTeams, setNewMaxTeams] = useState("");
  const [newGroupCount, setNewGroupCount] = useState("");
  const [newGroupSize, setNewGroupSize] = useState("");
  
  // Panel States
  const [openDesignId, setOpenDesignId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editMax, setEditMax] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [expandedRounds, setExpandedRounds] = useState<any>({});

  // 🔥 States für den K.O.-Generator
  const [koSizes, setKoSizes] = useState<{[key: number]: number}>({});
  const [isGeneratingKo, setIsGeneratingKo] = useState(false);

  // 🔒 Zuverlässiges Discord-Login-System
  useEffect(() => {
    const check = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = localStorage.getItem("discord_user_id");

      if (!userId) {
        setLoadingAuth(false);
        return;
      }

      try {
        const res = await fetch(`/api/discord/member?userId=${userId}`);
        const data = await res.json();

        const ORGA_ROLE_ID = "1492478735444873398"; // 👑 Orga Rolle

        const hasRole = data.roles?.some((r: string) => r === ORGA_ROLE_ID);

        if (hasRole) {
          setLoggedIn(true);
          fetchData();
        } else {
          setLoggedIn(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setLoggedIn(false);
      }
      
      setLoadingAuth(false);
    };

    check();
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    
    // 🔥 REALTIME: Hört nun auch auf tournament_registrations
    const channel = supabase.channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_assignments" }, () => fetchGroups())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_registrations" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loggedIn]);

  const fetchData = async () => {
    const { data: tData, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("FETCH ERROR:", error.message, error.details);
      return;
    }

    setTournaments(tData || []);

    const { data: matchData } = await supabase
      .from("matches")
      .select("*")
      .order("id", { ascending: true });

    if (matchData) setMatches(matchData);

    await fetchGroups();
  };

  // 🔥 ANGEPASST: Nutzt nun die Registrierungstabelle
  const fetchGroups = async () => {
    const { data: regs } = await supabase
      .from("tournament_registrations")
      .select("*, teams(*)")
      .order("created_at", { ascending: true });
      
    const { data: assignments } = await supabase.from("group_assignments").select("*");
    
    if (regs) {
      // Map für die UI, damit nichts kaputt geht
      const mappedTeams = regs.map((r: any) => ({
          id: r.team_id,
          registration_id: r.id, // 🔥 Wichtig für Status-Updates
          tournament_id: r.tournament_id,
          status: r.status,
          teamname: r.teams?.teamname,
      }));
      setTeams(mappedTeams);
    }

    if (assignments && regs) {
      const grouped: any = {};
      assignments.forEach((row) => {
        if (!grouped[row.tournament_id]) grouped[row.tournament_id] = {};
        if (!grouped[row.tournament_id][row.group_name]) grouped[row.tournament_id][row.group_name] = [];
        
        const reg = regs.find((r: any) => r.team_id === row.team_id && r.status === "approved");
        if (reg && reg.teams) {
          grouped[row.tournament_id][row.group_name].push({ id: row.team_id, teamname: reg.teams.teamname });
        }
      });
      setGroups(grouped);
    }
  };

  // 🔥 ANGEPASST: Aktualisiert nun die tournament_registrations Tabelle
  const updateTeamStatus = async (registrationId: number, status: "approved" | "waiting") => {
    await supabase.from("tournament_registrations").update({ status }).eq("id", registrationId);
    fetchData();
  };

  // 🔥 ANGEPASST: 2-Schritt-Erstellung für das Dummy-Team
  const addFreilos = async (tournamentId: number) => {
    // 1. Dummy Team anlegen (ohne tournament_id)
    const { data: newTeam, error: teamError } = await supabase.from("teams").insert([{
      teamname: "--- FREILOS ---"
    }]).select().single();
    
    if (teamError) {
      alert("Fehler beim Erstellen des Freilos (Schritt 1): " + teamError.message);
      return;
    }

    // 2. Registrierung für das Turnier erstellen
    const { error: regError } = await supabase.from("tournament_registrations").insert([{
      team_id: newTeam.id,
      tournament_id: tournamentId,
      status: "approved"
    }]);

    if (regError) {
      alert("Fehler bei Freilos-Anmeldung (Schritt 2): " + regError.message);
    } else {
      fetchData();
    }
  };

  const updateField = async (id: number, field: string, value: any) => {
    const { error } = await supabase.from("tournaments").update({ [field]: value }).eq("id", id);
    if (error) {
      console.error("SUPABASE ERROR:", error.message, error.details);
      alert(error.message);
      return;
    }

    if (field === "max_teams" && value !== null) {
      await handleTeamMovement(id, value);
    }

    fetchData();
  };

  // 🔥 ANGEPASST: Nutzt nun tournament_registrations
  const handleTeamMovement = async (tournamentId: number, maxTeams: number) => {
    const { data: allRegs } = await supabase
      .from("tournament_registrations")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });

    if (!allRegs) return;

    let approved = allRegs.filter(t => t.status === "approved");
    let waiting = allRegs.filter(t => t.status === "waiting");

    while (approved.length < maxTeams && waiting.length > 0) {
      const next = waiting.shift();
      if (!next) break;

      await supabase.from("tournament_registrations").update({ status: "approved" }).eq("id", next.id);
      approved.push(next);
    }

    while (approved.length > maxTeams) {
      const last = approved.pop();
      if (!last) break;

      await supabase.from("tournament_registrations").update({ status: "waiting" }).eq("id", last.id);
      waiting.unshift(last);
    }
  };

  const saveEdit = async (id: number) => {
    const newMax = editMax ? Number(editMax) : null;
    const { error } = await supabase
      .from("tournaments")
      .update({
        name: editName,
        max_teams: newMax,
        start_time: editStartTime || null,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Fehler beim Speichern!");
      return;
    }

    if (newMax !== null) {
      await handleTeamMovement(id, newMax);
    }

    setEditingId(null);
    fetchData();
  };

  const duplicateTournament = async (t: any) => {
    const { id, created_at, ...copyData } = t;
    const { error } = await supabase.from("tournaments").insert([{ ...copyData, name: `${t.name} Kopie`, status: "active", archived: false }]);
    if (error) alert(error.message);
    else fetchData();
  };

  const resetTournament = async (tournamentId: number) => {
    if (!confirm("Turnier wirklich zurücksetzen? ❗ Alle Spiele und Gruppenzuweisungen werden gelöscht!")) return;

    const { error: matchError } = await supabase.from("matches").delete().eq("tournament_id", tournamentId);
    const { error: groupError } = await supabase.from("group_assignments").delete().eq("tournament_id", tournamentId);
    const { error: tourneyError } = await supabase.from("tournaments").update({  started: false, draw_finished: false}).eq("id", tournamentId);
      
    if (matchError || groupError || tourneyError) {
      alert("Fehler beim Zurücksetzen! Bitte öffne die Konsole (F12) für Details.");
      return;
    }
    fetchData();
  };

  const finishTournament = async (id: number) => {
    if (!confirm("Turnier wirklich beenden und archivieren?")) return;
    await supabase.from("tournaments").update({ status: "finished", archived: true }).eq("id", id);
    fetchData();
  };

  const generateMatches = async (tournamentId: number) => {
    const tournamentGroups = groups[tournamentId];
    if (!tournamentGroups) return alert("Keine Gruppen gefunden! Bitte warte auf die Auslosung.");
    if (!confirm("Spielplan neu erstellen? Bestehende Ergebnisse werden gelöscht!")) return;

    const { error: deleteError } = await supabase.from("matches").delete().eq("tournament_id", tournamentId);
    if (deleteError) return alert(`Fehler beim Löschen alter Spiele: ${deleteError.message}`);

    const inserts: any[] = [];

    Object.entries(tournamentGroups).forEach(([group, groupTeams]: any) => {
      let teamsForRotation = [...groupTeams];
      if (teamsForRotation.length % 2 !== 0) {
        teamsForRotation.push({ id: null, teamname: "BYE" });
      }
      const numRounds = teamsForRotation.length - 1;
      const half = teamsForRotation.length / 2;

      for (let round = 0; round < numRounds; round++) {
        for (let i = 0; i < half; i++) {
          const t1 = teamsForRotation[i];
          const t2 = teamsForRotation[teamsForRotation.length - 1 - i];
          
          if (t1.id && t2.id) {
            const isT1Freilos = t1.teamname === "--- FREILOS ---";
            const isT2Freilos = t2.teamname === "--- FREILOS ---";
            
            let initialScore1 = null;
            let initialScore2 = null;
            let initialStatus = null;

            if (isT1Freilos) {
              initialScore1 = 0;
              initialScore2 = 1;
              initialStatus = "confirmed";
            } else if (isT2Freilos) {
              initialScore1 = 1;
              initialScore2 = 0;
              initialStatus = "confirmed";
            }

            inserts.push({
              tournament_id: tournamentId,
              group_name: group,
              team1_id: t1.id,
              team2_id: t2.id,
              match_type: "group",
              round: round + 1,
              status: initialStatus,
              score1: initialScore1,
              score2: initialScore2,
              reported_by: null,
              confirmed_by: null
            });
          }
        }
        teamsForRotation.splice(1, 0, teamsForRotation.pop()!);
      }
    });

    if (inserts.length === 0) return alert("Es konnten keine Spiele generiert werden.");

    const { error: insertError } = await supabase.from("matches").insert(inserts);
    if (insertError) return alert(`Fehler beim Erstellen der Spiele: ${insertError.message}`);
    
    await supabase.from("tournaments").update({ started: true }).eq("id", tournamentId);
    fetchData();
  };

  // 🔥 INTERNE BERECHNUNG FÜR K.O. GENERATOR
  const calculateRankingsForKo = (tournamentId: number) => {
    const tGroups = groups[tournamentId];
    if (!tGroups) return [];

    const tMatches = matches.filter(m => m.tournament_id === tournamentId && m.match_type !== "ko" && m.status === "confirmed");
    let allRankedTeams: any[] = [];

    Object.entries(tGroups).forEach(([groupName, groupTeams]: any) => {
      const table: any = {};
      groupTeams.forEach((team: any) => {
        table[team.id] = { ...team, sp: 0, g: 0, u: 0, v: 0, tore: 0, gegentore: 0, pkt: 0 };
      });

      tMatches.forEach(m => {
        if (m.group_name !== groupName) return;
        if (m.score1 == null || m.score2 == null) return;
        const t1 = table[m.team1_id], t2 = table[m.team2_id];
        if (!t1 || !t2) return;

        t1.sp++; t2.sp++;
        t1.tore += m.score1; t1.gegentore += m.score2;
        t2.tore += m.score2; t2.gegentore += m.score1;

        if (m.score1 > m.score2) { t1.g++; t2.v++; t1.pkt += 3; }
        else if (m.score1 < m.score2) { t2.g++; t1.v++; t2.pkt += 3; }
        else { t1.u++; t2.u++; t1.pkt++; t2.pkt++; }
      });

      const sortedGroup = Object.values(table)
        .map((t: any) => ({ ...t, diff: t.tore - t.gegentore }))
        .sort((a: any, b: any) => b.pkt - a.pkt || b.diff - a.diff || b.tore - a.tore);

      sortedGroup.forEach((t: any, index) => {
        allRankedTeams.push({
          ...t,
          groupRank: index + 1
        });
      });
    });

    allRankedTeams.sort((a, b) => {
      if (a.groupRank !== b.groupRank) return a.groupRank - b.groupRank; 
      return b.pkt - a.pkt || b.diff - a.diff || b.tore - a.tore;
    });

    return allRankedTeams.filter(t => t.teamname !== "--- FREILOS ---");
  };

  // 🔥 K.O.-PHASE GENERIEREN (Global Seeding)
  const generateKoPhase = async (tournamentId: number) => {
    const size = koSizes[tournamentId] || 8; 

    const tMatches = matches.filter(m => m.tournament_id === tournamentId);
    if (tMatches.some(m => m.match_type === "ko")) {
      alert("Es gibt bereits K.O.-Spiele für dieses Turnier!");
      return;
    }

    setIsGeneratingKo(true);

    try {
      const seedList = calculateRankingsForKo(tournamentId);
      const qualifiedTeams = seedList.slice(0, size);

      if (qualifiedTeams.length < size) {
        alert(`Nicht genug Teams mit Spielen! Es gibt nur ${qualifiedTeams.length} Teams in der Wertung, benötigt werden ${size}. (Freilose zählen nicht mit)`);
        setIsGeneratingKo(false);
        return;
      }

      const newMatches = [];
      for (let i = 0; i < size / 2; i++) {
        const homeTeam = qualifiedTeams[i]; 
        const awayTeam = qualifiedTeams[size - 1 - i]; 

        newMatches.push({
          tournament_id: tournamentId,
          team1_id: homeTeam.id,
          team2_id: awayTeam.id,
          match_type: "ko",
          ko_round: size,
          status: null, 
          score1: null,
          score2: null,
          reported_by: null,
          confirmed_by: null
        });
      }

      const { error } = await supabase.from("matches").insert(newMatches);
      
      if (error) {
        console.error("Datenbank Fehler bei KO Generierung:", error);
        alert(`Fehler in Supabase: ${error.message}. Hast du die Spalten für die KO-Phase erstellt?`);
        setIsGeneratingKo(false);
        return;
      }

      await supabase.from("tournaments").update({ ko_status: "active", ko_teams_count: size }).eq("id", tournamentId);

      alert(`K.O.-Phase erfolgreich für ${size} Teams generiert!`);
      fetchData();

    } catch (err: any) {
      console.error(err);
      alert("Allgemeiner Fehler beim Erstellen der K.O.-Phase: " + err.message);
    }

    setIsGeneratingKo(false);
  };

  const handleScoreChange = (matchId: number, field: "s1" | "s2", value: string) => {
    setScoreInputs((prev: any) => ({ ...prev, [matchId]: { ...prev[matchId], [field]: value.replace(/[^0-9]/g, "") } }));
  };

  // ✅ NEU: EINZELNES SPIEL SPEICHERN (Inkl. TS Fix für Auto-Advance)
  const saveSingleMatch = async (matchId: number) => {
    const input = scoreInputs[matchId];
    if (!input) return;

    const s1 = input.s1;
    const s2 = input.s2;

    if (s1 === "" || s2 === "" || s1 == null || s2 == null) return;

    const { error } = await supabase
      .from("matches")
      .update({
        score1: Number(s1),
        score2: Number(s2),
        status: "confirmed",
        reported_by: null,
        confirmed_by: null
      })
      .eq("id", matchId);

    if (error) {
      console.error(error);
      alert("Fehler beim Speichern");
      return;
    }

    // 🔥 AUTO-ADVANCE für Admin
    const m = matches.find(x => x.id === matchId);
    if (m && m.match_type === "ko" && m.ko_round > 2) {
      const { data: roundMatches } = await supabase.from("matches").select("*").eq("tournament_id", m.tournament_id).eq("ko_round", m.ko_round).eq("match_type", "ko");
      
      if (roundMatches) { 
          const allConfirmed = roundMatches.every(x => x.id === matchId ? true : x.status === "confirmed");
          
          if (allConfirmed) {
              const nextRound = m.ko_round / 2;
              const { data: nextMatches } = await supabase.from("matches").select("*").eq("tournament_id", m.tournament_id).eq("ko_round", nextRound).eq("match_type", "ko");
                
              if (!nextMatches || nextMatches.length === 0) {
                roundMatches.sort((a, b) => a.id - b.id);
                const inserts = [];
                for (let i = 0; i < roundMatches.length; i += 2) {
                    const m1 = roundMatches[i];
                    const m2 = roundMatches[i+1];
                    
                    const getWinner = (match: any) => {
                      const s1_val = match.id === matchId ? Number(s1) : (match.score1 || 0);
                      const s2_val = match.id === matchId ? Number(s2) : (match.score2 || 0);
                      return s1_val > s2_val ? match.team1_id : (s2_val > s1_val ? match.team2_id : match.team1_id);
                    };
                    
                    inserts.push({
                      tournament_id: m.tournament_id,
                      team1_id: getWinner(m1),
                      team2_id: getWinner(m2),
                      match_type: "ko",
                      ko_round: nextRound,
                      status: null, score1: null, score2: null
                    });
                }
                if (inserts.length > 0) await supabase.from("matches").insert(inserts);
              }
          }
      }
    }

    fetchData();
  };

  const createTournament = async () => {
    if (!newName) return;
    
    const { error } = await supabase.from("tournaments").insert([{
      name: newName,
      start_time: newStartTime || null,
      max_teams: newMaxTeams ? Number(newMaxTeams) : null,
      group_count: newGroupCount ? Number(newGroupCount) : null,
      group_size: newGroupSize ? Number(newGroupSize) : null,
      status: "active",
      archived: false,
      color_top: "#22c55e",
      color_middle: "#f97316",
      color_bottom: "#ef4444",
      top_places: 2,
      bottom_places: 1,
      started: false,
      draw_finished: false
    }]);

    if (error) return alert(`Fehler: ${error.message}`);

    setShowPopup(false);
    setNewName("");
    setNewStartTime("");
    setNewMaxTeams("");
    setNewGroupCount("");
    setNewGroupSize("");
    fetchData();
  };

  // 🔥 Ladescreen während Authentifizierung geprüft wird
  if (loadingAuth) {
    return (
      <div className="h-screen flex items-center justify-center text-white font-medium">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 🔒 Seite blocken: Neues Design
  if (!loggedIn) {
    return (
      <main className="h-screen flex flex-col items-center justify-center text-white p-4 md:p-6 text-center">
        <div className="bg-[#111] p-8 md:p-10 rounded-3xl border border-red-500/20 shadow-2xl mx-4">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl md:text-2xl font-bold mb-2">Kein Zugriff</h2>
          <p className="text-gray-400 max-w-xs mx-auto text-xs md:text-sm">
          Du hast keine Berechtigung für diesen Bereich.
          </p>
          <button onClick={() => window.location.href = '/'} className="mt-8 text-gray-500 hover:text-white transition text-sm underline">
            Zurück zur Startseite
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-12 text-white px-4 md:px-6 max-w-[1600px] mx-auto w-full">
      
      <button onClick={() => setShowPopup(true)} className="w-full md:w-auto bg-green-600 px-6 py-3 md:py-2 rounded-xl font-bold mb-8 md:mb-10 hover:bg-green-500 transition shadow-lg shadow-green-900/20">
        + Neues Turnier
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {tournaments.filter(t => !t.archived).map((t) => {
          const tournamentGroups = groups[t.id];
          const approvedTeams = teams.filter(x => x.tournament_id === t.id && x.status === "approved");
          const waitingTeams = teams.filter(x => x.tournament_id === t.id && x.status === "waiting");
          
          // Matches für Gruppenphase
          const tournamentMatches = matches.filter(m => m.tournament_id === t.id && m.match_type !== "ko");
          const roundNumbers = Array.from(new Set(tournamentMatches.map(m => m.round || 1))).sort((a, b) => a - b);
          
          // 🔥 PRÜFEN OB ALLE GRUPPENSPIELE FERTIG SIND
          const allGroupMatchesConfirmed = tournamentMatches.length > 0 && tournamentMatches.every(m => m.status === "confirmed");

          // Matches für K.O. Phase
          const koMatches = matches.filter(m => m.tournament_id === t.id && m.match_type === "ko");

          return (
            <div key={t.id} className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-5 md:p-8 shadow-2xl flex flex-col">
              
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-white/5 pb-4 xl:border-none xl:pb-0">
                <div className="w-full xl:w-auto">
                  <h3 className="text-xl md:text-2xl font-bold break-words">{t.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => { 
                      setEditingId(editingId === t.id ? null : t.id); 
                      setEditName(t.name); 
                      setEditMax(t.max_teams || ""); 
                      setEditStartTime(t.start_time || ""); 
                      setOpenDesignId(null); 
                    }} className="text-[10px] md:text-xs px-3 py-1.5 bg-white/5 rounded-full border border-white/10 uppercase font-bold hover:bg-white/10 transition">✏️ Edit</button>
                    
                    <button onClick={() => { setOpenDesignId(openDesignId === t.id ? null : t.id); setEditingId(null); }} className="text-[10px] md:text-xs px-3 py-1.5 bg-white/5 rounded-full border border-white/10 uppercase font-bold hover:bg-white/10 transition">🎨 Design</button>
                    <button onClick={() => duplicateTournament(t)} className="text-[10px] md:text-xs px-3 py-1.5 bg-white/5 rounded-full border border-white/10 uppercase font-bold hover:bg-white/10 transition">📄 Copy</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-start xl:justify-end">
                  <button onClick={() => resetTournament(t.id)} className="flex-1 xl:flex-none bg-red-600/10 text-red-500 px-3 py-2 rounded-lg text-xs font-bold border border-red-500/20 hover:bg-red-600 hover:text-white transition text-center">🔄 Neustart</button>
                  <button onClick={() => finishTournament(t.id)} className="flex-1 xl:flex-none bg-red-500/10 text-red-500 px-3 py-2 rounded-lg text-xs font-bold border border-red-500/20 hover:bg-red-600 hover:text-white transition text-center">🛑 Beenden</button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-3 text-[10px] md:text-xs uppercase tracking-widest text-gray-400 font-bold">
                <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded">Bestätigt: {approvedTeams.length} / {t.max_teams || "∞"}</span>
                {waitingTeams.length > 0 && <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Warteliste: {waitingTeams.length}</span>}
              </div>

              <div className="mb-8">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 border-b border-white/5 pb-1 font-bold">Anmeldungen verwalten</p>
                <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
                  {teams.filter(team => team.tournament_id === t.id).map(team => (
                    <div key={team.registration_id || team.id} className="flex justify-between items-center text-xs md:text-sm bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                      <span className={`truncate max-w-[150px] sm:max-w-[200px] font-medium ${team.status === 'waiting' ? 'text-yellow-500/80' : 'text-white'}`}>
                        {team.teamname}
                      </span>
                      <div className="flex gap-4">
                        {/* 🔥 WICHTIG: Nutzt jetzt team.registration_id */}
                        <button onClick={() => updateTeamStatus(team.registration_id, "approved")} className={`${team.status === 'approved' ? 'text-green-500 scale-110' : 'text-gray-500'} hover:scale-125 transition-transform text-base`}>✔</button>
                        <button onClick={() => updateTeamStatus(team.registration_id, "waiting")} className={`${team.status === 'waiting' ? 'text-yellow-500 scale-110' : 'text-gray-500'} hover:scale-125 transition-transform text-base`}>⏳</button>
                      </div>
                    </div>
                  ))}
                  {teams.filter(team => team.tournament_id === t.id).length === 0 && (
                    <div className="text-xs text-gray-500 text-center py-4 italic">Noch keine Teams angemeldet.</div>
                  )}
                </div>
                
                {/* 🔥 NEUER BUTTON: FREILOS HINZUFÜGEN 🔥 */}
                <button onClick={() => addFreilos(t.id)} className="w-full mt-3 border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-white py-2 rounded-xl text-xs font-bold transition">
                  + Dummy-Team (--- FREILOS ---) hinzufügen
                </button>
              </div>

              {editingId === t.id && (
                <div className="mb-8 p-4 md:p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-xs uppercase tracking-widest text-blue-400 font-bold mb-2">Turnier bearbeiten</h4>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold">Turniername</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2.5 bg-black/40 rounded-lg border border-white/10 text-sm focus:border-blue-500 outline-none transition" placeholder="Name" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold">Max. Teilnehmer (Teams)</label>
                    <input type="number" value={editMax} onChange={(e) => setEditMax(e.target.value)} className="w-full p-2.5 bg-black/40 rounded-lg border border-white/10 text-sm focus:border-blue-500 outline-none transition" placeholder="z.B. 16" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold">Startzeitpunkt</label>
                    <input type="datetime-local" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="w-full p-2.5 bg-black/40 rounded-lg border border-white/10 text-sm focus:border-blue-500 outline-none transition" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold">Anzahl Gruppen</label>
                      <input type="number" placeholder="z.B. 2" value={t.group_count || ""} onChange={(e) => updateField(t.id, "group_count", Number(e.target.value))} className="w-full p-2.5 bg-black/40 rounded-lg border border-white/10 text-sm focus:border-blue-500 outline-none transition" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold">Teams pro Gruppe</label>
                      <input type="number" placeholder="z.B. 4" value={t.group_size || ""} onChange={(e) => updateField(t.id, "group_size", Number(e.target.value))} className="w-full p-2.5 bg-black/40 rounded-lg border border-white/10 text-sm focus:border-blue-500 outline-none transition" />
                    </div>
                  </div>
                  <button onClick={() => saveEdit(t.id)} className="w-full bg-blue-600 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition shadow-lg shadow-blue-900/20 mt-4">Speichern</button>
                </div>
              )}

              {openDesignId === t.id && (
                <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex-1 min-w-[100px]"><p className="mb-1 uppercase font-bold text-gray-400">Top Plätze</p><input type="number" value={t.top_places || 2} onChange={(e) => updateField(t.id, "top_places", Number(e.target.value))} className="w-full bg-black/40 rounded-lg border border-white/10 p-2 outline-none focus:border-blue-500 transition" /></div>
                    <div className="flex-1 min-w-[100px]"><p className="mb-1 uppercase font-bold text-gray-400">Bottom Plätze</p><input type="number" value={t.bottom_places || 1} onChange={(e) => updateField(t.id, "bottom_places", Number(e.target.value))} className="w-full bg-black/40 rounded-lg border border-white/10 p-2 outline-none focus:border-blue-500 transition" /></div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs uppercase font-bold text-gray-400">Farben (Top / Middle / Bottom)</p>
                    <div className="flex flex-wrap gap-4">
                      <input type="color" value={t.color_top || "#22c55e"} onChange={(e) => updateField(t.id, "color_top", e.target.value)} className="w-12 h-12 rounded cursor-pointer border-none bg-transparent" />
                      <input type="color" value={t.color_middle || "#f97316"} onChange={(e) => updateField(t.id, "color_middle", e.target.value)} className="w-12 h-12 rounded cursor-pointer border-none bg-transparent" />
                      <input type="color" value={t.color_bottom || "#ef4444"} onChange={(e) => updateField(t.id, "color_bottom", e.target.value)} className="w-12 h-12 rounded cursor-pointer border-none bg-transparent" />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-auto">
                {!tournamentGroups ? (
                  <p className="text-yellow-500 text-sm p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/20 mb-2 font-bold text-center">⚠️ Warte auf Auslosung auf Draw-Seite...</p>
                ) : (
                  <div className="mb-8 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(tournamentGroups).map(([group, teams]: any) => (
                        <div key={group} className="p-3 bg-white/5 rounded-xl border border-white/10">
                          <p className="text-yellow-400 font-bold text-xs mb-2 text-center uppercase tracking-wider">Gruppe {group}</p>
                          {teams.map((team: any, i: number) => (
                            <div key={team.id} className="text-xs py-1.5 border-t border-white/5 flex gap-2">
                              <span className="text-gray-500 w-4 text-right">{i + 1}.</span> 
                              <span className="truncate font-medium">{team.teamname}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => generateMatches(t.id)} className="w-full bg-blue-600 py-3 md:py-4 rounded-xl font-bold text-sm md:text-base hover:bg-blue-500 transition shadow-lg mt-2">⚽ Spielplan generieren</button>
                  </div>
                )}

                {/* GRUPPENPHASE SPIELE ANZEIGEN */}
                {tournamentMatches.length > 0 && (
                  <div className="mt-8 border-t border-white/10 pt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                      <h4 className="font-bold text-lg">Gruppenphase Ergebnisse</h4>
                    </div>
                    
                    <div className="space-y-4">
                      {roundNumbers.map(roundNum => {
                        const isExpanded = expandedRounds[`${t.id}-${roundNum}`];
                        const roundMatches = tournamentMatches.filter(m => (m.round || 1) === roundNum);
                        const groupsInRound = Array.from(new Set(roundMatches.map(m => m.group_name))).sort();

                        return (
                          <div key={roundNum} className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 transition-all">
                            <button onClick={() => setExpandedRounds((p: any) => ({...p, [`${t.id}-${roundNum}`]: !isExpanded}))} className="w-full p-4 flex justify-between items-center hover:bg-white/10 transition text-sm">
                              <span className="font-bold text-purple-400 uppercase tracking-widest">Spieltag {roundNum}</span>
                              <span className="text-[10px] text-gray-400 font-bold bg-black/40 px-3 py-1 rounded-full">{isExpanded ? "SCHLIESSEN ▲" : "ÖFFNEN ▼"}</span>
                            </button>
                            
                            {isExpanded && (
                              <div className="p-2 sm:p-4 space-y-6 bg-black/20 border-t border-white/5">
                                {groupsInRound.map(groupName => (
                                  <div key={groupName}>
                                    <p className="text-[10px] text-yellow-500 font-bold uppercase mb-2 ml-2 tracking-wider">Gruppe {groupName}</p>
                                    <div className="w-full overflow-x-auto rounded-xl">
                                      <table className="w-full text-xs md:text-sm bg-black/40 min-w-[300px]">
                                        <tbody>
                                          {roundMatches.filter(m => m.group_name === groupName).map(m => (
                                            <tr key={m.id} className="border-t border-white/5 first:border-none hover:bg-white/5 transition-colors">
                                              <td className="p-2 md:p-3 w-[35%] text-right font-medium truncate max-w-[100px] md:max-w-[150px]">{teams.find(x => x.id === m.team1_id)?.teamname}</td>
                                              
                                              <td className="p-2 md:p-3 w-[30%] text-center">
                                                <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                  <input
                                                    type="tel"
                                                    value={scoreInputs[m.id]?.s1 ?? m.score1 ?? ""}
                                                    onChange={(e) => handleScoreChange(m.id, "s1", e.target.value)}
                                                    className="w-10 h-8 md:w-12 md:h-10 bg-white/10 rounded-lg text-center border border-white/10 outline-none focus:border-blue-500 focus:bg-white/20 transition text-base font-bold"
                                                  />
                                                  <span className="font-bold text-gray-500">:</span>
                                                  <input
                                                    type="tel"
                                                    value={scoreInputs[m.id]?.s2 ?? m.score2 ?? ""}
                                                    onChange={(e) => handleScoreChange(m.id, "s2", e.target.value)}
                                                    className="w-10 h-8 md:w-12 md:h-10 bg-white/10 rounded-lg text-center border border-white/10 outline-none focus:border-blue-500 focus:bg-white/20 transition text-base font-bold"
                                                  />
                                                  <button onClick={() => saveSingleMatch(m.id)} className="ml-2 bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1.5 rounded transition shadow-sm" title="Speichern">✔</button>
                                                </div>
                                              </td>
                                              
                                              <td className="p-2 md:p-3 w-[35%] text-left font-medium truncate max-w-[100px] md:max-w-[150px]">{teams.find(x => x.id === m.team2_id)?.teamname}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 🔥 ADMIN BEREICH K.O. PHASE 🔥 */}
                {t.started && (
                  <div className="mt-8 border-t border-red-500/30 pt-6">
                    <h4 className="font-bold text-red-400 uppercase tracking-widest mb-4">🏆 K.O.-Phase Generieren</h4>
                    
                    {!allGroupMatchesConfirmed ? (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <p className="text-yellow-400 font-bold text-sm">⚠️ Die K.O.-Phase kann erst ausgelost werden, wenn ALLE Gruppenspiele beendet und bestätigt sind.</p>
                      </div>
                    ) : koMatches.length > 0 ? (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-red-400 font-bold text-sm">Die K.O.-Phase wurde bereits generiert.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                        <select
                          className="bg-black/50 border border-white/10 text-white p-3 rounded-lg font-bold outline-none focus:border-red-400"
                          value={koSizes[t.id] || 8}
                          onChange={(e) => setKoSizes({ ...koSizes, [t.id]: Number(e.target.value) })}
                        >
                          <option value={64}>1/32-Finale (64 Teams)</option>
                          <option value={32}>Sechzehntelfinale (32 Teams)</option>
                          <option value={16}>Achtelfinale (16 Teams)</option>
                          <option value={8}>Viertelfinale (8 Teams)</option>
                          <option value={4}>Halbfinale (4 Teams)</option>
                          <option value={2}>Finale (2 Teams)</option>
                        </select>
                        <button
                          onClick={() => generateKoPhase(t.id)}
                          disabled={isGeneratingKo}
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition shadow-lg disabled:opacity-50"
                        >
                          {isGeneratingKo ? "Generiere..." : "🔥 K.O.-Baum auslosen"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* K.O. SPIELE ANZEIGEN & BEARBEITEN */}
                {koMatches.length > 0 && (
                  <div className="mt-8 border-t border-white/10 pt-6">
                    <h4 className="font-bold text-lg mb-6 text-yellow-400">K.O.-Phase Ergebnisse</h4>
                    <div className="space-y-4">
                      {[64, 32, 16, 8, 4, 2, 1].filter(r => koMatches.some(m => m.ko_round === r)).map(roundSize => {
                        const roundName = roundSize === 64 ? "1/32-Finale" : roundSize === 32 ? "Sechzehntelfinale" : roundSize === 16 ? "Achtelfinale" : roundSize === 8 ? "Viertelfinale" : roundSize === 4 ? "Halbfinale" : "Finale";
                        const matchesInRound = koMatches.filter(m => m.ko_round === roundSize);
                        const isExpanded = expandedRounds[`${t.id}-ko-${roundSize}`];

                        return (
                          <div key={roundSize} className="bg-white/5 rounded-2xl overflow-hidden border border-yellow-500/20 transition-all">
                            <button onClick={() => setExpandedRounds((p: any) => ({...p, [`${t.id}-ko-${roundSize}`]: !isExpanded}))} className="w-full p-4 flex justify-between items-center hover:bg-white/10 transition text-sm">
                              <span className="font-bold text-yellow-500 uppercase tracking-widest">{roundName}</span>
                              <span className="text-[10px] text-gray-400 font-bold bg-black/40 px-3 py-1 rounded-full">{isExpanded ? "SCHLIESSEN ▲" : "ÖFFNEN ▼"}</span>
                            </button>
                            
                            {isExpanded && (
                              <div className="p-2 sm:p-4 bg-black/40 border-t border-yellow-500/20">
                                <div className="w-full overflow-x-auto rounded-xl">
                                  <table className="w-full text-xs md:text-sm bg-black/40 min-w-[300px]">
                                    <tbody>
                                      {matchesInRound.map(m => (
                                        <tr key={m.id} className="border-t border-white/5 first:border-none hover:bg-white/5 transition-colors">
                                          <td className="p-2 md:p-3 w-[35%] text-right font-medium truncate max-w-[100px] md:max-w-[150px] text-yellow-400">{teams.find(x => x.id === m.team1_id)?.teamname}</td>
                                          
                                          <td className="p-2 md:p-3 w-[30%] text-center">
                                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                                              <input
                                                type="tel"
                                                value={scoreInputs[m.id]?.s1 ?? m.score1 ?? ""}
                                                onChange={(e) => handleScoreChange(m.id, "s1", e.target.value)}
                                                className="w-10 h-8 md:w-12 md:h-10 bg-white/10 rounded-lg text-center border border-yellow-500/30 outline-none focus:border-yellow-400 focus:bg-white/20 transition text-base font-bold text-yellow-300"
                                              />
                                              <span className="font-bold text-gray-500">:</span>
                                              <input
                                                type="tel"
                                                value={scoreInputs[m.id]?.s2 ?? m.score2 ?? ""}
                                                onChange={(e) => handleScoreChange(m.id, "s2", e.target.value)}
                                                className="w-10 h-8 md:w-12 md:h-10 bg-white/10 rounded-lg text-center border border-yellow-500/30 outline-none focus:border-yellow-400 focus:bg-white/20 transition text-base font-bold text-yellow-300"
                                              />
                                              <button onClick={() => saveSingleMatch(m.id)} className="ml-2 bg-yellow-600 hover:bg-yellow-500 text-black text-xs px-2 py-1.5 rounded transition shadow-sm font-bold" title="Speichern">✔</button>
                                            </div>
                                          </td>
                                          
                                          <td className="p-2 md:p-3 w-[35%] text-left font-medium truncate max-w-[100px] md:max-w-[150px] text-yellow-400">{teams.find(x => x.id === m.team2_id)?.teamname}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tournaments.some(t => t.archived) && (
        <div className="mt-20">
          <h2 className="text-gray-300 font-bold mb-4 uppercase tracking-wider text-sm md:text-base border-b border-white/10 pb-2">Archivierte Turniere</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tournaments.filter(t => t.archived).map(t => (
              <div key={t.id} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 flex justify-between items-center transition shadow-lg">
                <span className="text-sm font-medium truncate mr-4">{t.name}</span>
                <button onClick={() => updateField(t.id, 'archived', false)} className="shrink-0 text-[10px] md:text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg border border-yellow-500/30 hover:bg-yellow-500 hover:text-black transition font-bold uppercase tracking-wider">Reaktivieren</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPopup && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#111] p-6 md:p-8 rounded-3xl border border-white/10 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-center text-white tracking-wide">Neues Turnier</h2>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl mb-4 outline-none focus:border-green-500 transition text-sm" placeholder="Turniername" />
            <input type="datetime-local" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl mb-4 outline-none focus:border-green-500 transition text-sm" />
            <input type="number" placeholder="Max. Teams" value={newMaxTeams} onChange={(e) => setNewMaxTeams(e.target.value)} className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl mb-4 outline-none focus:border-green-500 transition text-sm" />
            <div className="flex gap-4 mb-8">
              <input type="number" placeholder="Gruppen" value={newGroupCount} onChange={(e) => setNewGroupCount(e.target.value)} className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-green-500 transition text-sm" />
              <input type="number" placeholder="Teams/Gr." value={newGroupSize} onChange={(e) => setNewGroupSize(e.target.value)} className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-green-500 transition text-sm" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={createTournament} className="w-full bg-green-600 py-3.5 rounded-xl font-bold transition hover:bg-green-500 text-sm shadow-lg">Erstellen</button>
              <button onClick={() => setShowPopup(false)} className="w-full bg-white/10 py-3.5 rounded-xl font-bold transition hover:bg-white/20 text-sm">Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}