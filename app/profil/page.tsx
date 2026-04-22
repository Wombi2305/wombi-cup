"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
// 🔥 NEU: Die magische Next.js Image Komponente
import Image from "next/image";

import { useAuth } from "@/components/AuthProvider";

export default function ProfilPage() {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [myTeam, setMyTeam] = useState<any>(null);
  
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Formular States
  const [teamname, setTeamname] = useState("");
  const [captain, setCaptain] = useState("");

  const TEAMVM_ROLE = process.env.NEXT_PUBLIC_TEAMVM_ROLE_ID || "1492462340787011624";
  const ORGA_ROLE = "1492478735444873398";
  const SPIELER_ROLE = "1491812561119875154";
  const FREEAGENT_ROLE = "1492462347967664198";

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsDataLoading(false);
      return;
    }

    const fetchData = async () => {
      const discordId = user.user_metadata?.provider_id;
      if (discordId) {
        try {
          const res = await fetch(`/api/discord/member?userId=${discordId}`);
          const data = await res.json();
          if (data.roles) setUserRoles(data.roles);
        } catch (err) {
          console.error("Fehler beim Discord Fetch", err);
        }
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
        
      if (profileData) setProfile(profileData);

      const { data: teamData } = await supabase
        .from("teams")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (teamData) {
        setMyTeam(teamData);
        setTeamname(teamData.teamname || "");
        setCaptain(teamData.captain || "");
      }

      setIsDataLoading(false);
    };

    fetchData();
  }, [user, authLoading]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamname.trim()) return showMessage("❌ Teamname darf nicht leer sein");

    setSaving(true);

    try {
      if (myTeam) {
        const { error } = await supabase
          .from("teams")
          .update({ teamname, captain })
          .eq("id", myTeam.id);

        if (error) throw error;
        showMessage("✅ Team erfolgreich aktualisiert!");
      } else {
        const { data: newTeam, error } = await supabase
          .from("teams")
          .insert([{ teamname, captain, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;
        setMyTeam(newTeam);
        showMessage("✅ Team erfolgreich erstellt!");
      }
    } catch (err: any) {
      console.error(err);
      showMessage("❌ Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || isDataLoading) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-2">Nicht eingeloggt</h2>
        <p className="text-gray-400">Bitte logge dich über Discord ein, um dein Profil zu sehen.</p>
      </div>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url || "/default-avatar.png";
  const discordName = user.user_metadata?.full_name || "Discord User";

  const isTeamVM = userRoles.includes(TEAMVM_ROLE);
  const isOrga = userRoles.includes(ORGA_ROLE);
  const isSpieler = userRoles.includes(SPIELER_ROLE);
  const isFreeAgent = userRoles.includes(FREEAGENT_ROLE);

  const hasFormAccess = isTeamVM || isOrga;
  const hasPlayerRole = isSpieler || isFreeAgent;

  return (
    <main className="min-h-[calc(100vh-100px)] px-4 sm:px-6 pt-24 md:pt-28 pb-8 w-full max-w-5xl mx-auto text-white">
      <h1 className="text-3xl md:text-4xl font-black mb-8 tracking-tight drop-shadow-md">
        Mein <span className="text-yellow-500">Profil</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        
        {/* --- LINKER BEREICH: DISCORD INFO --- */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col items-center text-center h-fit">
          <img 
            src={avatarUrl} 
            alt="Avatar" 
            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-2 border-yellow-500/50 mb-4 shadow-lg shadow-yellow-500/20"
            referrerPolicy="no-referrer"
          />
          <h2 className="text-xl font-bold mb-4">{discordName}</h2>
          
          <div className="flex flex-wrap gap-2 justify-center">
            {profile?.role === "orga" && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">👑 Orga</span>
            )}
            {profile?.role === "streamer" && (
              <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">🎥 Streamer</span>
            )}
            {profile?.role === "teamvm" && (
              <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">🛡️ TeamVM</span>
            )}
            {profile?.role === "freeagent" && (
              <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">🔍 Free Agent</span>
            )}
            {profile?.role === "spieler" && (
              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">🎮 Spieler</span>
            )}
          </div>
        </div>

        {/* --- RECHTER BEREICH: DYNAMISCHE ANSICHT --- */}
        <div className="md:col-span-2">
          
          {hasFormAccess ? (
            /* ZUSTAND 1: TEAM-VM ODER ORGA -> FORMULAR ZEIGEN */
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl h-full">
              <h3 className="text-xl font-bold mb-2 text-yellow-400">Mein Haupt-Team</h3>
              <p className="text-gray-400 text-sm mb-6">
                Dieses Team wird für alle deine zukünftigen Turnier-Anmeldungen verwendet. Wenn du den Namen hier änderst, aktualisiert er sich für alle laufenden Turniere.
              </p>

              <form onSubmit={handleSaveTeam} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2 ml-1">Teamname</label>
                  <input 
                    type="text" 
                    value={teamname}
                    onChange={(e) => setTeamname(e.target.value)}
                    placeholder="Dein Teamname"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition"
                  />
                </div>
                
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2 ml-1">Captain (Ingame Name)</label>
                  <input 
                    type="text" 
                    value={captain}
                    onChange={(e) => setCaptain(e.target.value)}
                    placeholder="Riot ID / Captain Name"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={saving}
                  className="mt-2 w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl transition shadow-lg shadow-yellow-500/20 disabled:opacity-50"
                >
                  {saving ? "Speichern..." : "Änderungen speichern"}
                </button>
              </form>
            </div>

          ) : hasPlayerRole ? (
            /* ZUSTAND 2: SPIELER / FREE AGENT -> IN ARBEIT KARTE MIT BILD */
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-10 shadow-xl flex flex-col items-center justify-center text-center h-full relative overflow-hidden">
              
              <div className="w-full max-w-sm mb-6 relative rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10 group cursor-pointer">
                {/* 🔥 HIER IST DIE MAGIE: Next.js Image mit priority! */}
                <Image 
                  src="/Spieleranalys.png" 
                  alt="Teaser Spieleranalyse"
                  width={600}
                  height={400}
                  priority // 🔥 Das lädt das Bild vorab!
                  className="w-full h-auto object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-80"></div>
              </div>

              <h3 className="text-2xl font-bold mb-3 text-white flex items-center justify-center gap-2">
                <span>🚧</span> Profil in Arbeit <span>🚧</span>
              </h3>
              <p className="text-gray-400 mb-8 max-w-md text-sm md:text-base leading-relaxed">
                Als Spieler oder Free Agent kannst du hier bald deine <strong>persönlichen Statistiken</strong> einsehen und nach passenden Teams suchen. Stay tuned!
              </p>
              
              <button 
                disabled
                className="bg-white/5 border border-white/10 text-gray-500 font-bold py-3.5 px-8 rounded-xl cursor-not-allowed w-full sm:w-auto"
              >
                Demnächst verfügbar
              </button>
            </div>

          ) : (
            /* ZUSTAND 3: KEINE ROLLE ODER NICHT AUF SERVER -> DISCORD INVITE */
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-10 shadow-xl flex flex-col items-center justify-center text-center h-full">
              <div className="text-6xl mb-6">👋</div>
              <h3 className="text-2xl font-bold mb-3 text-white">Fast geschafft!</h3>
              <p className="text-gray-400 mb-8 max-w-md text-sm md:text-base leading-relaxed">
                Um alle Funktionen der Website nutzen zu können, musst du auf unserem Discord sein. <br/><br/>
                Bitte tritt dem Server bei und hole dir im Kanal <strong>#beitreten</strong> eine Rolle (z.B. Spieler, Free Agent oder TeamVM).
              </p>
              
              <a 
                href="https://discord.gg/2QsPJ6r5" 
                target="_blank" 
                rel="noreferrer"
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3.5 px-8 rounded-xl transition shadow-lg shadow-[#5865F2]/20 flex items-center justify-center gap-3 w-full sm:w-auto"
              >
                <span>💬</span> Jetzt dem WombiCup Discord beitreten
              </a>
            </div>
          )}

        </div>
      </div>

      {message && (
        <div className="fixed top-20 right-4 sm:right-6 bg-black/80 text-white px-6 py-3 rounded-lg shadow-2xl z-50 animate-in fade-in border border-white/10 backdrop-blur-md">
          {message}
        </div>
      )}
    </main>
  );
}