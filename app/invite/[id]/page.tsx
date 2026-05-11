"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 🔥 XP-KURVE HELPER
const getRequiredXpForLevel = (level: number) => {
  if (level < 11) return Math.floor(50 + (level - 1) * (70 / 9)); 
  if (level < 21) return Math.floor(130 + (level - 11) * (70 / 9));
  if (level < 36) return Math.floor(210 + (level - 21) * (110 / 14));
  if (level < 46) return Math.floor(330 + (level - 36) * (120 / 9));
  if (level === 46) return 500;
  if (level === 47) return 550;
  if (level === 48) return 600;
  if (level === 49) return 650;
  return 700;
};

// 🔥 SCHLANKE LOGIK FÜR STATS
const getTeamStatsUI = (team: any) => {
  if (!team) return { level: 1, totalXp: 0, progress: 0, currentLevelXp: 0, requiredLevelXp: 50, tierImage: "/Bronze.png" };

  const totalXp = team.total_xp || 0;
  const level = team.level || 1;

  let xpForPreviousLevels = 0;
  for (let i = 1; i < level; i++) {
    xpForPreviousLevels += getRequiredXpForLevel(i);
  }

  const currentLevelXp = Math.max(0, totalXp - xpForPreviousLevels);
  const requiredLevelXp = getRequiredXpForLevel(level);
  const progress = level === 50 ? 100 : Math.min(100, Math.max(0, (currentLevelXp / requiredLevelXp) * 100));

  let tierImage = "/Bronze.png";
  if (level >= 45) tierImage = "/Prisma.png";
  else if (level >= 40) tierImage = "/Amethyst.png";
  else if (level >= 35) tierImage = "/Sapphire.png";
  else if (level >= 30) tierImage = "/Emerald.png";
  else if (level >= 25) tierImage = "/Ruby.png";
  else if (level >= 20) tierImage = "/Gold.png";
  else if (level >= 10) tierImage = "/Silber.png";

  return { level, totalXp, progress, currentLevelXp, requiredLevelXp, tierImage };
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [team, setTeam] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<"checking" | "not_logged_in" | "already_member" | "is_captain" | "can_join">("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchInviteData = async () => {
      const teamId = params.id as string;
      if (!teamId) {
        setLoading(false);
        return;
      }

      // 1. Hole Team Daten
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (teamError || !teamData) {
        setLoading(false);
        return;
      }
      setTeam(teamData);

      // 2. Check Login Status
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData.user;
      
      if (!currentUser) {
        setStatus("not_logged_in");
        setLoading(false);
        return;
      }
      setUser(currentUser);

      // 3. Hole Profile Daten
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();
        
      if (profileData) setProfile(profileData);

      // 4. Prüfe, ob User der Captain ist
      if (teamData.user_id === currentUser.id) {
        setStatus("is_captain");
        setLoading(false);
        return;
      }

      // 5. Prüfe, ob User schon im Team ist
      const { data: memberData } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", teamId)
        .eq("user_id", currentUser.id)
        .single();

      if (memberData) {
        setStatus("already_member");
      } else {
        setStatus("can_join");
      }

      setLoading(false);
    };

    fetchInviteData();
  }, [params.id]);

  // 🚀 DIREKTER LOGIN FÜR DIE EINLADUNGSSEITE
  const handleDiscordLogin = async () => {
    setJoining(true); // Verhindert Spam-Klicks
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          // Nach dem Login direkt wieder auf diese Einladungsseite umleiten
          redirectTo: `${window.location.origin}/invite/${params.id}`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage(`❌ Login Fehler: ${error.message}`);
      setJoining(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!team || !user) return;
    setJoining(true);

    try {
      const { error } = await supabase
        .from('team_members')
        .insert([{ team_id: team.id, user_id: user.id, role: 'spieler' }]);

      if (error) {
        if (error.code === '23505') {
          setStatus("already_member");
          throw new Error("Du bist bereits in diesem Team.");
        } else {
          throw error;
        }
      }

      setStatus("already_member");
      setMessage(`🎉 Du bist dem Team ${team.teamname} beigetreten!`);
    } catch (error: any) {
      setMessage(`❌ Fehler: ${error.message || "Beitritt fehlgeschlagen"}`);
    } finally {
      setJoining(false);
    }
  };

  const teamStats = useMemo(() => getTeamStatsUI(team), [team]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-white px-4">
        <h2 className="text-3xl font-black mb-2 text-red-500">Team nicht gefunden</h2>
        <p className="text-gray-400 text-center max-w-md">Der Einladungslink ist ungültig oder das Team wurde gelöscht.</p>
        <button onClick={() => router.push('/')} className="mt-8 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-bold transition-colors">Zur Startseite</button>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 py-12 flex flex-col items-center justify-center text-white relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none z-0 opacity-50"></div>

      {/* Hauptkarte - Mit Glassmorphism aus dem Original-Code */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl flex flex-col items-center text-center w-full max-w-lg relative z-10 transform-gpu animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6 z-10 relative">Teameinladung</h3>
        
        {/* ZENTRALER BEREICH */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-6 w-full z-10 relative mt-4">
          {/* Kleines Profilbild links */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/20 shadow-[0_0_15px_rgba(250,204,21,0.2)] bg-black/50 overflow-hidden flex items-center justify-center shrink-0 relative">
            {team.logo_url ? (
              <img src={team.logo_url} alt="Team Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">🛡️</span>
            )}
            <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none"></div>
          </div>

          {/* Großes Emblem in der Mitte */}
          <div className="flex-grow flex items-center justify-center relative px-2">
            <img src={teamStats.tierImage} alt="Rang Emblem" className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] z-10 relative" />
            {/* Glimmer-Effekt */}
            <div className="absolute inset-0 bg-yellow-500/10 rounded-full blur-[20px] scale-125 z-0"></div>
          </div>

          {/* Level-Box rechts */}
          <div className="bg-white/5 border border-white/10 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center shrink-0 w-20 sm:w-24 shadow-inner">
            <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-1 text-center leading-tight">Team<br/>Level</span>
            <span className="text-3xl sm:text-4xl font-black text-white">{teamStats.level}</span>
          </div>
        </div>

        {/* Teamname und Text darunter */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 z-10 relative">{team.teamname}</h1>
        <p className="text-gray-400 mb-8 text-sm sm:text-base px-2 z-10 relative">
          Du wurdest eingeladen, dem Team von <strong className="text-white">{team.captain}</strong> beizutreten.
        </p>

        {/* Statistik-Raster (abgespeckt) */}
        <div className="grid grid-cols-2 gap-4 w-full mb-8 z-10 relative">
          {/* Dunkle Box für Events */}
          <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col items-center relative overflow-hidden shadow-inner">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
            <span className="text-3xl font-black text-purple-400 mb-1 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              {team.participations || 0}
            </span>
            <span className="text-gray-500 text-[9px] uppercase tracking-widest font-semibold">Events</span>
          </div>

          {/* Dunkle Box für Siege */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl flex flex-col items-center relative overflow-hidden shadow-[0_0_15px_rgba(250,204,21,0.05)]">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
            <span className="text-3xl font-black text-yellow-400 mb-1 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">
              {team.wins_top1 || 0}
            </span>
            <span className="text-gray-500 text-[9px] uppercase tracking-widest font-semibold">Siege</span>
          </div>
        </div>

        {message && (
          <div className={`w-full px-4 py-3 rounded-xl text-sm font-bold mb-6 animate-in zoom-in-95 z-10 relative ${message.includes('Fehler') ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'}`}>
            {message}
          </div>
        )}

        {/* AKTIONEN */}
        <div className="w-full space-y-4 z-10 relative">
          
          {/* 🔴 GEÄNDERT: Login mit Discord Funktion direkt eingebaut */}
          {status === "not_logged_in" && (
            <div className="bg-black/40 border border-white/10 p-5 rounded-2xl flex flex-col items-center shadow-inner">
              <p className="text-gray-300 text-sm font-medium mb-4">Du musst eingeloggt sein, um dem Team beizutreten.</p>
              <button 
                onClick={handleDiscordLogin} 
                disabled={joining}
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3.5 px-6 rounded-xl transition-colors disabled:opacity-50"
              >
                {joining ? "Wird geladen..." : "Mit Discord einloggen"}
              </button>
            </div>
          )}

          {status === "is_captain" && (
            <div className="bg-black/40 border border-white/10 p-5 rounded-2xl flex flex-col items-center shadow-inner">
              <p className="text-gray-400 text-sm font-medium mb-4">Du bist der Captain dieses Teams. Du kannst dich nicht selbst einladen.</p>
              <button onClick={() => router.push('/meine-teams')} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 px-6 rounded-xl transition-colors">
                Zurück zu meinen Teams
              </button>
            </div>
          )}

          {status === "already_member" && (
            <div className="bg-black/40 border border-white/10 p-5 rounded-2xl flex flex-col items-center shadow-inner">
              <p className="text-gray-300 text-sm font-medium mb-4">Du bist bereits Mitglied in diesem Team!</p>
              <button onClick={() => router.push('/meine-teams')} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 px-6 rounded-xl transition-colors">
                Meine Teams ansehen
              </button>
            </div>
          )}

          {status === "can_join" && (
            <button 
              onClick={handleJoinTeam} 
              disabled={joining} 
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black font-black uppercase tracking-widest py-4 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] hover:-translate-y-0.5 disabled:opacity-50"
            >
              {joining ? "Wird beigetreten..." : "Team beitreten"}
            </button>
          )}
        </div>

      </div>
    </main>
  );
}