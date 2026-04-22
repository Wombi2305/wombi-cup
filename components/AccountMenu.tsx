"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState, useRef } from "react"; // 🔥 useRef hinzugefügt
import Link from "next/link";

export default function AccountMenu() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  
  // State für die Rollen des Users
  const [userRoles, setUserRoles] = useState<string[]>([]);
  
  // 🔥 NEU: Referenz für das gesamte Menü (um Klicks außerhalb zu erkennen)
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNickname(localStorage.getItem("discord_nickname"));
  }, []);

  // Auth-Status von Supabase überwachen
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Discord Nickname UND Rollen laden
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      const userId = localStorage.getItem("discord_user_id");
      if (!userId) return;

      try {
        const res = await fetch(`/api/discord/member?userId=${userId}`);
        const data = await res.json();

        if (data.roles) {
          setUserRoles(data.roles);
        }

        if (data.nick) {
          setNickname(data.nick);
          localStorage.setItem("discord_nickname", data.nick);
        }
      } catch (error) {
        console.error("Fehler beim Laden der User-Daten:", error);
      }
    };

    fetchUserData();
  }, [user]);

  // 🔥 NEU: Event-Listener für den "Klick außerhalb"
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Wenn das Menü offen ist und der Klick NICHT innerhalb unseres menuRef stattfand
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false); // Menü schließen
      }
    };

    // Auf Klicks im gesamten Dokument lauschen
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      // Wichtig: Aufräumen, wenn die Komponente entfernt wird
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("discord_nickname");
    localStorage.removeItem("discord_user_id");
    setNickname(null);
    setUserRoles([]);
    setUser(null);
    setOpen(false);
    window.location.reload();
  };

  if (!user) return null;

  const avatar = user.user_metadata?.avatar_url || `https://cdn.discordapp.com/embed/avatars/0.png`;
  const name = nickname || user.user_metadata?.full_name || user.user_metadata?.name || user.email;

  // Rollen-Checks (IDs von deinen anderen Seiten)
  const ORGA_ROLE = "1492478735444873398";
  const STREAMER_ROLE = "1493976124173062195";

  const isAdmin = userRoles.includes(ORGA_ROLE);
  const canSeeDraw = isAdmin || userRoles.includes(STREAMER_ROLE);

  return (
    // 🔥 NEU: ref={menuRef} an den Haupt-Container gehängt
    <div className="relative w-full md:w-auto" ref={menuRef}>
      
      {/* USER BUTTON */}
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center md:justify-start gap-3 md:gap-2 cursor-pointer group w-full px-4 py-2 md:p-0 bg-white/5 md:bg-transparent rounded-lg md:rounded-none hover:bg-white/10 md:hover:bg-transparent transition-colors"
      >
        <img
          src={avatar}
          alt="User Avatar"
          className="w-8 h-8 rounded-full border border-yellow-500/10 group-hover:border-yellow-400/50 transition duration-300 object-cover"
          referrerPolicy="no-referrer"
        />
        <span className="text-white/90 font-medium group-hover:text-yellow-400 transition">
          {name}
        </span>
      </div>

      {/* DROPDOWN */}
      {open && (
        <div className="md:absolute md:right-0 md:top-full mt-2 md:mt-4 w-full md:w-56 bg-black/95 backdrop-blur-xl border border-yellow-500/10 rounded-xl shadow-[0_0_40px_rgba(255,200,0,0.2)] overflow-hidden py-1 z-[100]">
          
          <Link href="/profil" onClick={() => setOpen(false)} className="block w-full text-center md:text-left px-4 py-3 md:py-2 text-white/90 hover:text-yellow-400 hover:bg-white/5 transition">
            Profil
          </Link>
          
          {/* 🔥 GEÄNDERT: Von Button zu echtem Link umgebaut */}
          <Link href="/meine-teams" onClick={() => setOpen(false)} className="block w-full text-center md:text-left px-4 py-3 md:py-2 text-white/90 hover:text-yellow-400 hover:bg-white/5 transition">
            Meine Teams
          </Link>

          {/* SONDERBEREICH FÜR ORGA & STREAMER */}
          {(isAdmin || canSeeDraw) && (
            <div className="border-t border-yellow-500/20 my-1 mx-4 md:mx-0" />
          )}

          {canSeeDraw && (
            <Link 
              href="/draw" 
              onClick={() => setOpen(false)}
              className="block w-full text-center md:text-left px-4 py-3 md:py-2 text-purple-400/90 hover:text-purple-400 hover:bg-purple-500/10 transition font-medium"
            >
              🎰 Auslosung
            </Link>
          )}

          {isAdmin && (
            <Link 
              href="/admin" 
              onClick={() => setOpen(false)}
              className="block w-full text-center md:text-left px-4 py-3 md:py-2 text-blue-400/90 hover:text-blue-400 hover:bg-blue-500/10 transition font-medium"
            >
              👑 Admin Panel
            </Link>
          )}

          <div className="border-t border-yellow-500/10 my-1 mx-4 md:mx-0" />
          
          <button
            onClick={logout}
            className="block w-full text-center md:text-left px-4 py-3 md:py-2 text-red-400/90 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}