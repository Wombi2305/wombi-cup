"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// 🔥 HELPER: Holt Bild und Level
const getTeamStatsUI = (team: any) => {
  if (!team) return { level: 1, totalXp: 0, tierImage: "/Bronze.png" };

  const totalXp = 
    (team.participations || 0) * 50 +
    (team.wins_top5 || 0) * 50 +
    (team.wins_top3 || 0) * 75 +
    (team.wins_top1 || 0) * 100 +
    (team.total_goals_scored || 0) * 10;

  const level = team.level || 1;

  let tierImage = "/Bronze.png";
  if (level >= 45) tierImage = "/Prisma.png";
  else if (level >= 40) tierImage = "/Amethyst.png";
  else if (level >= 35) tierImage = "/Sapphire.png";
  else if (level >= 30) tierImage = "/Emerald.png";
  else if (level >= 25) tierImage = "/Ruby.png";
  else if (level >= 20) tierImage = "/Gold.png";
  else if (level >= 10) tierImage = "/Silber.png";

  return { level, totalXp, tierImage };
};

export default function RankingPage() {
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<any[]>([]);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("teams")
      .select("*")
      .gt("participations", 0) 
      .eq("is_deleted", false)
      .order("wins_top1", { ascending: false })
      .order("wins_top3", { ascending: false })
      .order("wins_top5", { ascending: false });

    if (data) {
      const rankedTeams = data.map(team => ({
        ...team,
        stats: getTeamStatsUI(team)
      }));
      setRanking(rankedTeams);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white bg-[#0a0a0a]">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-100px)] px-4 sm:px-6 pt-10 md:pt-12 pb-24 w-full max-w-6xl mx-auto text-white">
      
      {/* --- HEADER BEREICH --- */}
      <div className="flex flex-col items-center mb-12 text-center overflow-visible">
        {/* 🔥 FIX: tracking-tight (statt tighter) und pr-2 hinzugefügt, damit die '0' nicht abgeschnitten wird */}
        <h1 className="text-4xl md:text-7xl font-black tracking-tight uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 leading-[1.1] py-2 pr-2">
          Ranking Season 0
        </h1>
        <p className="text-gray-400 max-w-md text-sm md:text-base font-medium mt-2">
          Die Elite des WombiCups im Überblick. Wer sichert sich den Thron?
        </p>
      </div>

      {/* --- TABELLEN BEREICH --- */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl relative z-10">
        <div className="overflow-x-auto pb-2 scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-white/5 text-[10px] md:text-xs uppercase tracking-[0.2em] text-gray-500 font-black whitespace-nowrap border-b border-white/10">
                <th className="px-6 py-5 text-center w-20">Rank</th>
                <th className="px-6 py-5">Team</th>
                <th className="px-6 py-5 text-center text-gray-400">Teilnahmen</th>
                <th className="px-6 py-5 text-center text-yellow-500">🏆 Cup Siege</th>
                <th className="px-6 py-5 text-center text-gray-400">🥈 Top 4</th>
                <th className="px-6 py-5 text-center text-orange-400">🏅 Top 8</th>
                <th className="px-6 py-5 text-center">Tore</th>
                <th className="px-6 py-5 text-center w-24">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans relative z-10">
              {ranking.map((team, index) => {
                const diff = (team.total_goals_scored || 0) - (team.total_goals_conceded || 0);
                const isTop3 = index < 3;

                return (
                  <tr 
                    key={team.id} 
                    className={`hover:bg-white/[0.07] transition-all duration-300 whitespace-nowrap ${isTop3 ? 'bg-yellow-500/[0.02]' : ''}`}
                  >
                    {/* PLATZIERUNG */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full font-black text-sm ${
                        index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]' :
                        index === 1 ? 'bg-slate-300 text-black shadow-[0_0_15px_rgba(203,213,225,0.3)]' :
                        index === 2 ? 'bg-amber-700 text-white shadow-[0_0_15px_rgba(180,83,9,0.3)]' : 'text-gray-500 border border-white/10 bg-black/20'
                      }`}>
                        {index + 1}
                      </span>
                    </td>

                    {/* TEAM INFO */}
                    <td className="px-6 py-4 relative z-20">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          {team.logo_url ? (
                            <img 
                              src={team.logo_url} 
                              alt="Team Logo" 
                              className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-white/10 shadow-lg bg-black/40"
                            />
                          ) : (
                            <img 
                              src={team.stats.tierImage} 
                              alt="Rang" 
                              className="w-10 h-10 md:w-12 md:h-12 object-contain mix-blend-screen drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                            />
                          )}
                          <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[9px] font-black px-1 rounded border border-black shadow-sm uppercase">
                            Lvl {team.stats.level}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-sm md:text-base tracking-tight text-white/90">{team.teamname}</div>
                          <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{team.stats.totalXp} XP GESAMT</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-gray-300">
                      {team.participations || 0}
                    </td>

                    <td className="px-6 py-4 text-center font-black text-lg text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                      {team.wins_top1 || 0}
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-slate-300">
                      {team.wins_top3 || 0}
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-orange-400">
                      {team.wins_top5 || 0}
                    </td>

                    <td className="px-6 py-4 text-center text-xs md:text-sm font-medium text-gray-400">
                      <span className="text-white/70">{team.total_goals_scored || 0}</span>
                      <span className="mx-1 text-gray-600">:</span>
                      <span className="text-white/70">{team.total_goals_conceded || 0}</span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`font-black text-sm md:text-base px-2 py-1 rounded-lg ${
                        diff > 0 ? 'text-green-400 bg-green-400/10' : 
                        diff < 0 ? 'text-red-400 bg-red-400/10' : 
                        'text-gray-500 bg-gray-500/10'
                      }`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </td>
                  </tr>
                );
              })}
              
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-500 font-medium italic relative z-10">
                    Noch keine Teams registriert. Die Legendenbildung beginnt bald!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}