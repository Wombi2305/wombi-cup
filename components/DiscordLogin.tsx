"use client";

import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
// 🔥 Unseren Hook importieren
import { useAuth } from "@/components/AuthProvider";

export default function DiscordLogin() {
  // 🔥 User und Loading aus dem globalen State holen
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wenn wir noch laden oder kein User da ist, machen wir nichts.
    if (loading || !user) return;

    const syncDiscordProfile = async () => {
      const discordId = user.user_metadata?.provider_id;

      if (discordId) {
        localStorage.setItem("discord_user_id", discordId);

        try {
          // 🚀 DATEN DIREKT VON DER API HOLEN
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
            id: user.id,
            discord_id: discordId,
            is_admin: isAdmin,
          });

          if (error) console.log("PROFILE UPSERT ERROR:", error);
        } catch (error) {
           console.error("Fehler beim Discord-Sync:", error);
        }
      }
    };

    // Die Funktion ausführen, sobald ein User erkannt wurde
    syncDiscordProfile();

  // 🔥 Der Effect feuert immer dann, wenn sich der user ändert (z.B. nach einem Login)
  }, [user, loading]);

  const login = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error("Login Error:", error);
  };

  // 🔥 Wenn der User da ist (oder wir noch laden), zeigen wir den Login-Button NICHT an.
  if (user || loading) return null;

  return (
    <button
      onClick={login}
      className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2 rounded-lg text-white font-medium flex justify-center items-center"
    >
      Login mit Discord
    </button>
  );
}