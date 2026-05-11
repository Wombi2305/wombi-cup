"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

export default function AccountMenu() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNickname(localStorage.getItem("discord_nickname"));
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const userId = localStorage.getItem("discord_user_id");
      if (!userId) return;
      try {
        const res = await fetch(`/api/discord/member?userId=${userId}`);
        const data = await res.json();
        if (data.roles) setUserRoles(data.roles);
        if (data.nick) {
          setNickname(data.nick);
          localStorage.setItem("discord_nickname", data.nick);
        }
      } catch (error) {
        console.error("Fehler:", error);
      }
    };
    fetchUserData();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const isAdmin = userRoles.includes("1492478735444873398");
  const isStreamer = userRoles.includes("1493976124173062195");

  return (
    <div className="relative w-full md:w-auto" ref={menuRef}>
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center md:justify-start gap-3 md:gap-2 cursor-pointer group w-full px-4 py-2 md:p-0 bg-white/5 md:bg-transparent rounded-lg md:rounded-none hover:bg-white/10 md:hover:bg-transparent transition-colors"
      >
        <img src={user.user_metadata?.avatar_url} className="w-8 h-8 rounded-full border border-yellow-500/10" alt="Avatar" />
        <span className="text-white/90 font-medium group-hover:text-yellow-400">{nickname || user.user_metadata?.name}</span>
      </div>

      {open && (
        <div className="md:absolute md:right-0 md:top-full mt-2 md:mt-4 w-full md:w-56 bg-black/95 backdrop-blur-xl border border-yellow-500/10 rounded-xl shadow-2xl overflow-hidden py-1 z-[100]">
          {/* Diese Links erscheinen NUR auf dem PC (md:block) */}
          <Link href="/profil" onClick={() => setOpen(false)} className="hidden md:block px-4 py-2 text-white/90 hover:text-yellow-400 hover:bg-white/5 transition">
            Profil
          </Link>
          <Link href="/meine-teams" onClick={() => setOpen(false)} className="hidden md:block px-4 py-2 text-white/90 hover:text-yellow-400 hover:bg-white/5 transition">
            Meine Teams
          </Link>

          {(isAdmin || isStreamer) && (
            <div className="hidden md:block border-t border-white/5 my-1" />
          )}

          {(isAdmin || isStreamer) && (
            <Link href="/draw" onClick={() => setOpen(false)} className="hidden md:block px-4 py-2 text-purple-400 hover:bg-purple-500/10">
              🎰 Auslosung
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className="hidden md:block px-4 py-2 text-blue-400 hover:bg-blue-500/10">
              👑 Admin Panel
            </Link>
          )}

          <div className="border-t border-white/5 my-1" />
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="block w-full text-center md:text-left px-4 py-3 md:py-2 text-red-400 hover:bg-red-500/10 transition">
            Logout
          </button>
        </div>
      )}
    </div>
  );
}