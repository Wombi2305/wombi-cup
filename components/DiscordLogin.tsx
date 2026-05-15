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
          // 🚀 DATEN DIREKT VON DER API HOLEN
          // Hinweis: Die API Route kümmert sich serverseitig bereits um den Upsert in die profiles Tabelle!
          // Wir rufen sie hier nur auf, um den Vorgang nach dem Login einmal anzustoßen.
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error("Login Error:", error);
  };

  // 🔥 Solange die Daten noch geladen werden, zeige gar nichts an.
  if (loading) return null;
  if (user) return null;

  return (
    <button
      onClick={login}
      className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2 rounded-lg text-white font-medium flex justify-center items-center"
    >
      Login mit Discord
    </button>
  );
}