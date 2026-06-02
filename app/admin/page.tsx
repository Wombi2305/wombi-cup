"use client";
import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image"; 
import TeamCard from "@/components/TeamCard"; // 🔥 Globale TeamCard importiert

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isFullAdmin, setIsFullAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [groups, setGroups] = useState<any>({});
  const [matches, setMatches] = useState<any[]>([]);
  const [scoreInputs, setScoreInputs] = useState<any>({});
  const [showPopup, setShowPopup] = useState(false);
  const [newName, setNewName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  
  const [newStartTime, setNewStartTime] = useState("");
  const [newMaxTeams, setNewMaxTeams] = useState("");
  const [newGroupCount, setNewGroupCount] = useState("");
  const [newGroupSize, setNewGroupSize] = useState("");
  
  const [newCupType, setNewCupType] = useState("t_cup");
  
  const [openDesignId, setOpenDesignId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<any>({});

  const [activeTabs, setActiveTabs] = useState<{ [key: number]: string }>({});

  const [koSizes, setKoSizes] = useState<{[key: number]: number}>({});
  const [isGeneratingKo, setIsGeneratingKo] = useState(false);

  // 🔥 NEU: Speichert pro Turnier, ob Hin- und Rückspiel gewünscht ist
  const [doubleRoundRobin, setDoubleRoundRobin] = useState<{[key: number]: boolean}>({});

  // State für die Admin-Benachrichtigungen (Toasts)
  const [adminMessage, setAdminMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const showAdminMessage = (text: string, type: 'error' | 'success') => {
    setAdminMessage({ text, type });
    setTimeout(() => setAdminMessage(null), 5000);
  };

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
        
        const ORGA_ROLE_ID = "1492478735444873398"; 
        const TL_ROLE_ID = "1504431450177667092";

        const hasOrgaRole = data.roles?.some((r: string) => r === ORGA_ROLE_ID);
        const hasTlRole = data.roles?.some((r: string) => r === TL_ROLE_ID);

        if (hasOrgaRole || hasTlRole) {
          setLoggedIn(true);
          setIsFullAdmin(hasOrgaRole);
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
    
    const channel = supabase.channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_assignments" }, () => fetchGroups())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_registrations" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => fetchData())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, (payload) => {
        fetchData();
        const oldRow = payload.old as any;
        const newRow = payload.new as any;
        
        if (newRow.status === "rejected" && oldRow.status !== "rejected") {
           showAdminMessage("🚨 Konflikt! Ein Ergebnis wurde abgelehnt.", "error");
        } else if (newRow.status === "confirmed" && oldRow.status !== "confirmed") {
           showAdminMessage("✅ Ein Ergebnis wurde von den Teams bestätigt.", "success");
        }
      })
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

  const fetchGroups = async () => {
    // 🔥 GEFIXT: teams(*) lädt nun alle Custom-Rewards mit herunter (für die globale TeamCard)
    const { data: regs } = await supabase
      .from("tournament_registrations")
      .select("*, teams(*, team_rewards(*, custom_rewards(*)))") 
      .order("created_at", { ascending: true });
      
    const { data: assignments } = await supabase.from("group_assignments").select("*");
    
    if (regs) {
      const mappedTeams = regs.map((r: any) => ({
          id: r.team_id,
          registration_id: r.id,
          tournament_id: r.tournament_id,
          status: r.status,
          teamname: r.teams?.teamname,
          teams: r.teams // 🔥 Ganzes Team-Objekt für die TeamCard weiterreichen
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
          // 🔥 Auch hier das komplette Team weiterreichen
          grouped[row.tournament_id][row.group_name].push({ id: row.team_id, teamname: reg.teams.teamname, fullTeam: reg.teams });
        }
      });
      setGroups(grouped);
    }
  };

  const updateTeamStatus = async (registrationId: number, status: "approved" | "waiting") => {
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ status })
      .eq("id", registrationId);
      
    if (error) {
      alert("Fehler beim Ändern des Status: " + error.message);
      return;
    }
    fetchData();
  };

  const addFreilos = async (tournamentId: number) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    const approvedCount = teams.filter(x => x.tournament_id === tournamentId && x.status === "approved").length;
    
    const targetStatus = (tournament?.max_teams && approvedCount >= tournament.max_teams) 
      ? "waiting" : "approved";

    const { data: newTeam, error: teamError } = await supabase.from("teams").insert([{
      teamname: "--- FREILOS ---"
    }]).select().single();
    
    if (teamError) {
      alert("Fehler beim Erstellen des Freilos (Schritt 1): " + teamError.message);
      return;
    }

    const { error: regError } = await supabase.from("tournament_registrations").insert([{
      team_id: newTeam.id,
      tournament_id: tournamentId,
      status: targetStatus
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

  const handleSaveEditModal = async (id: number, updatedData: any) => {
    const newMax = updatedData.maxTeams ? Number(updatedData.maxTeams) : null;
    const { error } = await supabase
      .from("tournaments")
      .update({
        name: updatedData.name,
        max_teams: newMax,
        start_time: updatedData.startTime || null,
        group_count: updatedData.groupCount ? Number(updatedData.groupCount) : null,
        group_size: updatedData.groupSize ? Number(updatedData.groupSize) : null,
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

  const handleSaveDesignModal = async (id: number, updatedData: any) => {
    if (!isFullAdmin) return;
    const { error } = await supabase
      .from("tournaments")
      .update({
        top_places: updatedData.topPlaces,
        bottom_places: updatedData.bottomPlaces,
        color_top: updatedData.colorTop,
        color_middle: updatedData.colorMiddle,
        color_bottom: updatedData.colorBottom,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Fehler beim Speichern des Designs!");
      return;
    }

    setOpenDesignId(null);
    fetchData();
  };

  const duplicateTournament = async (t: any) => {
    const { id, created_at, ...copyData } = t;
    const { error } = await supabase.from("tournaments").insert([{ ...copyData, name: `${t.name} Kopie`, status: "active", archived: false }]);
    if (error) alert(error.message);
    else fetchData();
  };

  const resetTournament = async (tournamentId: number) => {
    if (!isFullAdmin) return; 
    if (!confirm("Turnier wirklich zurücksetzen? ❗ Alle Spiele und Gruppenzuweisungen werden gelöscht! (Tore & Wins aus All-Time Stats werden dank Trigger automatisch wieder abgezogen!)")) return;

    const { error: matchError } = await supabase.from("matches").delete().eq("tournament_id", tournamentId);
    const { error: groupError } = await supabase.from("group_assignments").delete().eq("tournament_id", tournamentId);
    const { error: tourneyError } = await supabase.from("tournaments").update({  started: false, draw_finished: false, ko_status: "pending", ko_teams_count: null}).eq("id", tournamentId);
      
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
    const isDoubleRoundRobin = !!doubleRoundRobin[tournamentId];

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
            let homeTeam = t1;
            let awayTeam = t2;

            if (i === 0) {
              if (round % 2 !== 0) {
                homeTeam = t2;
                awayTeam = t1;
              }
            } 

            const isHomeFreilos = homeTeam.teamname === "--- FREILOS ---";
            const isAwayFreilos = awayTeam.teamname === "--- FREILOS ---";

            // 🔥 HINSPIEL
            inserts.push({
              tournament_id: tournamentId,
              group_name: group,
              team1_id: homeTeam.id,
              team2_id: awayTeam.id,
              match_type: "group",
              round: round + 1,
              status: (isHomeFreilos || isAwayFreilos) ? "confirmed" : "pending",
              score1: isHomeFreilos ? 0 : (isAwayFreilos ? 1 : null),
              score2: isHomeFreilos ? 1 : (isAwayFreilos ? 0 : null),
              reported_by: null,
              confirmed_by: null
            });

            // 🔥 RÜCKSPIEL
            if (isDoubleRoundRobin) {
              inserts.push({
                tournament_id: tournamentId,
                group_name: group,
                team1_id: awayTeam.id, // Umgedreht
                team2_id: homeTeam.id, // Umgedreht
                match_type: "group",
                round: round + 1 + numRounds, 
                status: (isHomeFreilos || isAwayFreilos) ? "confirmed" : "pending",
                score1: isAwayFreilos ? 0 : (isHomeFreilos ? 1 : null), // Umgedreht
                score2: isAwayFreilos ? 1 : (isHomeFreilos ? 0 : null), // Umgedreht
                reported_by: null,
                confirmed_by: null
              });
            }
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

  const getAutoKoSize = (groupCount: number, topPlaces: number) => {
    const targetTeams = (groupCount || 0) * (topPlaces || 2);
    if (targetTeams <= 0) return 8; 
    return Math.pow(2, Math.ceil(Math.log2(targetTeams))); 
  };

  const forwardWinner = async (matchId: number, tournamentId: number, koRound: number) => {
    if (koRound <= 2) return;

    const { data: currentMatches } = await supabase.from("matches").select("*").eq("tournament_id", tournamentId).eq("ko_round", koRound).eq("match_type", "ko").order("id", { ascending: true });
    if (!currentMatches) return;
    
    const matchIndex = currentMatches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return;
    
    const match = currentMatches[matchIndex];
    const winnerId = match.score1 > match.score2 ? match.team1_id : match.team2_id;
    if (!winnerId) return;

    const nextRoundSize = koRound / 2;
    const { data: nextMatches } = await supabase.from("matches").select("*").eq("tournament_id", tournamentId).eq("ko_round", nextRoundSize).eq("match_type", "ko").order("id", { ascending: true });
    
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = nextMatches?.[nextMatchIndex];
    if (!nextMatch) return;

    const isTeam1Slot = matchIndex % 2 === 0;
    const updateData = isTeam1Slot ? { team1_id: winnerId } : { team2_id: winnerId };
    await supabase.from("matches").update(updateData).eq("id", nextMatch.id);

    const { data: updatedNextMatch } = await supabase.from("matches").select("*").eq("id", nextMatch.id).single();
    if (updatedNextMatch?.team1_id && updatedNextMatch?.team2_id) {
      const { data: t1 } = await supabase.from("teams").select("teamname").eq("id", updatedNextMatch.team1_id).single();
      const { data: t2 } = await supabase.from("teams").select("teamname").eq("id", updatedNextMatch.team2_id).single();

      const isT1Freilos = t1?.teamname === "--- FREILOS ---";
      const isT2Freilos = t2?.teamname === "--- FREILOS ---";

      if (isT1Freilos || isT2Freilos) {
        const s1 = isT1Freilos ? 0 : 1;
        const s2 = isT1Freilos ? 1 : 0;
        await supabase.from("matches").update({ status: "confirmed", score1: s1, score2: s2 }).eq("id", updatedNextMatch.id);
        
        await forwardWinner(updatedNextMatch.id, tournamentId, nextRoundSize);
      }
    }
  };

  const generateKoPhase = async (tournamentId: number) => {
    const t = tournaments.find(x => x.id === tournamentId);
    if (!t) return;

    const size = koSizes[tournamentId] || getAutoKoSize(t.group_count, t.top_places); 

    const tMatches = matches.filter(m => m.tournament_id === tournamentId);
    if (tMatches.some(m => m.match_type === "ko")) {
      alert("Es gibt bereits K.O.-Spiele für dieses Turnier!");
      return;
    }

    setIsGeneratingKo(true);

    try {
      const seedList = calculateRankingsForKo(tournamentId);
      const topPlaces = t.top_places || 2; 

      let qualifiedTeams = seedList.filter(team => team.groupRank <= topPlaces);

      if (qualifiedTeams.length < size) {
        const neededSpots = size - qualifiedTeams.length;
        const midTeams = seedList.filter(team => team.groupRank > topPlaces);
        midTeams.sort((a, b) => b.pkt - a.pkt || b.diff - a.diff || b.tore - a.tore);
        qualifiedTeams.push(...midTeams.slice(0, neededSpots));
      }

      const neededDummies = size - qualifiedTeams.length;
      if (neededDummies > 0) {
        const { data: existingDummies } = await supabase
          .from("teams")
          .select("id")
          .eq("teamname", "--- FREILOS ---")
          .limit(neededDummies);

        let dummies = existingDummies || [];

        for (let i = dummies.length; i < neededDummies; i++) {
          const { data: newDummy } = await supabase.from("teams").insert([{ teamname: "--- FREILOS ---" }]).select().single();
          if (newDummy) dummies.push(newDummy);
        }

        dummies.forEach(dummy => {
            qualifiedTeams.push({ id: dummy.id, teamname: "--- FREILOS ---" });
        });
      }

      const roundsMap: any = {};

      roundsMap[size] = [];
      for (let i = 0; i < size / 2; i++) {
          const homeTeam = qualifiedTeams[i];
          const awayTeam = qualifiedTeams[size - 1 - i];

          const isHomeFreilos = homeTeam?.teamname === "--- FREILOS ---";
          const isAwayFreilos = awayTeam?.teamname === "--- FREILOS ---";

          roundsMap[size].push({
              tournament_id: tournamentId,
              team1_id: homeTeam?.id || null,
              team2_id: awayTeam?.id || null,
              match_type: "ko",
              ko_round: size,
              status: (isHomeFreilos || isAwayFreilos) ? "confirmed" : "pending",
              score1: isHomeFreilos ? 0 : (isAwayFreilos ? 1 : null),
              score2: isHomeFreilos ? 1 : (isAwayFreilos ? 0 : null),
              reported_by: null, confirmed_by: null,
              _winnerObj: isHomeFreilos ? awayTeam : (isAwayFreilos ? homeTeam : null)
          });
      }

      let currentRoundSize = size / 2;
      while (currentRoundSize >= 2) {
          roundsMap[currentRoundSize] = [];
          const prevRound = roundsMap[currentRoundSize * 2];

          for (let i = 0; i < currentRoundSize / 2; i++) {
              const match1 = prevRound[i * 2];
              const match2 = prevRound[i * 2 + 1];

              const homeTeam = match1._winnerObj; 
              const awayTeam = match2._winnerObj;

              const isHomeFreilos = homeTeam?.teamname === "--- FREILOS ---";
              const isAwayFreilos = awayTeam?.teamname === "--- FREILOS ---";
              const bothKnown = homeTeam && awayTeam;
              const anyFreilos = isHomeFreilos || isAwayFreilos;

              roundsMap[currentRoundSize].push({
                  tournament_id: tournamentId,
                  team1_id: homeTeam?.id || null,
                  team2_id: awayTeam?.id || null,
                  match_type: "ko",
                  ko_round: currentRoundSize,
                  status: (bothKnown && anyFreilos) ? "confirmed" : "pending",
                  score1: (bothKnown && anyFreilos) ? (isHomeFreilos ? 0 : 1) : null,
                  score2: (bothKnown && anyFreilos) ? (isHomeFreilos ? 1 : 0) : null,
                  reported_by: null, confirmed_by: null,
                  _winnerObj: (bothKnown && anyFreilos) ? (isHomeFreilos ? awayTeam : homeTeam) : null
              });
          }
          currentRoundSize = currentRoundSize / 2;
      }

      const allInserts: any[] = [];
      Object.keys(roundsMap).sort((a: any, b: any) => b - a).forEach(rs => {
          roundsMap[rs].forEach((m: any) => {
              const { _winnerObj, ...dbData } = m;
              allInserts.push(dbData);
          });
      });

      const { error } = await supabase.from("matches").insert(allInserts);
      
      if (error) {
        console.error("Datenbank Fehler bei KO Generierung:", error);
        alert(`Fehler in Supabase: ${error.message}`);
        setIsGeneratingKo(false);
        return;
      }

      await supabase.from("tournaments").update({ ko_status: "active", ko_teams_count: size }).eq("id", tournamentId);

      alert(`K.O.-Phase erfolgreich für ${size} Teams generiert! Alle Runden sind vorbereitet.`);
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

    const m = matches.find(x => x.id === matchId);
    if (m && m.match_type === "ko") {
      await forwardWinner(matchId, m.tournament_id, m.ko_round);
    }

    fetchData();
  };

  const createTournament = async () => {
    if (!newName) return;
    
    const { error } = await supabase.from("tournaments").insert([{
      name: newName,
      cup_type: newCupType,
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
      draw_finished: false,
      season: 0 // 🔥 NEU: Default auf Season 0
    }]);

    if (error) return alert(`Fehler: ${error.message}`);

    setShowPopup(false);
    setNewName("");
    setNewCupType("t_cup");
    setNewStartTime("");
    setNewMaxTeams("");
    setNewGroupCount("");
    setNewGroupSize("");
    fetchData();
  };

  if (loadingAuth) {
    return (
      <div className="h-screen flex items-center justify-center text-white font-medium">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

  const tournamentToEdit = tournaments.find(t => t.id === editingId);
  const tournamentToDesign = tournaments.find(t => t.id === openDesignId);
  
  // Liste der abgelehnten Matches (Konflikte)
  const rejectedMatches = matches.filter(m => m.status === "rejected");

  return (
    <main className="min-h-screen pt-24 pb-12 text-white px-4 md:px-6 max-w-[1600px] mx-auto w-full">
      
      {/* Der Live-Toast für den Admin */}
      {adminMessage && (
        <div className={`fixed top-24 right-4 px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-top-4 border backdrop-blur-md font-bold transition-all ${
          adminMessage.type === "error" ? "bg-red-500/90 border-red-500/50 text-white" : "bg-green-500/90 border-green-500/50 text-white"
        }`}>
          {adminMessage.text}
        </div>
      )}

      {/* Das dauerhafte Konflikt-Dashboard */}
      {rejectedMatches.length > 0 && (
        <div className="mb-10 p-6 bg-red-500/10 border border-red-500/30 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
          <h2 className="text-red-400 font-black text-xl md:text-2xl mb-4 flex items-center gap-3 relative z-10">
            <span className="animate-pulse text-2xl">🚨</span> Konflikte / Abgelehnte Ergebnisse
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
            {rejectedMatches.map(m => {
              const t1 = teams.find(t => t.id === m.team1_id)?.teamname || "Team 1";
              const t2 = teams.find(t => t.id === m.team2_id)?.teamname || "Team 2";
              const tourney = tournaments.find(t => t.id === m.tournament_id)?.name || "Turnier";
              
              let matchInfo = "";
              if (m.match_type === "ko") {
                const roundName = m.ko_round === 64 ? "1/32-Finale" : m.ko_round === 32 ? "Sechzehntelfinale" : m.ko_round === 16 ? "Achtelfinale" : m.ko_round === 8 ? "Viertelfinale" : m.ko_round === 4 ? "Halbfinale" : m.ko_round === 2 ? "Finale" : "K.O.-Phase";
                matchInfo = `🏆 ${roundName}`;
              } else {
                matchInfo = `⚽ Gruppe ${m.group_name || "?"}`;
              }
              
              return (
                <div key={m.id} className="flex flex-col sm:flex-row justify-between sm:items-center bg-black/40 p-4 rounded-xl border border-red-500/20 gap-3">
                  <div>
                    <div className="text-[10px] text-red-400/80 uppercase tracking-widest font-bold mb-1 flex items-center">
                      {tourney} <span className="mx-2 opacity-40">•</span> <span className="text-red-300">{matchInfo}</span>
                    </div>
                    <div className="font-bold text-white text-sm md:text-base">{t1} <span className="text-gray-500 mx-2">vs</span> {t2}</div>
                  </div>
                  <div className="text-xs bg-red-600/20 text-red-400 px-3 py-1.5 rounded-lg font-bold border border-red-500/30 text-center uppercase tracking-wider">
                    Wartet auf Klärung
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={() => setShowPopup(true)} className="w-full md:w-auto bg-green-600 px-6 py-3 md:py-2 rounded-xl font-bold mb-8 md:mb-10 hover:bg-green-500 transition shadow-lg shadow-green-900/20">
        + Neues Turnier
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {tournaments.filter(t => !t.archived).map((t) => {
          const tournamentGroups = groups[t.id];
          const approvedTeams = teams.filter(x => x.tournament_id === t.id && x.status === "approved");
          const waitingTeams = teams.filter(x => x.tournament_id === t.id && x.status === "waiting");
          
          const tournamentMatches = matches.filter(m => m.tournament_id === t.id && m.match_type !== "ko");
          const roundNumbers = Array.from(new Set(tournamentMatches.map(m => m.round || 1))).sort((a, b) => a - b);
          
          const allGroupMatchesConfirmed = tournamentMatches.length > 0 && tournamentMatches.every(m => m.status === "confirmed");
          const koMatches = matches.filter(m => m.tournament_id === t.id && m.match_type === "ko");

          const currentTab = activeTabs[t.id] || "teams";

          return (
            <div key={t.id} className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-5 md:p-8 shadow-2xl flex flex-col relative">
              
              {/* --- HEADER --- */}
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-white/5 pb-4 xl:border-none xl:pb-0">
                <div className="w-full xl:w-auto">
                  <h3 className="text-xl md:text-2xl font-bold break-words">{t.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => setEditingId(t.id)} className="text-[10px] md:text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 uppercase font-bold hover:bg-blue-500/20 transition">✏️ Edit</button>
                    
                    {isFullAdmin && (
                      <button onClick={() => setOpenDesignId(t.id)} className="text-[10px] md:text-xs px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20 uppercase font-bold hover:bg-purple-500/20 transition">🎨 Design</button>
                    )}
                    
                    <button onClick={() => duplicateTournament(t)} className="text-[10px] md:text-xs px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 uppercase font-bold hover:bg-white/10 transition">📄 Copy</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-start xl:justify-end">
                  
                  {isFullAdmin && (
                    <button onClick={() => resetTournament(t.id)} className="flex-1 xl:flex-none bg-red-600/10 text-red-500 px-3 py-2 rounded-lg text-xs font-bold border border-red-500/20 hover:bg-red-600 hover:text-white transition text-center">🔄 Neustart</button>
                  )}
                  
                  <button onClick={() => finishTournament(t.id)} className="flex-1 xl:flex-none bg-red-500/10 text-red-500 px-3 py-2 rounded-lg text-xs font-bold border border-red-500/20 hover:bg-red-600 hover:text-white transition text-center">🛑 Beenden</button>
                </div>
              </div>

              {/* TAB NAVIGATION */}
              <div className="flex gap-2 border-b border-white/10 mb-6 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTabs({ ...activeTabs, [t.id]: "teams" })} className={`pb-3 px-2 md:px-4 text-xs md:text-sm whitespace-nowrap uppercase tracking-wider font-bold transition-colors ${currentTab === 'teams' ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}>👥 Teams</button>
                <button onClick={() => setActiveTabs({ ...activeTabs, [t.id]: "gruppen" })} className={`pb-3 px-2 md:px-4 text-xs md:text-sm whitespace-nowrap uppercase tracking-wider font-bold transition-colors ${currentTab === 'gruppen' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300'}`}>⚽ Gruppen</button>
                
                {t.cup_type !== 't_cup' && (
                  <button onClick={() => setActiveTabs({ ...activeTabs, [t.id]: "ko" })} className={`pb-3 px-2 md:px-4 text-xs md:text-sm whitespace-nowrap uppercase tracking-wider font-bold transition-colors ${currentTab === 'ko' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}>🏆 K.O.-Phase</button>
                )}
              </div>

              {/* --- TAB 1: TEAMS --- */}
              {currentTab === "teams" && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  <div className="mb-4 flex flex-wrap gap-3 text-[10px] md:text-xs uppercase tracking-widest text-gray-400 font-bold">
                    <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded">Bestätigt: {approvedTeams.length} / {t.max_teams || "∞"}</span>
                    {waitingTeams.length > 0 && <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Warteliste: {waitingTeams.length}</span>}
                  </div>

                  <div className="mb-4">
                    <div className="max-h-64 overflow-y-auto pr-1 space-y-1">
                      {teams.filter(team => team.tournament_id === t.id).map(team => (
                        <div key={team.registration_id || team.id} className="flex justify-between items-center text-xs md:text-sm bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                          <span className={`truncate max-w-[150px] sm:max-w-[200px] font-medium ${team.status === 'waiting' ? 'text-yellow-500/80' : 'text-white'}`}>
                            {team.teamname}
                          </span>
                          <div className="flex gap-4">
                            <button onClick={() => updateTeamStatus(team.registration_id, "approved")} className={`${team.status === 'approved' ? 'text-green-500 scale-110' : 'text-gray-500'} hover:scale-125 transition-transform text-base`}>✔</button>
                            <button onClick={() => updateTeamStatus(team.registration_id, "waiting")} className={`${team.status === 'waiting' ? 'text-yellow-500 scale-110' : 'text-gray-500'} hover:scale-125 transition-transform text-base`}>⏳</button>
                          </div>
                        </div>
                      ))}
                      {teams.filter(team => team.tournament_id === t.id).length === 0 && (
                        <div className="text-xs text-gray-500 text-center py-4 italic">Noch keine Teams angemeldet.</div>
                      )}
                    </div>
                    
                    <button onClick={() => addFreilos(t.id)} className="w-full mt-3 border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-white py-2 rounded-xl text-xs font-bold transition">
                      + Dummy-Team (--- FREILOS ---) hinzufügen
                    </button>
                  </div>
                </div>
              )}

              {/* --- TAB 2: GRUPPENPHASE --- */}
              {currentTab === "gruppen" && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  {!tournamentGroups ? (
                    <p className="text-yellow-500 text-sm p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/20 mb-2 font-bold text-center">⚠️ Warte auf Auslosung auf Draw-Seite...</p>
                  ) : (
                    <div className="mb-8 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(tournamentGroups).map(([group, teams]: any) => (
                          <div key={group} className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-green-400 font-bold text-xs mb-2 text-center uppercase tracking-wider">Gruppe {group}</p>
                            {teams.map((team: any, i: number) => (
                              <div key={team.id} className="py-1.5 border-t border-white/5 flex gap-2">
                                <span className="text-gray-500 w-4 text-right text-xs mt-1.5">{i + 1}.</span> 
                                {/* 🔥 TEAMCARD in den Admin Gruppen! */}
                                <div className="flex-1 overflow-hidden">
                                  <TeamCard team={team.fullTeam} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                      
                      {/* 🔥 NEU: Schalter für Hin- und Rückspiel */}
                      <div className="flex flex-col gap-2 mt-4">
                        <label className="flex items-center justify-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition bg-black/20 py-3 rounded-xl border border-white/5">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 accent-green-500"
                            checked={!!doubleRoundRobin[t.id]} 
                            onChange={(e) => setDoubleRoundRobin({...doubleRoundRobin, [t.id]: e.target.checked})} 
                          />
                          <span className="font-bold">Mit Hin- und Rückspiel generieren</span>
                        </label>
                        <button onClick={() => generateMatches(t.id)} className="w-full bg-green-600/20 border border-green-500/30 text-green-400 py-3 md:py-4 rounded-xl font-bold text-sm md:text-base hover:bg-green-600 hover:text-white transition shadow-lg">⚽ Spielplan generieren</button>
                      </div>
                    </div>
                  )}

                  {/* GRUPPENPHASE SPIELE ANZEIGEN */}
                  {tournamentMatches.length > 0 && (
                    <div className="mt-8 border-t border-white/10 pt-6">
                      <div className="space-y-4">
                        {roundNumbers.map(roundNum => {
                          const isExpanded = expandedRounds[`${t.id}-${roundNum}`];
                          const roundMatches = tournamentMatches.filter(m => (m.round || 1) === roundNum);
                          const groupsInRound = Array.from(new Set(roundMatches.map(m => m.group_name))).sort();

                          return (
                            <div key={roundNum} className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 transition-all">
                              <button onClick={() => setExpandedRounds((p: any) => ({...p, [`${t.id}-${roundNum}`]: !isExpanded}))} className="w-full p-4 flex justify-between items-center hover:bg-white/10 transition text-sm">
                                <span className="font-bold text-green-400 uppercase tracking-widest">Spieltag {roundNum}</span>
                                <span className="text-[10px] text-gray-400 font-bold bg-black/40 px-3 py-1 rounded-full">{isExpanded ? "SCHLIESSEN ▲" : "ÖFFNEN ▼"}</span>
                              </button>
                              
                              {isExpanded && (
                                <div className="p-2 sm:p-4 space-y-6 bg-black/20 border-t border-white/5">
                                  {groupsInRound.map(groupName => (
                                    <div key={groupName}>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-2 ml-2 tracking-wider">Gruppe {groupName}</p>
                                      <div className="flex flex-col gap-2">
                                        {roundMatches.filter(m => m.group_name === groupName).map(m => {
                                          const t1Info = teams.find(x => x.id === m.team1_id);
                                          const t2Info = teams.find(x => x.id === m.team2_id);

                                          return (
                                            <div key={m.id} className="flex flex-col md:flex-row items-center justify-between bg-black/40 p-2 md:p-3 rounded-xl border border-white/5 gap-2 md:gap-0">
                                              
                                              {/* TEAM 1 */}
                                              <div className="flex-1 w-full md:w-auto">
                                                <TeamCard team={t1Info?.teams} />
                                              </div>
                                              
                                              {/* ERGEBNIS */}
                                              <div className="shrink-0 flex items-center justify-center gap-1 md:gap-2 px-2">
                                                <input
                                                  type="tel"
                                                  value={scoreInputs[m.id]?.s1 ?? m.score1 ?? ""}
                                                  onChange={(e) => handleScoreChange(m.id, "s1", e.target.value)}
                                                  className="w-10 h-8 md:w-12 md:h-10 bg-white/10 rounded-lg text-center border border-white/10 outline-none focus:border-green-500 focus:bg-white/20 transition text-sm md:text-base font-bold"
                                                />
                                                <span className="font-bold text-gray-500">:</span>
                                                <input
                                                  type="tel"
                                                  value={scoreInputs[m.id]?.s2 ?? m.score2 ?? ""}
                                                  onChange={(e) => handleScoreChange(m.id, "s2", e.target.value)}
                                                  className="w-10 h-8 md:w-12 md:h-10 bg-white/10 rounded-lg text-center border border-white/10 outline-none focus:border-green-500 focus:bg-white/20 transition text-sm md:text-base font-bold"
                                                />
                                                <button onClick={() => saveSingleMatch(m.id)} className="ml-1 md:ml-2 bg-green-600/80 hover:bg-green-500 text-white text-xs px-2.5 py-1.5 md:py-2 rounded-lg transition shadow-sm font-bold">✔</button>
                                              </div>
                                              
                                              {/* TEAM 2 */}
                                              <div className="flex-1 w-full md:w-auto">
                                                <TeamCard team={t2Info?.teams} reverseOnMobile />
                                              </div>

                                            </div>
                                          );
                                        })}
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
                </div>
              )}

              {/* --- TAB 3: K.O. PHASE --- */}
              {currentTab === "ko" && t.cup_type !== 't_cup' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  {!t.started ? (
                     <p className="text-gray-500 text-sm text-center italic py-4">Turnier muss zuerst gestartet werden.</p>
                  ) : (
                    <div>
                      {!allGroupMatchesConfirmed ? (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-6">
                          <p className="text-yellow-400 font-bold text-sm">⚠️ Die K.O.-Phase kann erst ausgelost werden, wenn ALLE Gruppenspiele beendet und bestätigt sind.</p>
                        </div>
                      ) : koMatches.length > 0 ? (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-6 flex justify-between items-center">
                          <p className="text-yellow-400 font-bold text-sm">K.O.-Phase ist aktiv.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-4 bg-black/20 p-4 rounded-xl border border-white/5 mb-6">
                          <select className="bg-black/50 border border-white/10 text-white p-3 rounded-lg font-bold outline-none focus:border-yellow-400 w-full sm:w-auto" value={koSizes[t.id] || getAutoKoSize(t.group_count, t.top_places)} onChange={(e) => setKoSizes({ ...koSizes, [t.id]: Number(e.target.value) })}>
                            <option value={64}>1/32-Finale (64 Teams)</option>
                            <option value={32}>Sechzehntelfinale (32 Teams)</option>
                            <option value={16}>Achtelfinale (16 Teams)</option>
                            <option value={8}>Viertelfinale (8 Teams)</option>
                            <option value={4}>Halbfinale (4 Teams)</option>
                            <option value={2}>Finale (2 Teams)</option>
                          </select>
                          <button onClick={() => generateKoPhase(t.id)} disabled={isGeneratingKo} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black py-3 rounded-xl font-bold transition shadow-lg disabled:opacity-50">
                            {isGeneratingKo ? "Generiere..." : "K.O.-Phase auslosen"}
                          </button>
                        </div>
                      )}

                      {/* K.O. SPIELE ANZEIGEN */}
                      {koMatches.length > 0 && (
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
                                    <div className="flex flex-col gap-2">
                                      {matchesInRound.map(m => {
                                        const t1Info = teams.find(x => x.id === m.team1_id);
                                        const t2Info = teams.find(x => x.id === m.team2_id);

                                        return (
                                          <div key={m.id} className="flex flex-col md:flex-row items-center justify-between bg-black/40 p-2 md:p-3 rounded-xl border border-yellow-500/20 gap-2 md:gap-0">
                                            
                                            {/* TEAM 1 */}
                                            <div className="flex-1 w-full md:w-auto">
                                              <TeamCard team={t1Info?.teams} />
                                            </div>
                                            
                                            {/* ERGEBNIS */}
                                            <div className="shrink-0 flex items-center justify-center gap-1 md:gap-2 px-2">
                                              <input
                                                type="tel"
                                                value={scoreInputs[m.id]?.s1 ?? m.score1 ?? ""}
                                                onChange={(e) => handleScoreChange(m.id, "s1", e.target.value)}
                                                className="w-10 h-8 md:w-12 md:h-10 bg-white/10 rounded-lg text-center border border-yellow-500/30 outline-none focus:border-yellow-400 focus:bg-white/20 transition text-sm md:text-base font-bold text-yellow-300"
                                              />
                                              <span className="font-bold text-gray-500">:</span>
                                              <input
                                                type="tel"
                                                value={scoreInputs[m.id]?.s2 ?? m.score2 ?? ""}
                                                onChange={(e) => handleScoreChange(m.id, "s2", e.target.value)}
                                                className="w-10 h-8 md:w-12 md:h-10 bg-white/10 rounded-lg text-center border border-yellow-500/30 outline-none focus:border-yellow-400 focus:bg-white/20 transition text-sm md:text-base font-bold text-yellow-300"
                                              />
                                              <button onClick={() => saveSingleMatch(m.id)} className="ml-1 md:ml-2 bg-yellow-600 hover:bg-yellow-500 text-black text-xs px-2.5 py-1.5 md:py-2 rounded-lg transition shadow-sm font-bold">✔</button>
                                            </div>
                                            
                                            {/* TEAM 2 */}
                                            <div className="flex-1 w-full md:w-auto">
                                              <TeamCard team={t2Info?.teams} reverseOnMobile />
                                            </div>

                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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

      {/* ERSTELLEN MODAL */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#111] p-6 md:p-8 rounded-3xl border border-white/10 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-center text-white tracking-wide">Neues Turnier</h2>
            
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl mb-4 outline-none focus:border-green-500 transition text-sm" placeholder="Turniername" />
            
            <select
              value={newCupType}
              onChange={(e) => setNewCupType(e.target.value)}
              className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl mb-4 outline-none focus:border-green-500 transition text-sm text-white appearance-none"
            >
              <option value="t_cup" className="bg-[#111]">T-Cup</option>
              <option value="night_cup" className="bg-[#111]">Night Cup</option>
              <option value="cup_21er" className="bg-[#111]">21er Cup</option>
            </select>

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

      {/* AUSGELAGERTE MODALS */}
      {tournamentToEdit && (
        <EditModal 
          tournament={tournamentToEdit} 
          onSave={handleSaveEditModal} 
          onClose={() => setEditingId(null)} 
        />
      )}

      {tournamentToDesign && (
        <DesignModal 
          tournament={tournamentToDesign} 
          onSave={handleSaveDesignModal} 
          onClose={() => setOpenDesignId(null)} 
        />
      )}

    </main>
  );
}

// ==========================================
// AUSGELAGERTE KOMPONENTEN
// ==========================================

function EditModal({ tournament, onSave, onClose }: any) {
  const [name, setName] = useState(tournament.name || "");
  const [maxTeams, setMaxTeams] = useState(tournament.max_teams || "");
  const [startTime, setStartTime] = useState(tournament.start_time || "");
  const [groupCount, setGroupCount] = useState(tournament.group_count || "");
  const [groupSize, setGroupSize] = useState(tournament.group_size || "");

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-[#111] p-6 md:p-8 rounded-3xl border border-blue-500/30 w-full max-w-sm shadow-2xl">
        <h4 className="text-sm uppercase tracking-widest text-blue-400 font-bold mb-6 text-center">Turnier bearbeiten</h4>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold">Turniername</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-black/40 rounded-xl border border-white/10 text-sm focus:border-blue-500 outline-none transition mt-1" placeholder="Name" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold">Max. Teilnehmer (Teams)</label>
            <input type="number" value={maxTeams} onChange={(e) => setMaxTeams(e.target.value)} className="w-full p-3 bg-black/40 rounded-xl border border-white/10 text-sm focus:border-blue-500 outline-none transition mt-1" placeholder="z.B. 16" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold">Startzeitpunkt</label>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-3 bg-black/40 rounded-xl border border-white/10 text-sm focus:border-blue-500 outline-none transition mt-1" />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold">Anzahl Gruppen</label>
              <input type="number" placeholder="z.B. 2" value={groupCount} onChange={(e) => setGroupCount(e.target.value)} className="w-full p-3 bg-black/40 rounded-xl border border-white/10 text-sm focus:border-blue-500 outline-none transition mt-1" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold">Teams pro Gruppe</label>
              <input type="number" placeholder="z.B. 4" value={groupSize} onChange={(e) => setGroupSize(e.target.value)} className="w-full p-3 bg-black/40 rounded-xl border border-white/10 text-sm focus:border-blue-500 outline-none transition mt-1" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={() => onSave(tournament.id, { name, maxTeams, startTime, groupCount, groupSize })} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition shadow-lg">Speichern</button>
          <button onClick={onClose} className="flex-1 bg-white/10 py-3 rounded-xl font-bold text-sm hover:bg-white/20 transition">Abbrechen</button>
        </div>
      </div>
    </div>
  );
}

function DesignModal({ tournament, onSave, onClose }: any) {
  const [topPlaces, setTopPlaces] = useState(tournament.top_places || 2);
  const [bottomPlaces, setBottomPlaces] = useState(tournament.bottom_places || 1);
  const [colorTop, setColorTop] = useState(tournament.color_top || "#22c55e");
  const [colorMiddle, setColorMiddle] = useState(tournament.color_middle || "#f97316");
  const [colorBottom, setColorBottom] = useState(tournament.color_bottom || "#ef4444");

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-[#111] p-6 md:p-8 rounded-3xl border border-purple-500/30 w-full max-w-sm shadow-2xl">
        <h4 className="text-sm uppercase tracking-widest text-purple-400 font-bold mb-6 text-center">Design anpassen</h4>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex-1 min-w-[100px]">
              <p className="mb-2 uppercase font-bold text-gray-400">Top Plätze</p>
              <input type="number" value={topPlaces} onChange={(e) => setTopPlaces(Number(e.target.value))} className="w-full bg-black/40 rounded-xl border border-white/10 p-3 outline-none focus:border-purple-500 transition" />
            </div>
            <div className="flex-1 min-w-[100px]">
              <p className="mb-2 uppercase font-bold text-gray-400">Bottom Plätze</p>
              <input type="number" value={bottomPlaces} onChange={(e) => setBottomPlaces(Number(e.target.value))} className="w-full bg-black/40 rounded-xl border border-white/10 p-3 outline-none focus:border-purple-500 transition" />
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs uppercase font-bold text-gray-400">Farben (Top / Mid / Bot)</p>
            <div className="flex justify-between gap-4 bg-black/40 p-4 rounded-xl border border-white/10">
              <input type="color" value={colorTop} onChange={(e) => setColorTop(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-none bg-transparent" />
              <input type="color" value={colorMiddle} onChange={(e) => setColorMiddle(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-none bg-transparent" />
              <input type="color" value={colorBottom} onChange={(e) => setColorBottom(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-none bg-transparent" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={() => onSave(tournament.id, { topPlaces, bottomPlaces, colorTop, colorMiddle, colorBottom })} className="flex-1 bg-purple-600 py-3 rounded-xl font-bold text-sm hover:bg-purple-500 transition shadow-lg">Speichern</button>
          <button onClick={onClose} className="flex-1 bg-white/10 py-3 rounded-xl font-bold text-sm hover:bg-white/20 transition">Abbrechen</button>
        </div>
      </div>
    </div>
  );
}