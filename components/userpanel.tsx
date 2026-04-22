"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UserPanel() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    getUser();
  }, []);

  if (!user) return null;

  return (
    <div className="flex w-full md:w-auto items-center justify-center md:justify-start gap-3 bg-black/40 px-4 py-2 rounded-lg border border-white/5">
      <img
        src={user.user_metadata?.avatar_url || "/default-avatar.png"}
        alt={`${user.user_metadata?.full_name || "User"} Avatar`}
        className="w-8 h-8 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
      <span className="text-sm font-semibold text-white/90">
        {user.user_metadata?.full_name || "Spieler"}
      </span>
    </div>
  );
}