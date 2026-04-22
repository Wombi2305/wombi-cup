"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// 1. Wir erstellen einen leeren "Kasten" für unsere User-Daten
const AuthContext = createContext<{ user: any; loading: boolean }>({
  user: null,
  loading: true,
});

// 2. Dieser Provider wird später wie ein Mantel um unsere ganze App gelegt
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // getSession() ist viel schneller als getUser(), da es den lokalen Speicher ausliest!
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false); 
    });

    // Hört automatisch zu, ob sich jemand ein- oder ausloggt
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Ein eigener Hook, damit wir den User später mega einfach abrufen können
export const useAuth = () => {
  return useContext(AuthContext);
};