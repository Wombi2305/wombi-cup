"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// 🔥 HELPER: Holt das passende Bild
const getTierImage = (level: number) => {
  const l = level || 1;
  if (l >= 45) return "/Prisma.png";
  if (l >= 40) return "/Amethyst.png";
  if (l >= 35) return "/Sapphire.png";
  if (l >= 30) return "/Emerald.png";
  if (l >= 25) return "/Ruby.png";
  if (l >= 20) return "/Gold.png";
  if (l >= 10) return "/Silber.png";
  return "/Bronze.png";
};

// 🔥 HELPER: Holt die passende Farbe für den Hintergrund & Rahmen
const getTierColors = (level: number) => {
  const l = level || 1;
  if (l >= 45) return "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-50"; // Prisma
  if (l >= 40) return "bg-purple-500/20 border-purple-500/40 text-purple-50"; // Amethyst
  if (l >= 35) return "bg-blue-500/20 border-blue-500/40 text-blue-50"; // Sapphire
  if (l >= 30) return "bg-emerald-500/20 border-emerald-500/40 text-emerald-50"; // Emerald
  if (l >= 25) return "bg-red-500/20 border-red-500/40 text-red-50"; // Ruby
  if (l >= 20) return "bg-yellow-500/20 border-yellow-500/40 text-yellow-50"; // Gold
  if (l >= 10) return "bg-slate-400/20 border-slate-400/40 text-slate-50"; // Silber
  return "bg-amber-700/20 border-amber-700/40 text-amber-50"; // Bronze
};

interface KoPhaseProps {
  matches: any[];
  teams: any[];
  user: any;
  koSize?: number;
}

export default function KoPhase({ matches, teams, user, koSize }: KoPhaseProps) {

  // ===============================
  // STATES
  // ===============================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scores, setScores] = useState<any>({});
  
  const [localMatches, setLocalMatches] = useState<any[]>(matches);
  
  const [activeMobileRound, setActiveMobileRound] = useState<number | null>(null);

  useEffect(() => {
    setLocalMatches(matches);
  }, [matches]);

  // ===============================
  // LOGIC
  // ===============================
  const koMatches = useMemo(() => {
    return localMatches.filter((m) => m.match_type === "ko");
  }, [localMatches]);

  const teamMap = useMemo(() => {
    const map: any = {};
    teams.forEach((t) => {
      map[t.id] = t;
    });
    return map;
  }, [teams]);

  const expectedRounds = useMemo(() => {
    const startSize =
      koSize ||
      (koMatches.length > 0
        ? Math.max(...koMatches.map((m) => m.ko_round))
        : 0);

    const res = [];
    let current = startSize;

    while (current >= 2) {
      res.push(current);
      current = current / 2;
    }

    return res;
  }, [koSize, koMatches]);

  const currentMobileRound = activeMobileRound || (expectedRounds.length > 0 ? expectedRounds[0] : null);

  const getRoundName = (round: number) => {
    if (round === 2) return "Finale";
    const roundIndex = expectedRounds.indexOf(round);
    return `Runde ${roundIndex + 1}`;
  };

  const myKoMatches = useMemo(() => {
    const myTeamId = teams.find((t) => t.user_id === user?.id)?.id;
    if (!myTeamId) return [];
    return koMatches.filter((m) => m.team1_id === myTeamId || m.team2_id === myTeamId);
  }, [koMatches, teams, user]);

  const activeUserMatch = useMemo(() => {
    if (myKoMatches.length === 0) return null;
    
    // Sortiere von frühster Runde zur spätesten
    const sortedMatches = [...myKoMatches].sort((a, b) => b.ko_round - a.ko_round);
    
    // Nimm das erste Spiel, das noch NICHT bestätigt ist
    const unconfirmed = sortedMatches.find((m) => m.status !== "confirmed");
    if (unconfirmed) return unconfirmed;
    
    // Falls alle Spiele bestätigt sind, nimm das letzte Match
    return sortedMatches[sortedMatches.length - 1];
  }, [myKoMatches]);

  const getTeamName = (id: number) => teamMap[id]?.teamname || "Team";

  // ===============================
  // SCORE HANDLERS
  // ===============================
  const updateScoreInput = (matchId: number, key: string, value: string) => {
    setScores((prev: any) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || {}),
        [key]: value.replace(/[^0-9]/g, ""),
      },
    }));
  };

  const handleReport = async (matchId: number, match: any) => {
    const s1 = scores[matchId]?.s1 ?? match.score1;
    const s2 = scores[matchId]?.s2 ?? match.score2;

    if (s1 === "" || s2 === "" || s1 == null || s2 == null) {
      alert("Bitte Ergebnis eintragen.");
      return;
    }

    const numS1 = Number(s1);
    const numS2 = Number(s2);

    setLocalMatches((prev) => 
      prev.map((m) => 
        m.id === matchId ? { ...m, score1: numS1, score2: numS2, status: "reported", reported_by: user?.id } : m
      )
    );

    await supabase
      .from("matches")
      .update({
        score1: numS1,
        score2: numS2,
        status: "reported",
        reported_by: user?.id,
      })
      .eq("id", matchId);
  };

  // 🔥 WIEDER VEREINFACHT: Wir setzen nur den Status, den Rest macht dein SQL-Trigger!
  const handleConfirm = async (matchId: number) => {
    setLocalMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, status: "confirmed", confirmed_by: user?.id } : m));
    await supabase.from("matches").update({ status: "confirmed", confirmed_by: user?.id }).eq("id", matchId);
  };

  const handleReject = async (matchId: number) => {
    setLocalMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, score1: null, score2: null, status: "rejected", reported_by: null } : m));
    await supabase.from("matches").update({ score1: null, score2: null, status: "rejected", reported_by: null }).eq("id", matchId);
  };

  // ===============================
  // UI
  // ===============================
  return (
    <div className="mt-6 w-full">

      {/* --- BUTTON OBEN --- */}
      {activeUserMatch && (
        <div className="flex gap-2 mb-6 w-full">
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:scale-105 transition-transform"
          >
            {getRoundName(activeUserMatch.ko_round)} eintragen
          </button>
        </div>
      )}

      {/* ===============================
          🔥 MOBILE ANSICHT (NUR AUF HANDY SICHTBAR)
      =============================== */}
      <div className="md:hidden w-full mb-8">
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {expectedRounds.map((round) => (
            <button
              key={round}
              onClick={() => setActiveMobileRound(round)}
              className={`px-4 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest whitespace-nowrap transition-all ${
                currentMobileRound === round
                  ? "bg-yellow-500 text-black shadow-lg"
                  : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              {getRoundName(round)}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 mt-2">
          {koMatches
            .filter((m) => m.ko_round === currentMobileRound)
            .sort((a, b) => a.id - b.id)
            .map((m: any) => {
              const team1 = teamMap[m.team1_id];
              const team2 = teamMap[m.team2_id];

              const isConfirmed = m.status === "confirmed";
              const team1Wins = isConfirmed && m.score1 !== null && m.score2 !== null && m.score1 > m.score2;
              const team2Wins = isConfirmed && m.score1 !== null && m.score2 !== null && m.score2 > m.score1;

              return (
                <div key={m.id} className="flex flex-col bg-black/60 border rounded-xl border-white/10 relative z-10 w-full shadow-lg p-2 gap-2">
                  
                  {/* TEAM 1 */}
                  <div className={`flex justify-between items-center transition-opacity ${isConfirmed && !team1Wins ? 'opacity-40' : ''}`}>
                    {team1 ? (
                      <div className={`flex items-center justify-start border rounded-lg px-2.5 py-1.5 gap-2 text-sm font-bold flex-1 overflow-hidden ${getTierColors(team1.level)}`}>
                        <img src={getTierImage(team1.level)} alt="Rank" className="w-6 h-6 object-contain drop-shadow-md shrink-0" />
                        <span className="truncate tracking-tight">{team1.teamname} {team1Wins && currentMobileRound === 2 && "👑"}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-start border border-white/5 bg-white/5 rounded-lg px-2.5 py-1.5 text-sm font-bold flex-1 text-gray-500 italic">
                        TBD
                      </div>
                    )}
                    <div className="w-12 text-center font-black text-xl shrink-0">
                      <span className={isConfirmed ? (team1Wins ? "text-green-400" : "text-gray-500") : "text-gray-400"}>
                        {m.score1 ?? "-"}
                      </span>
                    </div>
                  </div>

                  {/* TEAM 2 */}
                  <div className={`flex justify-between items-center transition-opacity ${isConfirmed && !team2Wins ? 'opacity-40' : ''}`}>
                    {team2 ? (
                      <div className={`flex items-center justify-start border rounded-lg px-2.5 py-1.5 gap-2 text-sm font-bold flex-1 overflow-hidden ${getTierColors(team2.level)}`}>
                        <img src={getTierImage(team2.level)} alt="Rank" className="w-6 h-6 object-contain drop-shadow-md shrink-0" />
                        <span className="truncate tracking-tight">{team2.teamname} {team2Wins && currentMobileRound === 2 && "👑"}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-start border border-white/5 bg-white/5 rounded-lg px-2.5 py-1.5 text-sm font-bold flex-1 text-gray-500 italic">
                        TBD
                      </div>
                    )}
                    <div className="w-12 text-center font-black text-xl shrink-0">
                      <span className={isConfirmed ? (team2Wins ? "text-green-400" : "text-gray-500") : "text-gray-400"}>
                        {m.score2 ?? "-"}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
        </div>
      </div>

      {/* ===============================
          🔥 DESKTOP ANSICHT (NUR AUF PC/TABLET SICHTBAR)
      =============================== */}
      <div className="hidden md:block w-full overflow-x-auto pb-12 pt-6">
        <div className="flex min-w-max items-stretch min-h-[400px]">
          {expectedRounds.map((round, colIndex) => {
            const roundMatches = koMatches
              .filter((m) => m.ko_round === round)
              .sort((a, b) => a.id - b.id);

            return (
              <div key={round} className="flex flex-col w-[320px] shrink-0">
                <div className="text-center pb-2 border-b border-yellow-500/30 mb-2 mx-6">
                  <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-widest">
                    {getRoundName(round)}
                  </h3>
                </div>

                <div className="flex flex-col flex-1">
                  {roundMatches.map((m: any, i: number) => {
                    const team1 = teamMap[m.team1_id];
                    const team2 = teamMap[m.team2_id];

                    const isConfirmed = m.status === "confirmed";
                    const team1Wins = isConfirmed && m.score1 !== null && m.score2 !== null && m.score1 > m.score2;
                    const team2Wins = isConfirmed && m.score1 !== null && m.score2 !== null && m.score2 > m.score1;

                    return (
                      <div key={m.id} className="flex-1 flex flex-col justify-center relative px-6 py-4">
                        
                        {colIndex > 0 && (
                          <div className="absolute left-0 top-1/2 w-6 h-[2px] bg-white/10 -translate-y-1/2" />
                        )}

                        {colIndex < expectedRounds.length - 1 && (
                          <>
                            <div className="absolute right-0 top-1/2 w-6 h-[2px] bg-white/10 -translate-y-1/2" />
                            {i % 2 === 0 ? (
                              <div className="absolute right-0 top-1/2 bottom-0 w-[2px] bg-white/10" />
                            ) : (
                              <div className="absolute right-0 top-0 bottom-1/2 w-[2px] bg-white/10" />
                            )}
                          </>
                        )}

                        <div className="flex flex-col bg-black/60 border rounded-xl border-white/10 relative z-10 w-full shadow-lg p-1.5 gap-1.5">
                          
                          {/* TEAM 1 */}
                          <div className={`flex justify-between items-center transition-opacity ${isConfirmed && !team1Wins ? 'opacity-40' : ''}`}>
                            {team1 ? (
                              <div className={`flex items-center justify-start border rounded-lg px-2.5 py-1.5 gap-2 text-sm font-bold flex-1 overflow-hidden ${getTierColors(team1.level)}`}>
                                <img src={getTierImage(team1.level)} alt="Rank" className="w-5 h-5 object-contain drop-shadow-md shrink-0" />
                                <span className="truncate tracking-tight">{team1.teamname} {team1Wins && round === 2 && "👑"}</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-start border border-white/5 bg-white/5 rounded-lg px-2.5 py-1.5 text-sm font-bold flex-1 text-gray-500 italic">
                                TBD
                              </div>
                            )}
                            <div className="w-10 text-center font-black text-lg shrink-0">
                              <span className={isConfirmed ? (team1Wins ? "text-green-400" : "text-gray-500") : "text-gray-500"}>
                                {m.score1 ?? "-"}
                              </span>
                            </div>
                          </div>

                          {/* TEAM 2 */}
                          <div className={`flex justify-between items-center transition-opacity ${isConfirmed && !team2Wins ? 'opacity-40' : ''}`}>
                            {team2 ? (
                              <div className={`flex items-center justify-start border rounded-lg px-2.5 py-1.5 gap-2 text-sm font-bold flex-1 overflow-hidden ${getTierColors(team2.level)}`}>
                                <img src={getTierImage(team2.level)} alt="Rank" className="w-5 h-5 object-contain drop-shadow-md shrink-0" />
                                <span className="truncate tracking-tight">{team2.teamname} {team2Wins && round === 2 && "👑"}</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-start border border-white/5 bg-white/5 rounded-lg px-2.5 py-1.5 text-sm font-bold flex-1 text-gray-500 italic">
                                TBD
                              </div>
                            )}
                            <div className="w-10 text-center font-black text-lg shrink-0">
                              <span className={isConfirmed ? (team2Wins ? "text-green-400" : "text-gray-500") : "text-gray-500"}>
                                {m.score2 ?? "-"}
                              </span>
                            </div>
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===============================
          🔥 MODAL (SPIELE VERWALTEN)
      =============================== */}
      {isModalOpen && activeUserMatch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] p-6 rounded-3xl w-full max-w-2xl border border-white/5 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-bold text-xl">
                {getRoundName(activeUserMatch.ko_round)} verwalten
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {[activeUserMatch].map((m) => {
                const myTeamId = teams.find((t) => t.user_id === user?.id)?.id;
                const isHome = m.team1_id === myTeamId;
                const isAway = m.team2_id === myTeamId;
                const s1 = scores[m.id]?.s1 ?? (m.score1 !== null ? String(m.score1) : "");
                const s2 = scores[m.id]?.s2 ?? (m.score2 !== null ? String(m.score2) : "");

                return (
                  <div key={m.id} className="flex flex-col sm:flex-row justify-between items-center bg-[#1e1e1e] p-5 rounded-2xl gap-4">
                    
                    {m.status === "rejected" ? (
                      <div className="flex flex-col items-center justify-center w-full text-center gap-2 py-2">
                        <div className="text-red-500 font-bold text-lg md:text-xl tracking-wider uppercase flex items-center gap-2">
                          <span>🚨</span> Konflikt: Ergebnis abgelehnt
                        </div>
                        <div className="text-sm font-bold text-gray-300 bg-black/40 px-4 py-1.5 rounded-full mt-1">
                          {getTeamName(m.team1_id)} <span className="text-white/30 mx-2">vs</span> {getTeamName(m.team2_id)}
                        </div>
                        <div className="text-xs md:text-sm text-gray-400 bg-red-500/10 p-3 md:p-4 rounded-xl border border-red-500/20 mt-2 max-w-lg">
                          Es gab eine Unstimmigkeit beim Ergebnis. Bitte öffnet ein <strong>Ticket im Discord</strong> oder <strong>taggt einen Admin</strong> im K.O.-Phasen Channel zur Klärung.
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-center sm:text-left truncate text-base ${isHome ? 'font-bold text-yellow-400' : 'text-gray-300'}`}>
                          {getTeamName(m.team1_id)} {isHome && "(Du)"}
                        </span>

                        <div className="flex flex-col items-center justify-center min-w-[120px]">
                          
                          {m.status === "confirmed" ? (
                            <div className="text-center">
                              <div className="text-green-500 font-bold text-2xl tracking-widest">{m.score1 ?? "-"} : {m.score2 ?? "-"}</div>
                              <div className="text-[10px] text-green-500 mt-1 uppercase tracking-wider font-bold flex items-center justify-center gap-1">
                                <span>✔</span> BESTÄTIGT
                              </div>
                            </div>
                          ) : isHome ? (
                            m.status == null ? (
                              <div className="flex flex-col items-center gap-3 w-full">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    value={s1} 
                                    onChange={(e) => updateScoreInput(m.id, 's1', e.target.value)} 
                                    className="w-12 h-12 bg-[#0a0a0a] border border-white/10 text-white text-xl text-center rounded-xl font-bold focus:border-blue-500 focus:outline-none transition" 
                                  />
                                  <span className="font-bold text-gray-500">:</span>
                                  <input 
                                    type="text" 
                                    value={s2} 
                                    onChange={(e) => updateScoreInput(m.id, 's2', e.target.value)} 
                                    className="w-12 h-12 bg-[#0a0a0a] border border-white/10 text-white text-xl text-center rounded-xl font-bold focus:border-blue-500 focus:outline-none transition" 
                                  />
                                </div>
                                <button 
                                  onClick={() => handleReport(m.id, m)} 
                                  className="w-full text-sm bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl text-white font-bold transition"
                                >
                                  Melden
                                </button>
                              </div>
                            ) : ( // m.status === "reported"
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
                            ) : ( // m.status === "reported"
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
                        
                        <span className={`flex-1 text-center sm:text-right truncate text-base ${isAway ? 'font-bold text-yellow-400' : 'text-gray-300'}`}>
                          {getTeamName(m.team2_id)} {isAway && "(Du)"}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="w-full mt-6 py-4 bg-[#1e1e1e] hover:bg-[#2a2a2a] transition rounded-2xl font-bold text-white border border-white/5"
            >
              Schließen
            </button>

          </div>
        </div>
      )}
    </div>
  );
}