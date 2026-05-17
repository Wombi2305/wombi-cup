"use client";

import { useEffect, useState, Fragment, useMemo, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import TeamCard from "@/components/TeamCard";

function TurnierTabelleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [loadingData, setLoadingData] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [myTeamRoles, setMyTeamRoles] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [groups, setGroups] = useState<any>({});
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>(searchParams.get("group") || "ALL");
  const [scores, setScores] = useState<any>({});

  const fetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    teams.forEach((t) => { map[t.id] = t; });
    return map;
  }, [teams]);

  const myAllTeamIds = useMemo(() => {
    if (!user) return [];
    const owned = teams.filter(t => t.user_id === user.id).map(t => t.id);
    const member = myTeamRoles.map(r => r.team_id);
    return Array.from(new Set([...owned, ...member]));
  }, [teams, user, myTeamRoles]);

  const myManageableTeamIds = useMemo(() => {
    if (!user) return [];
    const owned = teams.filter(t => t.user_id === user.id).map(t => t.id);
    const coCaptains = myTeamRoles.filter(r => r.role === 'captain' || r.role === 'co-captain').map(r => r.team_id);
    return Array.from(new Set([...owned, ...coCaptains]));
  }, [teams, user, myTeamRoles]);

  const userMatches = useMemo(() => {
    if (!user || myManageableTeamIds.length === 0) return [];
    return matches.filter(m => 
      m.match_type !== "ko" && 
      (myManageableTeamIds.includes(m.team1_id) || myManageableTeamIds.includes(m.team2_id))
    );
  }, [matches, myManageableTeamIds, user]);

  const actionableRounds = useMemo(() => {
    if (!matches || matches.length === 0 || !userMatches || userMatches.length === 0) return [];
    const userGroups = Array.from(new Set(userMatches.map(m => m.group_name)));
    const relevantGroupMatches = matches.filter(m => m.match_type !== "ko" && userGroups.includes(m.group_name));
    const sortedMatches = [...relevantGroupMatches].sort((a, b) => a.round - b.round);
    const firstUnconfirmedGlobal = sortedMatches.find(m => m.status !== "confirmed");

    if (firstUnconfirmedGlobal) {
        const myOpenMatchInThisRound = userMatches.find(m => m.round === firstUnconfirmedGlobal.round && m.status !== "confirmed");
        if (myOpenMatchInThisRound) return [firstUnconfirmedGlobal.round];
        else return []; 
    }
    return [];
  }, [matches, userMatches]);

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
      table[team.id] = { 
        id: team.id, name: team.teamname, level: team.level, logo_url: team.logo_url, 
        equipped_banner: team.equipped_banner, equipped_color: team.equipped_color,
        equipped_border: team.equipped_border, equipped_background: team.equipped_background,
        team_rewards: team.team_rewards,
        sp: 0, g: 0, u: 0, v: 0, tore: 0, gegentore: 0, pkt: 0 
      };
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

  useEffect(() => {
    const initUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        const { data: roles } = await supabase.from("team_members").select("team_id, role").eq("user_id", currentUser.id);
        setMyTeamRoles(roles || []);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    setIsReady(false);
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (!selectedTournament) return;
    fetchData();
    const channel = supabase.channel("realtime-tabelle")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
        fetchTimeout.current = setTimeout(() => fetchData(true), 2000);
      })
      .subscribe();
    return () => { 
      supabase.removeChannel(channel); 
      if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
    };
  }, [selectedTournament, user]);

  const fetchTournaments = async () => {
    setLoadingData(true);
    const { data } = await supabase.from("tournaments").select("*").eq("archived", false).eq("draw_finished", true);
    if (!data || data.length === 0) { 
      setTournaments([]); setSelectedTournament(null); setIsReady(true); setLoadingData(false); 
      return; 
    }
    setTournaments(data);
    setSelectedTournament(data[0].id);
    setLoadingData(false);
  };

  const fetchData = async (isBackground = false) => {
    if (!isBackground && !isReady) setLoadingData(true);
    
    const { data: regData } = await supabase.from("tournament_registrations")
      .select(`
        *,
        teams (
          *,
          team_rewards (
            *,
            custom_rewards (*)
          )
        )
      `)
      .eq("tournament_id", selectedTournament)
      .eq("status", "approved"); 
    
    const { data: m } = await supabase.from("matches").select("*").eq("tournament_id", selectedTournament);
    const { data: g } = await supabase.from("group_assignments").select("*").eq("tournament_id", selectedTournament);
    
    let extractedTeams: any[] = [];
    if (regData) {
      extractedTeams = regData.map((r: any) => Array.isArray(r.teams) ? r.teams[0] : r.teams).filter(Boolean);
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
    }
    setIsReady(true); setLoadingData(false);
  };

  const getTeamName = (id: number) => teamMap[id]?.teamname || "Team";
  const updateScoreInput = (matchId: number, key: string, value: string) => {
    setScores((prev: any) => ({ ...prev, [matchId]: { ...(prev[matchId] || {}), [key]: value.replace(/[^0-9]/g, "") } }));
  };

  const handleReport = async (matchId: number, s1: number, s2: number) => {
    const { error } = await supabase.from("matches").update({ score1: s1, score2: s2, status: "reported", reported_by: user.id }).eq("id", matchId);
    if (error) return alert("❌ Fehler: " + error.message);
    fetchData(true);
  };

  const handleConfirm = async (matchId: number) => {
    const { error: matchError } = await supabase.from("matches").update({ status: "confirmed", confirmed_by: user.id }).eq("id", matchId);
    if (matchError) return alert("❌ Fehler: " + matchError.message);
    fetchData(true);
  };

  const handleReject = async (matchId: number) => {
    const { error } = await supabase.from("matches").update({ score1: null, score2: null, status: "rejected", reported_by: null }).eq("id", matchId);
    if (error) return alert("❌ Fehler: " + error.message);
    fetchData(true);
  };

  const handleGroupChange = (g: string) => {
    setActiveGroup(g);
    const params = new URLSearchParams(searchParams.toString());
    g === "ALL" ? params.delete("group") : params.set("group", g);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const modalMatches = userMatches.filter(m => m.round === activeRound);

  return (
    <main className="px-4 md:px-6 pt-6 pb-12 text-white font-sans w-full max-w-7xl mx-auto">
      <div className="flex gap-3 mb-4">
        <button className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm cursor-default">🟢 Aktuell</button>
        <Link href="/archiv" className="border border-white/10 px-4 py-2 rounded-lg text-sm transition hover:bg-white/5">📦 Archiv</Link>
      </div>

      {loadingData ? (
        <div className="text-white/60 text-center mt-20">⏳ Lade...</div>
      ) : tournaments.length === 0 ? (
        <div className="text-white/60 text-center mt-20">Keine laufenden Turniere.</div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap gap-2">
              {tournaments.map((t) => (
                <div key={t.id} onClick={() => setSelectedTournament(t.id)} className={`cursor-pointer p-2 rounded-xl border transition ${selectedTournament === t.id ? "bg-yellow-500 text-black border-yellow-400 scale-105 shadow-lg" : "border-yellow-500/30 hover:bg-white/5"}`}>
                  <div className="font-bold uppercase text-sm truncate px-1 max-w-[150px] md:max-w-xs">{t.name}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {actionableRounds.map(round => (
                <button key={round} onClick={() => setActiveRound(round)} className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:scale-105 transition-transform">
                  Spieltag {round} verwalten
                </button>
              ))}
              <button onClick={() => handleGroupChange("ALL")} className={activeGroup === "ALL" ? "bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-md ml-2" : "border border-white/10 px-4 py-2 rounded-lg text-sm transition hover:bg-white/5 ml-2"}>Alle Gruppen</button>
              {Object.keys(groups).map((g) => (
                <button key={g} onClick={() => handleGroupChange(g)} className={activeGroup === g ? "bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-md" : "border border-white/10 px-4 py-2 rounded-lg text-sm transition hover:bg-white/5"}>Gruppe {g}</button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 items-start">
            {Object.keys(groups).filter((g) => activeGroup === "ALL" || g === activeGroup).map((groupName) => {
              const table = currentTables[groupName] || [];
              return (
                <Fragment key={groupName}>
                  <div className="border border-yellow-500/30 rounded-xl p-2 sm:p-4 shadow-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] overflow-hidden">
                    <div className="mb-3 border-b border-yellow-500/30 pb-2 ml-2 sm:ml-0">
                      <span className="text-yellow-400 font-bold uppercase tracking-widest text-sm italic">Gruppe {groupName}</span>
                    </div>
                    
                    <div className="w-full pb-1">
                      <div className="w-full">
                        
                        {/* 🔥 HIER GEFIXT: Intelligentes 1fr-Grid anstatt 12 Spalten */}
                        <div className="grid grid-cols-[20px_25px_1fr_20px_20px_20px_20px_35px] md:grid-cols-[30px_40px_1fr_30px_30px_30px_30px_50px] gap-1 sm:gap-2 text-[9px] md:text-xs uppercase text-gray-400 mb-2 px-1 text-center font-bold italic items-center">
                          <span>#</span>
                          <span>Pkt</span>
                          <span className="text-left pl-1 sm:pl-2">Team</span>
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
                            // 🔥 HIER GEFIXT: Das gleiche intelligente Grid für die Reihen
                            <div key={team.id} style={{ background: isTop ? tournamentStyle.color_top + "20" : isBottom ? tournamentStyle.color_bottom + "20" : tournamentStyle.color_middle + "20", borderLeft: `4px solid ${isTop ? tournamentStyle.color_top : isBottom ? tournamentStyle.color_bottom : tournamentStyle.color_middle}` }} className="grid grid-cols-[20px_25px_1fr_20px_20px_20px_20px_35px] md:grid-cols-[30px_40px_1fr_30px_30px_30px_30px_50px] gap-1 sm:gap-2 text-[10px] md:text-sm py-2 border-b border-white/5 items-center text-center transition-colors hover:bg-white/5 pr-1">
                              
                              <span className={`font-black tracking-tight ${i === 0 ? "text-yellow-300 scale-110 text-sm md:text-xl" : "text-yellow-400 text-xs md:text-xl"}`}>{i + 1}</span>
                              <span className="text-white/90 font-bold text-xs md:text-sm">{team.pkt}</span>
                              
                              {/* Die Teamcard nimmt sich jetzt das komplette "1fr" (den gesamten restlichen Platz) */}
                              <div className="flex items-center justify-start py-1 overflow-hidden w-full">
                                <TeamCard team={team} isDu={myAllTeamIds.includes(team.id)} />
                              </div>
                              
                              <span>{team.sp}</span>
                              <span className="text-green-400 font-bold">{team.g}</span>
                              <span>{team.u}</span>
                              <span>{team.v}</span>
                              <span className="font-bold text-yellow-400 text-[9px] sm:text-sm whitespace-nowrap">{team.tore}:{team.gegentore}</span>
                            
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {activeGroup !== "ALL" && (
                    <div className="border border-yellow-500/30 rounded-xl p-4 shadow-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex flex-col">
                      <div className="mb-4 border-b border-yellow-500/30 pb-2"><span className="text-yellow-400 font-bold uppercase tracking-widest text-sm italic">Spielplan Gruppe {groupName}</span></div>
                      <div className="flex-1">
                        {Object.entries(groupedMatchesByGroupAndRound[groupName] || {}).map(([round, games]: any) => (
                          <div key={round} className="mb-5">
                            <div className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Spieltag {round}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                              {games.map((m: any) => {
                                const isTeam1Mine = myAllTeamIds.includes(m.team1_id);
                                const isTeam2Mine = myAllTeamIds.includes(m.team2_id);
                                const isMyMatch = isTeam1Mine || isTeam2Mine;
                                return (
                                  <div key={m.id} className={`flex justify-between items-center text-xs transition px-2 py-2 rounded-lg border ${isMyMatch ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                    <div className={`w-[40%] text-left truncate text-xs font-bold ${isTeam1Mine ? 'text-yellow-400' : 'text-white/90'}`}>{getTeamName(m.team1_id)}</div>
                                    <span className="w-[15%] mx-1 text-center text-yellow-400 font-bold bg-black/40 py-1 rounded whitespace-nowrap">{m.score1 != null ? `${m.score1} : ${m.score2}` : "- : -"}</span>
                                    <div className={`w-[40%] text-right truncate text-xs font-bold ${isTeam2Mine ? 'text-yellow-400' : 'text-white/90'}`}>{getTeamName(m.team2_id)}</div>
                                  </div>
                                );
                              })}
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
        </>
      )}

      {activeRound && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] p-6 rounded-3xl w-full max-w-2xl border border-white/5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-bold text-xl">Spieltag {activeRound} verwalten</h2>
              <button onClick={() => setActiveRound(null)} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition">✕</button>
            </div>
            <div className="space-y-4">
              {modalMatches.map((m) => {
                const isHome = myManageableTeamIds.includes(m.team1_id);
                const isAway = myManageableTeamIds.includes(m.team2_id);
                const team1 = teamMap[m.team1_id];
                const team2 = teamMap[m.team2_id];
                const s1 = scores[m.id]?.s1 ?? (m.score1 !== null ? String(m.score1) : "");
                const s2 = scores[m.id]?.s2 ?? (m.score2 !== null ? String(m.score2) : "");
                let actionUI = null;
                if (m.status === "confirmed") actionUI = <div className="text-center"><div className="text-green-500 font-bold text-2xl tracking-widest">{m.score1} : {m.score2}</div><div className="text-[10px] text-green-500 mt-1 uppercase tracking-wider font-bold">✔ Bestätigt</div></div>;
                else if (m.status === "reported") {
                  if (isAway) actionUI = <div className="flex flex-col items-center gap-2 w-full"><div className="font-bold text-2xl text-yellow-400 tracking-widest">{m.score1} : {m.score2}</div><div className="flex gap-2 w-full mt-1"><button onClick={() => handleConfirm(m.id)} className="flex-1 text-sm bg-green-600 py-2.5 rounded-xl text-white font-bold transition">✔</button><button onClick={() => handleReject(m.id)} className="flex-1 text-sm bg-red-600 py-2.5 rounded-xl text-white font-bold transition">✖</button></div></div>;
                  else if (isHome) actionUI = <div className="text-center"><div className="font-bold text-2xl tracking-widest text-white">{m.score1} : {m.score2}</div><div className="text-[10px] text-yellow-500 mt-1 uppercase tracking-wider font-bold">Wartet auf Bestätigung</div></div>;
                } else {
                  if (isHome) actionUI = <div className="flex flex-col items-center gap-3 w-full"><div className="flex items-center gap-2"><input type="text" value={s1} onChange={(e) => updateScoreInput(m.id, 's1', e.target.value)} className="w-12 h-12 bg-[#0a0a0a] border border-white/10 text-white text-xl text-center rounded-xl font-bold focus:border-blue-500 focus:outline-none transition" /><span className="font-bold text-gray-500">:</span><input type="text" value={s2} onChange={(e) => updateScoreInput(m.id, 's2', e.target.value)} className="w-12 h-12 bg-[#0a0a0a] border border-white/10 text-white text-xl text-center rounded-xl font-bold focus:border-blue-500 focus:outline-none transition" /></div><button onClick={() => { if (s1 === "" || s2 === "") return alert("Bitte Ergebnis eintragen."); handleReport(m.id, Number(s1), Number(s2)); }} className="w-full text-sm bg-blue-600 py-2.5 rounded-xl text-white font-bold transition">Melden</button></div>;
                  else if (isAway) actionUI = <div className="text-center w-full"><div className="font-bold text-3xl text-white/20 tracking-widest mb-1">- : -</div><div className="text-[10px] text-yellow-500 uppercase tracking-wider font-bold">⏳ Warten auf Heimteam</div></div>;
                }
                return (
                  <div key={m.id} className="flex flex-col sm:flex-row justify-between items-center bg-[#1e1e1e] p-5 rounded-2xl gap-4">
                    {m.status === "rejected" ? (
                      <div className="flex flex-col items-center justify-center w-full text-center gap-2 py-2"><div className="text-red-500 font-bold text-lg tracking-wider uppercase">🚨 Konflikt: Ergebnis abgelehnt</div><div className="text-sm font-bold text-gray-300">{team1?.teamname} vs {team2?.teamname}</div><div className="text-xs text-gray-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 mt-2">Discord Ticket öffnen zur Klärung.</div></div>
                    ) : (
                      <><TeamCard team={team1} isDu={myAllTeamIds.includes(m.team1_id)} /><div className="flex flex-col items-center justify-center min-w-[120px]">{actionUI}</div><TeamCard team={team2} isDu={myAllTeamIds.includes(m.team2_id)} reverseOnMobile /></>
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

export default function TurnierTabelle() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-white">Lade Tabelle...</div>}>
      <TurnierTabelleContent />
    </Suspense>
  );
}