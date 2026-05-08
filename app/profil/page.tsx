"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfilPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData.user;
      
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setUser(currentUser);

      // Holt das Profil aus der Datenbank (inklusive der "role" Spalte)
      const { data: profileRes } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (profileRes) setProfile(profileRes);

      setLoading(false);
    };

    fetchData();
  }, []);

  const { avatarUrl, discordName, hasAccess } = useMemo(() => {
    if (!user) return { avatarUrl: "", discordName: "", hasAccess: false };

    // 🔥 NEU: Prüft einfach, ob das Datenbankfeld "role" ausgefüllt ist.
    // Wenn da z.B. "orga", "spieler" oder "teamvm" drin steht, ist es true.
    // Wenn es leer (null/undefined) ist, ist es false.
    const hasAnyRole = !!profile?.role;

    return {
      avatarUrl: user.user_metadata?.avatar_url || "/default-avatar.png",
      discordName: user.user_metadata?.full_name || "Discord User",
      hasAccess: hasAnyRole
    };
  }, [user, profile]);

  if (loading) return <div className="min-h-[calc(100vh-100px)] flex items-center justify-center text-white"><div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center text-white"><h2 className="text-2xl font-bold mb-2">Nicht eingeloggt</h2><p className="text-gray-400">Bitte logge dich über Discord ein.</p></div>;

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 pt-10 pb-8 w-full max-w-5xl mx-auto text-white flex flex-col">
      <h1 className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-lg mb-8 text-center md:text-left">
        Mein <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Profil</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* --- LINKE SPALTE: DISCORD INFO --- */}
        <div className="md:col-span-1 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative mb-4">
            <img src={avatarUrl} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-4 border-[#1a1a1a] shadow-[0_0_15px_rgba(250,204,21,0.3)] relative z-10" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500/50 scale-105"></div>
          </div>
          
          <h2 className="text-xl md:text-2xl font-bold mb-4 tracking-wide">{discordName}</h2>
          
          {/* Zeigt die Rolle basierend auf dem Datenbank-Eintrag an */}
          <div className="flex flex-col gap-2 w-full">
            {profile?.role === "orga" && <span className="w-full bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">👑 Orga</span>}
            {profile?.role === "teamvm" && <span className="w-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">🛡️ TeamVM</span>}
            {profile?.role === "spieler" && <span className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">🎮 Spieler</span>}
            {profile?.role === "freeagent" && <span className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">🔍 Free Agent</span>}
            {profile?.role === "teilnehmer" && <span className="w-full bg-gray-500/10 text-gray-400 border border-gray-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">🎮 Teilnehmer</span>}
            {profile?.role === "streamer" && <span className="w-full bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">🎥 Streamer</span>}
          </div>
        </div>

        {/* --- RECHTE SPALTE: SPIELER STATS (IN ARBEIT) ODER DISCORD JOIN --- */}
        <div className="md:col-span-2 h-full">
          {hasAccess ? (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center justify-center text-center h-full relative overflow-hidden min-h-[400px]">
              
              {/* 🔥 BILD CONTAINER (Ohne Zoom) 🔥 */}
              <div className="w-full max-w-lg mb-6 relative rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-white/5">
                <img src="/Spieleranalys.png" alt="Teaser Spieleranalyse" className="w-full h-auto object-cover opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90"></div>
                
                <div className="absolute bottom-4 left-0 w-full text-center z-10 px-4">
                  <h3 className="text-2xl md:text-3xl font-black text-white drop-shadow-md">🚧 Stats in Arbeit 🚧</h3>
                </div>
              </div>

              <p className="text-gray-400 max-w-md text-sm md:text-base leading-relaxed">
                Hier kannst du bald deine <strong className="text-white">persönlichen Statistiken</strong> einsehen, Main-Agents festlegen und nach passenden Teams suchen. Stay tuned!
              </p>
            </div>
          ) : (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="text-7xl mb-6 drop-shadow-lg animate-bounce">👋</div>
              <h3 className="text-3xl font-bold mb-3 text-white">Fast geschafft!</h3>
              <p className="text-gray-400 mb-8 max-w-md text-sm md:text-base leading-relaxed">
                Um alle Funktionen der Website nutzen zu können, musst du auf unserem Discord sein. <br/><br/>
                Bitte tritt dem Server bei und hole dir im Kanal <strong className="text-white bg-white/10 px-2 py-0.5 rounded">#beitreten</strong> eine Rolle.
              </p>
              <a href="https://discord.gg/2QsPJ6r5" target="_blank" rel="noreferrer" className="bg-[#5865F2] hover:bg-[#4752C4] hover:-translate-y-1 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(88,101,242,0.4)] flex items-center justify-center gap-3">
                Jetzt dem WombiCup Discord beitreten
              </a>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}