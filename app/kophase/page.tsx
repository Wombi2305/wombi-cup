"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import KoPhase from "@/components/KoPhase";
import { useSearchParams } from "next/navigation"; // 🔥 NEU: Der Next.js Weg, um URLs zu lesen

// Die eigentliche Logik haben wir in eine Unter-Komponente ausgelagert
function KoPhaseContent() {
  const searchParams = useSearchParams(); // 🔥 NEU: Suchparameter auslesen
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  // 1. User abrufen
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // 2. Turniere laden & URL-Parameter prüfen
  useEffect(() => {
    const fetchTournaments = async () => {
      const { data } = await supabase.from("tournaments").select("*").eq("status", "active");
      
      if (data && data.length > 0) {
        setTournaments(data);
        
        // 🔥 NEU: Hier greifen wir jetzt die ID sicher über Next.js ab
        const urlId = searchParams.get("tournamentId");
        
        if (urlId && data.some(t => t.id === Number(urlId))) {
          setSelectedTournament(Number(urlId)); // Turnier aus der URL setzen
        } else {
          setSelectedTournament(data[0].id); // Fallback: Erstes Turnier
        }
      }
      setLoading(false);
    };
    fetchTournaments();
  }, [searchParams]); // 🔥 NEU: Reagiert, wenn sich die URL ändert

  // 3. Daten für K.O. Phase laden
  useEffect(() => {
    if (!selectedTournament) return;
    const fetchData = async () => {
      // 🔥 GEÄNDERT: Wir holen die Teams über die Verknüpfungstabelle
      const { data: regData } = await supabase
        .from("tournament_registrations")
        .select("teams(*)")
        .eq("tournament_id", selectedTournament);
        
      const { data: m } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", selectedTournament);
        
      if (regData) {
        // Teams entpacken, damit die Child-Komponente nichts von dem Join merkt
        const extractedTeams = regData.map((r: any) => r.teams).filter(Boolean);
        setTeams(extractedTeams);
      }
      
      if (m) setMatches(m);
    };
    fetchData();

    const channel = supabase.channel("kophase-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTournament]);

  const currentTournament = tournaments.find(t => t.id === selectedTournament);

  return (
    <main className="px-4 md:px-6 pt-6 pb-12 text-white font-sans w-full max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6 uppercase tracking-widest italic">K.O. Phase</h1>

      {/* Button-Leiste für Turniere */}
      {tournaments.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {tournaments.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTournament(t.id)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition shadow-md ${selectedTournament === t.id ? "bg-yellow-500 text-black scale-105" : "border border-white/10 hover:bg-white/5"}`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-white/60 text-center mt-20">⏳ Lade K.O. Baum...</div>
      ) : !selectedTournament ? (
        <div className="text-gray-400 text-center mt-10">Kein aktives Turnier gefunden.</div>
      ) : (
        <KoPhase 
          matches={matches} 
          teams={teams} 
          user={user} 
          koSize={currentTournament?.ko_teams_count} 
        />
      )}
    </main>
  );
}

// 🔥 NEU: Next.js verlangt, dass alles, was useSearchParams nutzt, in eine <Suspense> Klammer kommt
export default function KoPhasePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-white">Lade K.O. Phase...</div>}>
      <KoPhaseContent />
    </Suspense>
  );
}