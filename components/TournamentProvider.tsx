"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

// Context erstellen
const TournamentContext = createContext<any>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [groupAssignments, setGroupAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Zentrale Funktion zum Laden ALLER relevanten Daten (Parallel für maximalen Speed)
  const fetchAllData = async () => {
    const [tournamentsRes, matchesRes, assignmentsRes] = await Promise.all([
      supabase
        .from("tournaments")
        .select(`*, tournament_registrations(*, teams(*))`)
        .order("start_time", { ascending: true }),
      supabase
        .from("matches")
        .select("*")
        .order("id", { ascending: true }),
      supabase
        .from("group_assignments")
        .select("*")
    ]);

    if (tournamentsRes.error) console.error("Fehler Turniere:", tournamentsRes.error);
    else setTournaments(tournamentsRes.data || []);

    if (matchesRes.error) console.error("Fehler Matches:", matchesRes.error);
    else setMatches(matchesRes.data || []);

    if (assignmentsRes.error) console.error("Fehler Gruppen:", assignmentsRes.error);
    else setGroupAssignments(assignmentsRes.data || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();

    // 🔥 OPTIMIERUNG: Globaler Debounce für die gesamte App
    const handleUpdate = () => {
      if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
      fetchTimeout.current = setTimeout(() => {
        fetchAllData();
      }, 1500); // Fasst alle Datenbank-Änderungen in 1,5 Sekunden zusammen
    };

    // Ein einziger Realtime-Listener für die komplette App!
    const channel = supabase
      .channel("global-app-cache")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, handleUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_registrations" }, handleUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, handleUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_assignments" }, handleUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
    };
  }, []);

  return (
    <TournamentContext.Provider value={{ 
      tournaments, 
      matches, 
      groupAssignments, 
      loading, 
      refreshData: fetchAllData,
      refreshTournaments: fetchAllData // 🔥 HIER IST DER FIX! Beide Namen sind jetzt verfügbar.
    }}>
      {children}
    </TournamentContext.Provider>
  );
}

// Hook, um die Daten in ALLEN Seiten instantan zu nutzen
export const useTournaments = () => useContext(TournamentContext);