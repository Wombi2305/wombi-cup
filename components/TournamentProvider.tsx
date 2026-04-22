"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Context erstellen
const TournamentContext = createContext<any>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Zentrale Funktion zum Laden der Daten
  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select(`
        *, 
        tournament_registrations(*, teams(*))
      `)
      .order("start_time", { ascending: true });
      
    if (error) {
      console.error("Fehler im TournamentProvider:", error);
    } else {
      setTournaments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTournaments();

    // Ein einziger Realtime-Listener für die ganze App
    const channel = supabase
      .channel("global-tournaments-cache")
      .on(
        "postgres_changes", 
        { event: "*", schema: "public", table: "tournaments" }, 
        () => fetchTournaments()
      )
      .on(
        "postgres_changes", 
        { event: "*", schema: "public", table: "tournament_registrations" }, 
        () => fetchTournaments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <TournamentContext.Provider value={{ tournaments, loading, refreshTournaments: fetchTournaments }}>
      {children}
    </TournamentContext.Provider>
  );
}

// Hook, um die Daten in den Seiten zu nutzen
export const useTournaments = () => useContext(TournamentContext);