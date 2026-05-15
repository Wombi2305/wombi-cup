"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DiscordLogin from "@/components/DiscordLogin";
import AccountMenu from "@/components/AccountMenu";

const MAIN_LINKS = [
  { name: "Turniere", href: "/anmelden" },
  { name: "Gruppen", href: "/tabelle" },
  { name: "K.O. Phase", href: "/kophase" },
  { name: "Ranking", href: "/ranking" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  
  // Auth & Roles States (Wird für das mobile Menü gebraucht)
  const [user, setUser] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      
      const discordId = data?.user?.user_metadata?.provider_id || localStorage.getItem("discord_user_id");
      if (discordId) {
        try {
          const res = await fetch(`/api/discord/member?userId=${discordId}`);
          if (res.ok) {
            const discordData = await res.json();
            if (discordData.roles) setUserRoles(discordData.roles);
          }
        } catch (error) {
          console.error("Fehler beim Laden der Rollen in Navbar:", error);
        }
      }
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const ORGA_ROLE = "1492478735444873398";
  const STREAMER_ROLE = "1493976124173062195";
  const isAdmin = userRoles.includes(ORGA_ROLE);
  const canSeeDraw = isAdmin || userRoles.includes(STREAMER_ROLE);

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] bg-black/70 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.1)] pointer-events-auto transition-all">
      <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* 1. LINKS: LOGO */}
        <div className="flex-1 flex items-center justify-start">
          <Link href="/" className="group flex items-center gap-3 relative z-10 outline-none">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40 group-hover:scale-105 transition-all duration-300">
              <svg className="w-5 h-5 text-black drop-shadow-sm" fill="currentColor" viewBox="0 0 256 256">
                <path d="M232,56H200V40a16,16,0,0,0-16-16H72A16,16,0,0,0,56,40V56H24A16,16,0,0,0,8,72v24a64.07,64.07,0,0,0,64,64h4.15A56.12,56.12,0,0,0,120,206.51V224H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V206.51A56.12,56.12,0,0,0,179.85,160H184a64.07,64.07,0,0,0,64-64V72A16,16,0,0,0,232,56ZM72,144a40,40,0,0,1-37.49-26.06A47.88,47.88,0,0,1,24,96V72H56ZM232,96a47.88,47.88,0,0,1-10.51,21.94A40,40,0,0,1,184,144h-4.15a56,56,0,0,0,0-88H200V72h32Z"></path>
              </svg>
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-black tracking-widest text-white drop-shadow-md transition-colors group-hover:text-gray-100">
                WOMBI<span className="text-yellow-400">CUP</span>
              </span>
              <span className="text-[0.65rem] font-bold tracking-[0.2em] text-white/50 uppercase">
                Tournament
              </span>
            </div>
          </Link>
        </div>

        {/* 2. MITTE: DESKTOP NAVIGATION */}
        <div className="hidden lg:flex flex-auto items-center justify-center">
          <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-full border border-white/10 overflow-hidden">
            {MAIN_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 xl:px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-b from-yellow-500/20 to-yellow-500/5 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.15)] border border-yellow-500/30"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 3. RECHTS: PROFIL & MOBILE BUTTON */}
        <div className="flex-1 flex items-center justify-end gap-4 relative z-10">
          <div className="hidden md:flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <AccountMenu />
            {user ? null : (
              <>
                <div className="w-px h-6 bg-white/10"></div>
                <DiscordLogin />
              </>
            )}
          </div>

          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Menü umschalten"
            className="lg:hidden relative w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white focus:outline-none hover:bg-white/20 transition-colors"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-2xl border-t border-white/10 px-6 py-8 h-[calc(100dvh-5rem)] overflow-y-auto flex flex-col gap-6 shadow-2xl pb-12">
          
          <div className="flex flex-col gap-2">
            {MAIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center px-4 py-4 rounded-xl text-lg font-medium transition-all ${pathname === link.href ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "text-white/80 hover:bg-white/5 hover:text-white"}`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {user && (
            <>
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />
              <div className="flex flex-col gap-2">
                <span className="px-4 text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Dashboard</span>
                
                <Link href="/profil" onClick={() => setOpen(false)} className={`flex items-center px-4 py-3 rounded-xl text-md font-medium transition-all ${pathname === "/profil" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "text-white/80 hover:bg-white/5 hover:text-white"}`}>
                  Profil
                </Link>
                <Link href="/meine-teams" onClick={() => setOpen(false)} className={`flex items-center px-4 py-3 rounded-xl text-md font-medium transition-all ${pathname === "/meine-teams" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "text-white/80 hover:bg-white/5 hover:text-white"}`}>
                  Meine Teams
                </Link>

                {canSeeDraw && (
                  <Link href="/draw" onClick={() => setOpen(false)} className="flex items-center px-4 py-3 rounded-xl text-md font-medium text-purple-400 hover:bg-purple-500/10 transition-all">
                    🎰 Auslosung
                  </Link>
                )}
                
                {isAdmin && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center px-4 py-3 rounded-xl text-md font-medium text-blue-400 hover:bg-blue-500/10 transition-all">
                    👑 Admin Panel
                  </Link>
                )}
              </div>
            </>
          )}

          <div className="pt-8 flex flex-col gap-4">
            <AccountMenu />
            {!user && <DiscordLogin />}
          </div>
        </div>
      )}
    </nav>
  );
}