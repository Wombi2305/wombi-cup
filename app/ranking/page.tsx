"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RankingPage() {
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<any[]>([]);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    setLoading(true);
    // Wir holen die Daten direkt sortiert aus der Tabelle
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("wins_top1", { ascending: false })
      .order("wins_top3", { ascending: false })
      .gt("total_goals_scored", 0); // Nur Teams anzeigen, die schonmal gespielt haben

    if (data) setRanking(data);
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
    <main className="min-h-[calc(100vh-100px)] px-4 sm:px-6 pt-24 md:pt-28 pb-12 w-full max-w-6xl mx-auto text-white">
      <div className="flex flex-col items-center mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
          Global Ranking
        </h1>
        <p className="text-gray-400 max-w-md text-sm md:text-base">
          Wer wird das Topteam der 1. Saison des WombiCups
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
        {/* Hier liegt das Geheimnis für Mobile: overflow-x-auto und eine unsichtbare Scrollbar */}
        <div className="overflow-x-auto pb-2 scrollbar-hide">
          {/* min-w-max verhindert das Zusammenquetschen */}
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-white/5 text-[10px] md:text-xs uppercase tracking-[0.2em] text-gray-400 font-black whitespace-nowrap border-b border-white/10">
                <th className="px-4 py-4 md:p-5 text-center">Rank</th>
                <th className="px-4 py-4 md:p-5">Team</th>
                <th className="px-4 py-4 md:p-5 text-center text-yellow-500">🏆 1st</th>
                <th className="px-4 py-4 md:p-5 text-center text-gray-300">🥈 Top 3</th>
                <th className="px-4 py-4 md:p-5 text-center text-orange-400">🏅 Top 5</th>
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
                    <td className="px-4 py-3 md:p-5 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full font-bold text-xs md:text-sm ${
                        index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
                        index === 1 ? 'bg-gray-300 text-black' :
                        index === 2 ? 'bg-orange-500 text-black' : 'text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 md:p-5 font-bold text-sm md:text-base">
                      {team.teamname}
                    </td>
                    <td className="px-4 py-3 md:p-5 text-center font-black text-base md:text-lg text-yellow-500">
                      {team.wins_top1 || 0}
                    </td>
                    <td className="px-4 py-3 md:p-5 text-center font-bold text-gray-300">
                      {team.wins_top3 || 0}
                    </td>
                    <td className="px-4 py-3 md:p-5 text-center font-bold text-orange-400">
                      {team.wins_top5 || 0}
                    </td>
                    <td className="px-4 py-3 md:p-5 text-center text-xs md:text-sm font-medium text-gray-400">
                      {team.total_goals_scored || 0}:{team.total_goals_conceded || 0}
                    </td>
                    <td className={`px-4 py-3 md:p-5 text-center font-bold text-sm md:text-base ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
              
              {/* Optional: Wenn noch niemand gespielt hat */}
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 font-medium">
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