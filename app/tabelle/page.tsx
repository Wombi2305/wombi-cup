"use client";

import { useEffect, useState, Fragment, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// 🔥 Unseren neuen Hook importieren
import { useAuth } from "@/components/AuthProvider";

export default function TurnierTabelle() {
  const router = useRouter();

  // 🔥 BAM! User direkt und synchron abrufen
  const { user } = useAuth();

  // --- STATES ---
  const [loadingData, setLoadingData] = useState(true);
  const [isReady, setIsReady] = useState(false);
  
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "finished">("active");

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);

  const [groups, setGroups] = useState<any>({});
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  
  const [activeGroup, setActiveGroup] = useState<string>("ALL");
  const [tournamentStats, setTournamentStats] = useState<any>({});
  const [scores, setScores] = useState<any>({});

  const currentTournamentData = tournaments.find((t) => t.id === selectedTournament) || {};
  const tournamentStyle = {
    top_places: currentTournamentData.top_places || 2,
    bottom_places: currentTournamentData.bottom_places || 1,
    color_top: currentTournamentData.color_top || "#22c55e",
    color_bottom: currentTournamentData.color_bottom || "#ef4444",
    color_middle: currentTournamentData.color_middle || "#f97316",
  };

  const teamMap = useMemo(() => {
    const map: any = {};
    teams.forEach((t) => { map[t.id] = t.teamname; });
    return map;
  }, [teams]);

  // Eigene Spiele für den Button und das Modal filtern
  const userMatches = useMemo(() => {
    if (!user) return [];
    return matches.filter(m => 
      m.match_type !== "ko" && 
      (teams.find(t => t.id === m.team1_id)?.user_id === user?.id || 
       teams.find(t => t.id === m.team2_id)?.user_id === user?.id)
    );
  }, [matches, teams, user]);

  // Finde das aktuellste Spieltag-Match für den Button
  const activeUserMatch = useMemo(() => {
    if (userMatches.length === 0) return null;
    const unconfirmed = userMatches.find(m => m.status !== "confirmed");
    return unconfirmed || userMatches[userMatches.length - 1];
  }, [userMatches]);

  const matchesByGroup = useMemo(() => {
    const map: any = {};
    matches.forEach((m) => {
      if (m.match_type === "ko") return; 
      if (!map[m.group_name]) map[m.group_name] = [];
      map[m.group_name].push(m);
    });
    return map;
  }, [matches]);

  const calculateTable = (groupTeams: any[], groupMatches: any[]) => {
    const table: any = {};
    groupTeams.forEach((team) => {
      table[team.id] = { id: team.id, name: team.teamname, sp: 0, g: 0, u: 0, v: 0, tore: 0, gegentore: 0, pkt: 0 };
    });

    groupMatches.forEach((m) => {
      if (m.status !== "confirmed" || m.score1 == null || m.score2 == null) return;
      const t1 = table[m.team1_id];
      const t2 = table[m.team2_id];
      if (!t1 || !t2) return;

      t1.sp++; t2.sp++;
      t1.tore += m.score1; t1.gegentore += m.score2;
      t2.tore += m.score2; t2.gegentore += m.score1;

      if (m.score1 > m.score2) { t1.g++; t2.v++; t1.pkt += 3; }
      else if (m.score1 < m.score2) { t2.g++; t1.v++; t2.pkt += 3; }
      else { t1.u++; t2.u++; t1.pkt++; t2.pkt++; }
    });

    return Object.values(table)
      .map((t: any) => ({ ...t, diff: t.tore - t.gegentore }))
      .sort((a: any, b: any) => b.pkt - a.pkt || b.diff - a.diff || b.tore - a.tore);
  };

  const currentTables = useMemo(() => {
    if (!groups || Object.keys(groups).length === 0) return {};
    const newTables: any = {};
    Object.entries(groups).forEach(([groupName, groupTeams]: any) => {
      newTables[groupName] = calculateTable(groupTeams, matchesByGroup[groupName] || []);
    });
    return newTables;
  }, [groups, matchesByGroup]);

  const groupedMatchesByGroupAndRound = useMemo(() => {
    const result: any = {};
    Object.keys(groups).forEach((groupName) => {
      const groupMatches = [...(matchesByGroup[groupName] || [])].sort((a, b) => a.round - b.round);
      const grouped: any = {};
      groupMatches.forEach((m: any) => {
        if (!grouped[m.round]) grouped[m.round] = [];
        grouped[m.round].push(m);
      });
      result[groupName] = grouped;
    });
    return result;
  }, [matchesByGroup, groups]);

  // 🔥 Der alte useEffect für supabase.auth.getUser() wurde komplett gelöscht!

  useEffect(() => {
    setIsReady(false);
    fetchTournaments();
  }, [viewMode]);

  useEffect(() => {
    if (!selectedTournament) return;
    fetchData();
    const channel = supabase.channel("realtime-tabelle")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTournament, user]); // user kann hier als Dependency bleiben

  const fetchTournaments = async () => {
    setLoadingData(true);
    const { data } = await supabase.from("tournaments").select("*").eq("status", viewMode);
    if (!data || data.length === 0) { setIsReady(true); setLoadingData(false); return; }
    
    const sorted = [...data].sort((a, b) => {
      if (a.draw_finished && !b.draw_finished) return -1;
      if (!a.draw_finished && b.draw_finished) return 1;
      return 0;
    });
    setTournaments(sorted);
    const withGroups = sorted.find(t => t.draw_finished === true);
    setSelectedTournament(withGroups ? withGroups.id : sorted[0].id);
    setLoadingData(false);
  };

  const fetchData = async (isBackground = false) => {
    if (!isBackground && !isReady) setLoadingData(true);
    
    const { data: regData } = await supabase
      .from("tournament_registrations")
      .select("teams(*)")
      .eq("tournament_id", selectedTournament)
      .eq("status", "approved"); 
      
    const { data: m } = await supabase.from("matches").select("*").eq("tournament_id", selectedTournament);
    const { data: g } = await supabase.from("group_assignments").select("*").eq("tournament_id", selectedTournament);
    
    let extractedTeams: any[] = [];
    if (regData) {
      extractedTeams = regData.map((r: any) => r.teams).filter(Boolean);
      setTeams(extractedTeams);
    }
    
    if (m) setMatches(m);
    
    if (g && extractedTeams.length > 0) {
      const grouped: any = {};
      g.forEach((row) => {
        if (!grouped[row.group_name]) grouped[row.group_name] = [];
        const team = extractedTeams.find((team) => team.id === row.team_id);
        if (team) grouped[row.group_name].push(team);
      });
      setGroups(grouped);
    } else {
      setGroups({});
    }
    
    setIsReady(true);
    setLoadingData(false);
  };

  const getTeamName = (id: number) => teamMap[id] || "Team";

  const updateScoreInput = (matchId: number, key: string, value: string) => {
    setScores((prev: any) => ({ ...prev, [matchId]: { ...(prev[matchId] || {}), [key]: value.replace(/[^0-9]/g, "") } }));
  };

  const handleReport = async (matchId: number, s1: number, s2: number) => {
    // 🔥 Hier nutzen wir den User aus dem neuen Hook
    await supabase.from("matches").update({ score1: s1, score2: s2, status: "reported", reported_by: user?.id }).eq("id", matchId);
    fetchData(true);
  };

  const handleConfirm = async (matchId: number) => {
    // 🔥 Hier nutzen wir den User aus dem neuen Hook
    await supabase.from("matches").update({ status: "confirmed", confirmed_by: user?.id }).eq("id", matchId);
    fetchData(true);
  };

  const handleReject = async (matchId: number) => {
    await supabase.from("matches").update({ score1: null, score2: null, status: "rejected", reported_by: null }).eq("id", matchId);
    fetchData(true);
  };

  const modalMatches = userMatches.filter(m => m.round === activeRound);

  return (
    <main className="px-4 md:px-6 pt-6 pb-12 text-white font-sans w-full max-w-7xl mx-auto">
      <div className="flex gap-3 mb-4">
        <button onClick={() => setViewMode("active")} className={viewMode === "active" ? "bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm" : "border border-white/10 px-4 py-2 rounded-lg text-sm transition hover:bg-white/5"}>🟢 Aktuell</button>
        <button onClick={() => setViewMode("finished")} className={viewMode === "finished" ? "bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm" : "border border-white/10 px-4 py-2 rounded-lg text-sm transition hover:bg-white/5"}>📦 Archiv</button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {tournaments.map((t) => (
            <div key={t.id} onClick={() => setSelectedTournament(t.id)} className={`cursor-pointer p-2 rounded-xl border transition ${selectedTournament === t.id ? "bg-yellow-500 text-black border-yellow-400 scale-105 shadow-lg" : "border-yellow-500/30 hover:bg-white/5"}`}>
              <div className="font-bold uppercase text-sm truncate px-1 max-w-[150px] md:max-w-xs">{t.name}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {activeUserMatch && (
            <button 
              onClick={() => setActiveRound(activeUserMatch.round)} 
              className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:scale-105 transition-transform"
            >
              Spieltag {activeUserMatch.round} eintragen
            </button>
          )}
          <button onClick={() => setActiveGroup("ALL")} className={activeGroup === "ALL" ? "bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-md" : "border border-white/10 px-4 py-2 rounded-lg text-sm transition hover:bg-white/5"}>Alle Gruppen</button>
          {Object.keys(groups).map((g) => (
            <button key={g} onClick={() => setActiveGroup(g)} className={activeGroup === g ? "bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-md" : "border border-white/10 px-4 py-2 rounded-lg text-sm transition hover:bg-white/5"}>Gruppe {g}</button>
          ))}
        </div>
      </div>

      {loadingData ? (
        <div className="text-white/60 text-center mt-20">⏳ Lade...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.keys(groups).filter((g) => activeGroup === "ALL" || g === activeGroup).map((groupName) => {
            const table = currentTables[groupName] || [];
            return (
              <Fragment key={groupName}>
                <div className="border border-yellow-500/30 rounded-xl p-4 shadow-xl backdrop-blur-sm bg-black/40 min-h-[400px] overflow-hidden">
                  <div className="mb-3 border-b border-yellow-500/30 pb-2">
                    <span className="text-yellow-400 font-bold uppercase tracking-widest text-sm italic">Gruppe {groupName}</span>
                  </div>
                  <div className="w-full overflow-x-auto pb-2">
                    <div className="min-w-[340px]">
                      <div className="grid grid-cols-9 text-[10px] md:text-xs uppercase text-gray-400 mb-2 px-1 text-center font-bold italic">
                        <span>#</span>
                        <span>Pkt</span>
                        <span className="text-left col-span-2">Team</span>
                        <span>Sp</span>
                        <span>G</span>
                        <span>U</span>
                        <span>V</span>
                        <span className="text-yellow-400">TG</span>
                      </div>
                      {table.map((team: any, i: number) => {
                        const isTop = i < tournamentStyle.top_places;
                        const isBottom = i >= table.length - tournamentStyle.bottom_places;
                        return (
                          <div 
                            key={team.id} 
                            style={{ 
                              background: isTop ? tournamentStyle.color_top + "20" : isBottom ? tournamentStyle.color_bottom + "20" : tournamentStyle.color_middle + "20", 
                              borderLeft: `4px solid ${isTop ? tournamentStyle.color_top : isBottom ? tournamentStyle.color_bottom : tournamentStyle.color_middle}` 
                            }} 
                            className="grid grid-cols-9 text-xs md:text-sm py-2.5 border-b border-white/5 items-center text-center transition-colors hover:bg-white/5"
                          >
                            <span className={`font-black tracking-tight ${i === 0 ? "text-yellow-300 scale-110 text-lg md:text-xl" : "text-yellow-400 text-base md:text-xl"}`}>{i + 1}</span>
                            <span className="text-white/90 font-bold text-sm">{team.pkt}</span>
                            <span className="text-left truncate pr-2 font-medium col-span-2">{team.name}</span>
                            <span>{team.sp}</span>
                            <span className="text-green-400 font-bold">{team.g}</span>
                            <span>{team.u}</span>
                            <span>{team.v}</span>
                            <span className="font-bold text-yellow-400 text-sm">{team.tore}:{team.gegentore}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {activeGroup !== "ALL" && (
                  <div className="border border-yellow-500/30 rounded-xl p-4 shadow-xl backdrop-blur-sm bg-black/40 flex flex-col min-h-[400px]">
                    <div className="mb-4 border-b border-yellow-500/30 pb-2">
                      <span className="text-yellow-400 font-bold uppercase tracking-widest text-sm italic">Spielplan Gruppe {groupName}</span>
                    </div>
                    <div className="flex-1">
                      {Object.entries(groupedMatchesByGroupAndRound[groupName] || {}).map(([round, games]: any) => (
                        <div key={round} className="mb-5">
                          <div className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Spieltag {round}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                            {games.map((m: any) => (
                              <div key={m.id} className="flex justify-between items-center text-xs bg-white/5 hover:bg-white/10 transition px-3 py-2 rounded-lg border border-white/5">
                                <span className="w-2/5 text-left truncate text-xs md:text-[11px] font-medium">{getTeamName(m.team1_id)}</span>
                                <span className="w-1/5 text-center text-yellow-400 font-bold bg-black/40 py-1 rounded whitespace-nowrap">
                                  {m.score1 != null ? `${m.score1} : ${m.score2}` : "- : -"}
                                </span>
                                <span className="w-2/5 text-right truncate text-xs md:text-[11px] font-medium">{getTeamName(m.team2_id)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 text-center">
                      <button onClick={() => router.push(`/kophase?tournamentId=${selectedTournament}`)} className="w-full md:w-auto bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold px-6 py-3 rounded-lg shadow-lg hover:scale-105 transition-transform">➜ Zur K.O.-Phase</button>
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      {/* --- MODAL --- */}
      {activeRound && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] p-6 rounded-3xl w-full max-w-2xl border border-white/5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-bold text-xl">Spieltag {activeRound} verwalten</h2>
              <button onClick={() => setActiveRound(null)} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition">✕</button>
            </div>

            <div className="space-y-4">
              {modalMatches.map((m) => {
                const myTeamId = teams.find((t) => t.user_id === user?.id)?.id;
                const isHome = m.team1_id === myTeamId;
                const isAway = m.team2_id === myTeamId;
                const s1 = scores[m.id]?.s1 ?? (m.score1 !== null ? String(m.score1) : "");
                const s2 = scores[m.id]?.s2 ?? (m.score2 !== null ? String(m.score2) : "");

                return (
                  <div key={m.id} className="flex flex-col sm:flex-row justify-between items-center bg-[#1e1e1e] p-5 rounded-2xl gap-4">
                    
                    {/* 🔥 ADMIN KONFLIKT MELDUNG */}
                    {m.status === "rejected" ? (
                      <div className="flex flex-col items-center justify-center w-full text-center gap-2 py-2">
                        <div className="text-red-500 font-bold text-lg md:text-xl tracking-wider uppercase flex items-center gap-2"><span>🚨</span> Konflikt: Ergebnis abgelehnt</div>
                        <div className="text-sm font-bold text-gray-300 bg-black/40 px-4 py-1.5 rounded-full mt-1">{getTeamName(m.team1_id)} <span className="text-white/30 mx-2">vs</span> {getTeamName(m.team2_id)}</div>
                        <div className="text-xs md:text-sm text-gray-400 bg-red-500/10 p-3 md:p-4 rounded-xl border border-red-500/20 mt-2 max-w-lg">
                          Es gab eine Unstimmigkeit beim Ergebnis. Bitte öffnet ein <strong>Ticket im Discord</strong> oder <strong>taggt einen Admin</strong> im Gruppen-Channel zur Klärung.
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-center sm:text-left truncate text-base ${isHome ? 'font-bold text-yellow-400' : 'text-gray-300'}`}>{getTeamName(m.team1_id)} {isHome && "(Du)"}</span>

                        <div className="flex flex-col items-center justify-center min-w-[120px]">
                          {m.status === "confirmed" ? (
                            <div className="text-center">
                              <div className="text-green-500 font-bold text-2xl tracking-widest">{m.score1} : {m.score2}</div>
                              <div className="text-[10px] text-green-500 mt-1 uppercase tracking-wider font-bold">✔ Bestätigt</div>
                            </div>
                          ) : isHome ? (
                            m.status == null ? (
                              <div className="flex flex-col items-center gap-3 w-full">
                                <div className="flex items-center gap-2">
                                  <input type="text" value={s1} onChange={(e) => updateScoreInput(m.id, 's1', e.target.value)} className="w-12 h-12 bg-[#0a0a0a] border border-white/10 text-white text-xl text-center rounded-xl font-bold focus:border-blue-500 focus:outline-none transition" />
                                  <span className="font-bold text-gray-500">:</span>
                                  <input type="text" value={s2} onChange={(e) => updateScoreInput(m.id, 's2', e.target.value)} className="w-12 h-12 bg-[#0a0a0a] border border-white/10 text-white text-xl text-center rounded-xl font-bold focus:border-blue-500 focus:outline-none transition" />
                                </div>
                                <button onClick={() => { if (s1 === "" || s2 === "") return alert("Bitte Ergebnis eintragen."); handleReport(m.id, Number(s1), Number(s2)); }} className="w-full text-sm bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl text-white font-bold transition">Melden</button>
                              </div>
                            ) : (
                              <div className="text-center">
                                <div className="font-bold text-2xl tracking-widest text-white">{m.score1} : {m.score2}</div>
                                <div className="text-[10px] text-yellow-500 mt-1 uppercase tracking-wider font-bold">Wartet auf Bestätigung</div>
                              </div>
                            )
                          ) : isAway ? (
                            m.status == null ? (
                              <div className="text-center w-full">
                                <div className="font-bold text-3xl text-white/20 tracking-widest mb-1">- : -</div>
                                <div className="text-[10px] text-yellow-500 uppercase tracking-wider font-bold">⏳ Warten auf Heimteam</div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2 w-full">
                                <div className="font-bold text-2xl text-yellow-400 tracking-widest">{m.score1} : {m.score2}</div>
                                <div className="flex gap-2 w-full mt-1">
                                  <button onClick={() => handleConfirm(m.id)} className="flex-1 text-sm bg-green-600 hover:bg-green-500 py-2.5 rounded-xl text-white font-bold transition">✔</button>
                                  <button onClick={() => handleReject(m.id)} className="flex-1 text-sm bg-red-600 hover:bg-red-500 py-2.5 rounded-xl text-white font-bold transition">✖</button>
                                </div>
                              </div>
                            )
                          ) : null}
                        </div>
                        <span className={`flex-1 text-center sm:text-right truncate text-base ${isAway ? 'font-bold text-yellow-400' : 'text-gray-300'}`}>{getTeamName(m.team2_id)} {isAway && "(Du)"}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setActiveRound(null)} className="w-full mt-6 py-4 bg-[#1e1e1e] hover:bg-[#2a2a2a] transition rounded-2xl font-bold text-white border border-white/5">Schließen</button>
          </div>
        </div>
      )}
    </main>
  );
}