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

        // 🚀 NEU: DATEN DIREKT VON DER API HOLEN
        const res = await fetch(`/api/discord/member?userId=${discordId}`);
        const discordData = await res.json();

        console.log("DISCORD DATA:", discordData);

        // 👉 NUR NOCH discordData.roles NUTZEN
        const roles = discordData?.roles || [];
        console.log("ROLES FROM API:", roles);

        // Check gegen die spezifische Orga-ID
        const isAdmin = roles.some((r: any) => String(r) === "1492478735444873398");
        console.log("IS ADMIN:", isAdmin);

        // Profile Upsert mit den API-Daten
        const { error } = await supabase.from("profiles").upsert({
          id: data.user.id,
          discord_id: discordId,
          is_admin: isAdmin,
        });

        if (error) console.log("PROFILE UPSERT ERROR:", error);
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