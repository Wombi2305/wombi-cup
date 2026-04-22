"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import KoPhase from "@/components/KoPhase";
import { useSearchParams } from "next/navigation";
import { useTournaments } from "@/components/TournamentProvider"; // 🔥 Nutzt den Cache
import { useAuth } from "@/components/AuthProvider"; // 🔥 Nutzt den Auth-Cache

function KoPhaseContent() {
  const searchParams = useSearchParams();
  const { tournaments, loading: tournamentsLoading } = useTournaments();
  const { user } = useAuth();
  
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // 🔥 SCHRITT 1: Nur Turniere filtern, deren ko_status "active" ist
  const activeKoTournaments = useMemo(() => {
    return tournaments.filter((t: any) => t.ko_status === "active");
  }, [tournaments]);

  // 🔥 SCHRITT 2: Das richtige Turnier beim Laden auswählen
  useEffect(() => {
    if (tournamentsLoading || activeKoTournaments.length === 0) return;

    const urlId = searchParams.get("tournamentId");
    const existsInKo = activeKoTournaments.find(t => t.id === Number(urlId));

    if (urlId && existsInKo) {
      setSelectedTournament(Number(urlId));
    } else {
      // Fallback: Wähle das erste Turnier aus, das K.O.-Phase "active" hat
      setSelectedTournament(activeKoTournaments[0].id);
    }
  }, [searchParams, activeKoTournaments, tournamentsLoading]);

  // SCHRITT 3: Matches und Teams für das gewählte Turnier laden
  useEffect(() => {
    if (!selectedTournament) return;

    const fetchData = async () => {
      setLoadingMatches(true);
      
      const { data: regData } = await supabase
        .from("tournament_registrations")
        .select("teams(*)")
        .eq("tournament_id", selectedTournament)
        .eq("status", "approved");
        
      const { data: m } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", selectedTournament);
        
      if (regData) {
        const extractedTeams = regData.map((r: any) => r.teams).filter(Boolean);
        setTeams(extractedTeams);
      }
      if (m) setMatches(m);
      
      setLoadingMatches(false);
    };

    fetchData();

    // Realtime für Ergebnisse
    const channel = supabase.channel(`ko-matches-${selectedTournament}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${selectedTournament}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTournament]);

  const currentTournament = activeKoTournaments.find(t => t.id === selectedTournament);

  if (tournamentsLoading) {
    return <div className="text-white/60 text-center mt-20 italic">Lade Turniere...</div>;
  }

  return (
    <main className="px-4 md:px-6 pt-6 pb-12 text-white font-sans w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-yellow-400 uppercase tracking-widest italic">K.O. Phase</h1>
          <p className="text-gray-400 text-sm mt-1">Hier findest du alle Turniere im Final-Modus.</p>
        </div>

        {/* Turnier-Umschalter: Zeigt nur die an, die "active" im ko_status sind */}
        {activeKoTournaments.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {activeKoTournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTournament(t.id)}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-md ${
                  selectedTournament === t.id 
                  ? "bg-yellow-500 text-black scale-105" 
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeKoTournaments.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
          <div className="text-5xl mb-4">🧊</div>
          <h2 className="text-xl font-bold">Aktuell keine K.O. Phasen</h2>
          <p className="text-gray-400 mt-2 max-w-md mx-auto">Sobald die Gruppenphasen beendet sind und die K.O.-Runden generiert wurden, erscheinen sie hier.</p>
        </div>
      ) : loadingMatches ? (
        <div className="text-center mt-20 animate-pulse text-yellow-500/50 italic">Lade Spielplan...</div>
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

export default function KoPhasePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-white">Lade K.O. Bereich...</div>}>
      <KoPhaseContent />
    </Suspense>
  );
}