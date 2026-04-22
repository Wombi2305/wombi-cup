"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

// 1. Definition des Context-Typs
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// 2. Context erstellen
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// 3. Provider-Komponente
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Überprüfe den initialen Session-Status beim Laden der Seite
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    initAuth();

    // Höre auf Änderungen (Login, Logout, Token-Refresh)
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

// 4. Eigener Hook für den einfachen Zugriff in anderen Komponenten
export const useAuth = () => useContext(AuthContext);