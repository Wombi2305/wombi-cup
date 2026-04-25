"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// 🔥 DEUTLICH VEREINFACHT: Wir holen uns nur noch das Bild und die XP für die Anzeige
const getTeamStatsUI = (team: any) => {
  if (!team) return { level: 1, totalXp: 0, tierImage: "/Bronze.png" };

  // Wir rechnen nur kurz die Gesamt-XP für die kleine Anzeige unter dem Teamnamen zusammen
  const totalXp = 
    (team.participations || 0) * 50 +
    (team.wins_top5 || 0) * 50 +
    (team.wins_top3 || 0) * 75 +
    (team.wins_top1 || 0) * 100 +
    (team.total_goals_scored || 0) * 10;

  // 🔥 WIR NUTZEN DAS LEVEL DIREKT AUS DEINER DATENBANK!
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
    
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .gt("participations", 0) // Nur Teams, die mindestens 1 Spiel haben
      .eq("is_deleted", false) // Nur Teams, die nicht gelöscht/deaktiviert sind
      .order("wins_top1", { ascending: false })
      .order("wins_top3", { ascending: false })
      .order("wins_top5", { ascending: false });

    if (data) {
      const rankedTeams = data.map(team => ({
        ...team,
        stats: getTeamStatsUI(team) // Nutzt jetzt unsere neue, schlanke Funktion
      }));

      setRanking(rankedTeams);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-100px)] px-4 sm:px-6 pt-16 md:pt-20 pb-12 w-full max-w-6xl mx-auto text-white">
      <div className="flex flex-col items-center mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 pr-2">
          Ranking Season 0
        </h1>
        <p className="text-gray-400 max-w-md text-sm md:text-base">
          Wer wird das Topteam der 1. Saison des WombiCups?
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto pb-2 scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-white/5 text-[10px] md:text-xs uppercase tracking-[0.2em] text-gray-400 font-black whitespace-nowrap border-b border-white/10">
                <th className="px-4 py-4 md:p-5 text-center">Rank</th>
                <th className="px-4 py-4 md:p-5">Team</th>
                <th className="px-4 py-4 md:p-5 text-center text-gray-300">Teilnahmen</th>
                <th className="px-4 py-4 md:p-5 text-center text-yellow-500">🏆 Cup Siege</th>
                <th className="px-4 py-4 md:p-5 text-center text-gray-300">🥈 Top 4</th>
                <th className="px-4 py-4 md:p-5 text-center text-orange-400">🏅 Top 8</th>
                <th className="px-4 py-4 md:p-5 text-center">Tore</th>
                <th className="px-4 py-4 md:p-5 text-center">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ranking.map((team, index) => {
                const diff = (team.total_goals_scored || 0) - (team.total_goals_conceded || 0);
                const isTop3 = index < 3;

                return (
                  <tr 
                    key={team.id} 
                    className={`hover:bg-white/10 transition-colors whitespace-nowrap ${isTop3 ? 'bg-yellow-500/5' : ''}`}
                  >
                    {/* PLATZIERUNG */}
                    <td className="px-4 py-3 md:p-5 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full font-bold text-xs md:text-sm ${
                        index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
                        index === 1 ? 'bg-gray-300 text-black' :
                        index === 2 ? 'bg-orange-500 text-black' : 'text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                    </td>

                    {/* TEAM MIT RANG BILD */}
                    <td className="px-4 py-3 md:p-5">
                      <div className="flex items-center gap-3">
                        <img 
                          src={team.stats.tierImage} 
                          alt="Rang" 
                          className="w-10 h-10 object-contain mix-blend-screen drop-shadow-md"
                        />
                        <div>
                          <div className="font-bold text-sm md:text-base">{team.teamname}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{team.stats.totalXp} XP</div>
                        </div>
                      </div>
                    </td>

                    {/* TEILNAHMEN */}
                    <td className="px-4 py-3 md:p-5 text-center font-bold text-gray-300">
                      {team.participations || 0}
                    </td>

                    {/* CUP SIEGE */}
                    <td className="px-4 py-3 md:p-5 text-center font-black text-base text-yellow-500">
                      {team.wins_top1 || 0}
                    </td>

                    {/* TOP 4 */}
                    <td className="px-4 py-3 md:p-5 text-center font-bold text-gray-300">
                      {team.wins_top3 || 0}
                    </td>

                    {/* TOP 8 */}
                    <td className="px-4 py-3 md:p-5 text-center font-bold text-orange-400">
                      {team.wins_top5 || 0}
                    </td>

                    {/* TORE */}
                    <td className="px-4 py-3 md:p-5 text-center text-xs md:text-sm font-medium text-gray-400">
                      {team.total_goals_scored || 0}:{team.total_goals_conceded || 0}
                    </td>

                    {/* DIFF */}
                    <td className={`px-4 py-3 md:p-5 text-center font-bold text-sm md:text-base ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
              
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 font-medium">
                    Noch keine Daten vorhanden. Die Saison hat gerade erst begonnen!
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