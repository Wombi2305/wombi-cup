"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function DiscordLogin() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(data.user);
      const discordId = data.user.user_metadata?.provider_id;

      if (discordId) {
        localStorage.setItem("discord_user_id", discordId);
        try {
          await fetch(`/api/discord/member?userId=${discordId}`);
        } catch (err) {
          console.error("Fehler beim Abrufen der Discord-Daten:", err);
        }
      }
      setLoading(false);
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser?.user_metadata?.provider_id) {
          localStorage.setItem("discord_user_id", sessionUser.user_metadata.provider_id);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    try {
      // Dynamische Redirect-URL erstellen, damit der User nach Login auf der aktuellen Seite bleibt
      const origin = window.location.origin;
      const currentPath = window.location.pathname + window.location.search;
      const redirectUrl = `${origin}/auth/callback?next=${encodeURIComponent(currentPath)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  // Wenn geladen wird oder User eingeloggt ist, rendern wir nichts (Navbar zeigt dann das AccountMenu)
  if (loading || user) return null;

  return (
    <button
      onClick={login}
      className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_15px_rgba(88,101,242,0.3)] hover:shadow-[0_0_25px_rgba(88,101,242,0.5)] hover:-translate-y-0.5"
    >
      Mit Discord Login
    </button>
  );
}