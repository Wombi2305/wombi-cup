"use client";

import { useState } from "react";
import Link from "next/link";
import DiscordLogin from "@/components/DiscordLogin";
import AccountMenu from "@/components/AccountMenu";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    // 🔥 FIX: z-[100] zwingt die Navbar über absolut jeden anderen Inhalt
    <nav className="fixed top-0 left-0 w-full z-[100] bg-black/80 backdrop-blur-lg border-b border-yellow-500/10 pointer-events-auto">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        <Link href="/" className="text-yellow-400 font-bold tracking-wider uppercase relative z-10">
          WOMBI CUP
        </Link>

        {/* DESKTOP LINKS */}
        <div className="hidden md:flex items-center gap-6 text-sm text-white/80">
          <Link href="/anmelden" className="hover:text-yellow-400 transition">Turniere</Link>
          <Link href="/tabelle" className="hover:text-yellow-400 transition">Gruppen</Link>
          {/* 🔥 NEUER LINK: K.O. Phase */}
          <Link href="/kophase" className="hover:text-yellow-400 transition font-medium text-yellow-500/90">K.O. Phase</Link>
          <Link href="/ranking" className="hover:text-yellow-400 transition">Ranking</Link>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="hidden md:flex items-center gap-3">
            <AccountMenu />
            <DiscordLogin />
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-white text-3xl focus:outline-none p-2 -mr-2"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-yellow-500/10 px-6 py-6 space-y-6 shadow-2xl h-screen overflow-y-auto pb-32">
          <Link href="/anmelden" className="block text-lg font-medium text-white/90 hover:text-yellow-400" onClick={() => setOpen(false)}>
            Turniere
          </Link>
          <Link href="/tabelle" className="block text-lg font-medium text-white/90 hover:text-yellow-400" onClick={() => setOpen(false)}>
            Gruppen
          </Link>
          {/* 🔥 NEUER LINK MOBIL: K.O. Phase */}
          <Link href="/kophase" className="block text-lg font-medium text-yellow-400 hover:text-yellow-300" onClick={() => setOpen(false)}>
            K.O. Phase
          </Link>
          <Link href="/ranking" className="block text-lg font-medium text-white/90 hover:text-yellow-400" onClick={() => setOpen(false)}>
            Ranking
          </Link>

          <div className="pt-6 border-t border-white/10 flex flex-col gap-4">
            <AccountMenu />
            <DiscordLogin />
          </div>
        </div>
      )}
    </nav>
  );
}