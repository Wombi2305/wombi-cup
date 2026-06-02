"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function UserPanel() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    getUser();
  }, []);

  // Verhindert das Aufploppen: Zeigt einen unsichtbaren oder ladenden Platzhalter
  if (loading) {
    return <div className="h-12 w-32 animate-pulse bg-white/5 rounded-lg"></div>;
  }

  if (!user) return null;

  return (
    <div className="flex w-full md:w-auto items-center justify-center md:justify-start gap-3 bg-black/40 px-4 py-2 rounded-lg border border-white/5 shadow-md">
      <div className="relative w-8 h-8 rounded-full overflow-hidden">
        <Image
          src={user.user_metadata?.avatar_url || "/default-avatar.png"}
          alt={`${user.user_metadata?.full_name || "User"} Avatar`}
          fill
          sizes="32px"
          className="object-cover"
        />
      </div>
      <span className="text-sm font-semibold text-white/90">
        {user.user_metadata?.full_name || "Spieler"}
      </span>
    </div>
  );
}