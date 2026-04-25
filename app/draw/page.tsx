"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const shuffleGroups = (groups: string[]) => {
  return [...groups].sort(() => Math.random() - 0.5);
};

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

// 🔥 NEUER HELPER: Holt die passende Farbe für den Hintergrund & Rahmen
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

export default function DrawPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [shuffled, setShuffled] = useState<any[]>([]);
  const [drawIndex, setDrawIndex] = useState(0);
  
  const [displayTeam, setDisplayTeam] = useState<any>(null); 
  
  const [groups, setGroups] = useState<any>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [drawStarted, setDrawStarted] = useState(false);

  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [roundQueue, setRoundQueue] = useState<string[]>([]);
  
  const [revealedTeam, setRevealedTeam] = useState<any>(null);
  const [targetGroup, setTargetGroup] = useState<string | null>(null);
  const [lastGroup, setLastGroup] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🔒 Zuverlässiges Discord-Login-System
  useEffect(() => {
    const checkAccess = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const discordId = authData.user?.user_metadata?.provider_id;

      if (!discordId) {
        setAuthorized(false);
        setLoadingAuth(false);
        return;
      }

      try {
        const res = await fetch(`/api/discord/member?userId=${discordId}`);
        const data = await res.json();

        const ALLOWED_ROLES = [
          "1493976124173062195", // 🎥 Streamer
          "1492478735444873398", // 👑 Orga
        ];

        const roles = data.roles || [];
        const hasAccess = roles.some((r: string) => ALLOWED_ROLES.includes(r));
        setAuthorized(hasAccess);
      } catch (error) {
        console.error("Auth check failed", error);
        setAuthorized(false);
      }

      setLoadingAuth(false);
    };

    checkAccess();
  }, []);

  const updateGroupNames = (count: number) => {
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      names.push(String.fromCharCode(65 + i));
    }
    setGroupNames(names);
    setGroups((prev: any) => {
      const newGroups: any = {};
      names.forEach((g) => {
        newGroups[g] = prev[g] || [];
      });
      return newGroups;
    });
  };

  useEffect(() => {
    if (!authorized) return;

    const fetchTournaments = async () => {
      const { data: tournamentsData } = await supabase.from("tournaments").select("*").eq("archived", false);
      if (!tournamentsData) return;

      const fullTournaments = [];
      for (const t of tournamentsData) {
        const { count } = await supabase
          .from("tournament_registrations")
          .select("*", { count: "exact", head: true })
          .eq("tournament_id", t.id)
          .eq("status", "approved");
          
        if (t.max_teams && count === t.max_teams) fullTournaments.push({ ...t, team_count: count });
      }
      setTournaments(fullTournaments);
    };

    fetchTournaments();

    const channel = supabase.channel("draw-tournaments")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => fetchTournaments())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_registrations" }, () => fetchTournaments())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [authorized]);

  useEffect(() => {
    if (!selectedTournament) return;
    const channel = supabase.channel("draw-selected").on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, (payload) => {
      const updated = payload.new as any;
      if (updated && updated.id === selectedTournament) {
        setTournaments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        updateGroupNames(updated.group_count || 2);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTournament]);

  useEffect(() => {
    if (!selectedTournament) return;
    const selected = tournaments.find(t => t.id === selectedTournament);
    if (selected) updateGroupNames(selected.group_count || 2);
  }, [selectedTournament, tournaments]);

  useEffect(() => {
    if (selectedTournament) fetchTeams();
  }, [selectedTournament]);

  const fetchTeams = async () => {
    if (!selectedTournament) return;
    
    const { data } = await supabase
      .from("tournament_registrations")
      .select(`
        teams (
          id,
          teamname,
          level
        )
      `)
      .eq("tournament_id", selectedTournament)
      .eq("status", "approved");
      
    if (data) {
      const extractedTeams = data.map((r: any) => r.teams).filter(Boolean);
      setTeams(extractedTeams);
      setShuffled([...extractedTeams].sort(() => Math.random() - 0.5));
    }
  };

  const resetDraw = () => {
    setDrawStarted(false);
    setSelectedTournament(null);
    setGroups({});
    setDrawIndex(0);
    setFinished(false);
    setDisplayTeam(null);
    setRevealedTeam(null);
    setTargetGroup(null);
    setLastGroup(null);
  };

  const quickDraw = async () => {
    if (!selectedTournament) return alert("Turnier wählen");
    const selected = tournaments.find(t => t.id === selectedTournament);
    if (selected?.draw_finished) return alert("Bereits ausgelost!");

    setDrawStarted(true);
    setFinished(true);

    await supabase.from("group_assignments").delete().eq("tournament_id", selectedTournament);
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const inserts: any[] = [];
    const groupCount = groupNames.length;

    shuffledTeams.forEach((team, index) => {
      const group = groupNames[index % groupCount];
      inserts.push({ tournament_id: selectedTournament, team_id: team.id, group_name: group });
    });

    await supabase.from("group_assignments").insert(inserts);
    await supabase.from("tournaments").update({ draw_finished: true }).eq("id", selectedTournament);
    window.location.reload();
  };

  const startDraw = async () => {
    if (!selectedTournament) return;
    const selected = tournaments.find(t => t.id === selectedTournament);
    if (selected?.draw_finished) return alert("Bereits ausgelost!");

    await supabase.from("group_assignments").delete().eq("tournament_id", selectedTournament);
    setDrawStarted(true);
    setDrawIndex(0);
    setFinished(false);
    setRoundQueue(shuffleGroups(groupNames));
  };

  const runSlotMachine = (realTeam: any) => {
    return new Promise<void>((resolve) => {
      let elapsed = 0;
      const duration = 1500 + Math.random() * 2000;
      let speed = 50;
      const tick = () => {
        const randomTeam = teams[Math.floor(Math.random() * teams.length)];
        setDisplayTeam(randomTeam); 
        elapsed += speed;
        speed += 10;
        if (elapsed < duration) setTimeout(tick, speed);
        else {
          setDisplayTeam(realTeam);
          resolve();
        }
      };
      tick();
    });
  };

  const getNextGroup = () => {
    const selected = tournaments.find(t => t.id === selectedTournament);
    const maxSize = selected?.group_size || 4;
    const availableGroups = groupNames.filter(g => (groups[g]?.length || 0) < maxSize);
    if (availableGroups.length === 0) return null;
    return availableGroups[Math.floor(Math.random() * availableGroups.length)];
  };

  const drawNext = async () => {
    if (drawIndex >= shuffled.length) {
      finishDraw();
      return;
    }
    setIsDrawing(true);
    const team = shuffled[drawIndex];
    await runSlotMachine(team);
    setDisplayTeam(null);
    setRevealedTeam(team);

    const group = getNextGroup();
    if (!group) {
      alert("Alle Gruppen voll!");
      setIsDrawing(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 1200));
    setTargetGroup(group);
    await new Promise((r) => setTimeout(r, 600));

    setGroups((prev: any) => ({ ...prev, [group]: [...prev[group], team] }));
    await supabase.from("group_assignments").insert({ tournament_id: selectedTournament, team_id: team.id, group_name: group });

    setRevealedTeam(null);
    setTargetGroup(null);
    setLastGroup(group);
    setTimeout(() => setLastGroup(null), 1000);
    setDrawIndex((prev) => prev + 1);
    setIsDrawing(false);
  };

  const finishDraw = async () => {
    setFinished(true);
    await supabase.from("tournaments").update({ draw_finished: true }).eq("id", selectedTournament);
  };

  if (!mounted || loadingAuth) {
    return (
      <div className="h-screen flex items-center justify-center text-white font-medium">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!authorized) {
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

  const progress = shuffled.length > 0 ? (drawIndex / shuffled.length) * 100 : 0;
  const isAllDrawn = shuffled.length > 0 && drawIndex >= shuffled.length;

  return (
    <main className="min-h-screen text-white flex flex-col items-center justify-start pt-12 px-4 md:px-10 overflow-hidden w-full mt-[-64px] sm:mt-[-80px]">
      
      {!drawStarted && (
        <div className="flex flex-col items-center w-full relative pt-8">
          
          <h1 className="text-3xl md:text-5xl font-black mb-8 md:mb-10 tracking-tight text-white text-center">🎰 Auslosung 🎰</h1>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12 w-full max-w-4xl mx-auto">
            {tournaments.map((t) => (
              <div key={t.id} onClick={() => setSelectedTournament(t.id)} className={`w-full max-w-[320px] group relative p-6 rounded-2xl border transition-all cursor-pointer ${tournaments.length === 1 ? "md:max-w-[384px]" : ""} ${selectedTournament === t.id ? "bg-yellow-500 text-black border-yellow-500 scale-105 shadow-xl shadow-yellow-500/20" : "bg-[#111] border-white/10 hover:border-yellow-500/40 hover:scale-105"}`}>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-yellow-500/5 blur-xl" />
                <div className="relative z-10 text-center">
                  <h3 className="text-lg md:text-xl font-bold mb-1">{t.name}</h3>
                  <div className="text-xs font-semibold mb-4 opacity-80">{t.max_teams || "∞"} Teams</div>
                  <div className="flex justify-center mb-4 text-xs font-bold">{t.draw_finished ? "✅ Ausgelost" : "Bereit zur Auslosung"}</div>
                  <div className="mt-4 text-xs font-medium opacity-70">Gruppen: {t.group_count || 2} • Gruppengröße: {t.group_size || 4}</div>
                </div>
              </div>
            ))}
          </div>

          {tournaments.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6 w-full max-w-md mx-auto">
              <button disabled={!selectedTournament} onClick={startDraw} className="w-full sm:w-auto bg-yellow-500 text-black px-8 py-4 rounded-xl font-bold hover:bg-yellow-400 transition shadow-lg disabled:opacity-30">🎲 Live starten</button>
              <button disabled={!selectedTournament} onClick={quickDraw} className="w-full sm:w-auto bg-white/10 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition disabled:opacity-30">⚡ Quick Draw</button>
            </div>
          )}
        </div>
      )}

      {drawStarted && (
        <div className="w-full flex flex-col items-center pt-8">
          <div className="w-full flex flex-col md:flex-row justify-between items-center mb-6 max-w-7xl gap-4">
            <button onClick={resetDraw} className="bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition text-sm w-full md:w-auto text-center order-2 md:order-1">← Zurück</button>
            <h1 className="text-2xl md:text-3xl font-black tracking-wide text-center order-1 md:order-2">🎰 Auslosung</h1>
            <div className="hidden md:block w-[88px] order-3"></div>
          </div>

          <div className="flex flex-col items-center w-full max-w-7xl">
            <div className={`text-xs md:text-sm mb-1 font-bold tracking-widest text-center transition-colors duration-500 ${isAllDrawn ? "text-green-400" : "text-yellow-400"}`}>
              TEAMS AUSGELOST: {drawIndex} / {shuffled.length}
            </div>
            
            <div className="w-full max-w-[500px] bg-white/10 h-2 rounded-full mb-8 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${isAllDrawn ? "bg-green-500" : "bg-yellow-500"}`} 
                style={{ width: `${progress}%` }} 
              />
            </div>

            {drawIndex < shuffled.length && (
              <div className="min-h-[6rem] md:min-h-[8rem] flex items-center justify-center mb-10 w-full px-2">
                {revealedTeam ? (
                  <div className="flex items-center justify-center gap-4 md:gap-6 w-full max-w-[500px] md:max-w-[600px] px-6 md:px-10 py-4 rounded-2xl bg-yellow-500 text-black font-bold text-3xl md:text-4xl shadow-[0_0_40px_rgba(255,200,0,0.4)] animate-fadeIn">
                    <img src={getTierImage(revealedTeam.level)} alt="Rank" className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-xl shrink-0" />
                    <span className="whitespace-nowrap tracking-tight">{revealedTeam.teamname}</span>
                  </div>
                ) : displayTeam ? (
                  <div className="flex items-center justify-center gap-4 md:gap-6 w-full max-w-[500px] md:max-w-[600px] bg-yellow-500/10 border-2 border-yellow-400 px-6 md:px-10 py-4 rounded-2xl text-3xl md:text-4xl font-bold text-yellow-400 animate-pulse">
                    <img src={getTierImage(displayTeam.level)} alt="Rank" className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-lg opacity-90 shrink-0" />
                    <span className="whitespace-nowrap tracking-tight">{displayTeam.teamname}</span>
                  </div>
                ) : (
                  <div className="h-[6rem] md:h-[8rem]"></div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 justify-center w-full mb-10">
              {groupNames.map((group) => (
                <div key={group} className={`p-4 rounded-2xl w-full max-w-[280px] md:max-w-[300px] mx-auto flex flex-col transition-all duration-300 border ${targetGroup === group || lastGroup === group ? "border-yellow-400 shadow-[0_0_30px_rgba(255,200,0,0.5)] scale-105 bg-yellow-500/10" : "bg-[#111] border-white/10 shadow-lg"}`}>
                  <h2 className={`font-bold text-lg md:text-xl mb-3 border-b border-white/10 pb-2 text-center ${targetGroup === group || lastGroup === group ? "text-yellow-300" : "text-yellow-400"}`}>GRUPPE {group}</h2>
                  <div className="flex flex-col gap-2 mt-2 max-h-[250px] md:max-h-[300px] overflow-y-auto pr-1">
                    {groups[group]?.length === 0 && <div className="text-gray-600 text-sm text-center mt-4">WARTEN...</div>}
                    
                    {groups[group]?.map((team: any, index: number) => (
                      <div key={index} className={`h-[44px] shrink-0 flex items-center justify-start border rounded-lg px-3 gap-3 text-sm font-bold animate-fadeIn ${getTierColors(team.level)}`}>
                        <img src={getTierImage(team.level)} alt="Rank" className="w-7 h-7 md:w-8 md:h-8 object-contain drop-shadow-md shrink-0" />
                        <span className="whitespace-nowrap tracking-tight">{team.teamname}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 mb-10">
              {!finished ? (
                <button onClick={drawNext} disabled={isDrawing} className="bg-yellow-500 text-black px-8 md:px-12 py-4 md:py-5 rounded-2xl font-bold text-lg md:text-xl hover:bg-yellow-400 transition shadow-xl disabled:opacity-50 w-full sm:w-auto">
                  {drawIndex >= shuffled.length ? "Auslosung beenden" : "Nächstes Team"}
                </button>
              ) : (
                <div className="text-green-400 font-bold text-lg md:text-xl bg-green-500/10 px-6 md:px-10 py-3 md:py-4 rounded-xl border border-green-500/20 text-center w-full sm:w-auto mx-auto">✅ Auslosung abgeschlossen</div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}