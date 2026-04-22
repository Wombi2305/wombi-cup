"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// 🔥 Unseren neuen Hook importieren
import { useAuth } from "@/components/AuthProvider";

export default function Anmelden() {
  const { user, loading: authLoading } = useAuth();

  // --- STATES ---
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teamname, setTeamname] = useState<{ [key: number]: string }>({});
  const [captain, setCaptain] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState<{ [key: number]: boolean }>({});
  const [success, setSuccess] = useState<{ [key: number]: boolean }>({});
  const [message, setMessage] = useState<string | null>(null);
  
  const [discordUser, setDiscordUser] = useState<any>(null);
  const [existingDbTeam, setExistingDbTeam] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);

  // --- PRÜFUNG DER ROLLE ---
  const TEAMVM_ROLE = process.env.NEXT_PUBLIC_TEAMVM_ROLE_ID || "1492462340787011624";
  const ORGA_ROLE = "1492478735444873398"; 
  
  const hasRequiredRole = discordUser?.roles?.includes(TEAMVM_ROLE) || discordUser?.roles?.includes(ORGA_ROLE);

  // --- 1. TURNIERE & REALTIME ---
  useEffect(() => {
    fetchTournaments();

    const channel = supabase
      .channel("realtime-tournaments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_registrations" },
        () => {
          fetchTournaments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- 2. 🔥 ULTRA SPEED-UP: DATEN LADEN ---
  useEffect(() => {
    if (authLoading) return; 

    // WENN NICHT EINGELOGGT: Sofort alles abbrechen
    if (!user) {
      setDiscordUser(null);
      setExistingDbTeam(null);
      setDataLoaded(true);
      return;
    }

    let isMounted = true;

    const loadAllData = async () => {
      const promises = [];

      // DB Check
      promises.push(
        supabase.from("teams").select("teamname, captain").eq("user_id", user.id).single()
          .then(({ data }) => {
            if (data && isMounted) setExistingDbTeam(data);
          })
      );

      // Discord Check
      const storedId = localStorage.getItem("discord_user_id");
      const userId = user.user_metadata?.provider_id || storedId;

      if (userId) {
        promises.push(
          fetch(`/api/discord/member?userId=${userId}`)
            .then(res => res.json())
            .then(data => {
              if (!data.error && isMounted) setDiscordUser(data);
            })
            .catch(err => console.error("Discord API Error:", err))
        );
      }

      await Promise.allSettled(promises);
      
      if (isMounted) setDataLoaded(true);
    };

    loadAllData();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  // --- 3. AUTOFILL LOGIK ---
  useEffect(() => {
    if (tournaments.length === 0 || !dataLoaded) return;

    let defaultTeam = "";
    let defaultCaptain = "";

    if (existingDbTeam) {
      defaultTeam = existingDbTeam.teamname;
      defaultCaptain = existingDbTeam.captain || "";
    } else if (discordUser && discordUser.nick) {
      const parts = discordUser.nick.split("|");
      defaultTeam = parts[0] ? parts[0].trim() : discordUser.nick;
      defaultCaptain = parts[1] ? parts[1].trim() : "";
    }

    setTeamname((prev) => {
      const updated = { ...prev };
      tournaments.forEach((t) => {
        if (updated[t.id] === undefined || updated[t.id] === "") updated[t.id] = defaultTeam;
      });
      return updated;
    });

    setCaptain((prev) => {
      const updated = { ...prev };
      tournaments.forEach((t) => {
        if (updated[t.id] === undefined || updated[t.id] === "") updated[t.id] = defaultCaptain;
      });
      return updated;
    });
  }, [discordUser, tournaments, existingDbTeam, dataLoaded]);

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select(`*, tournament_registrations(*, teams(*))`)
      .order("start_time", { ascending: true });

    if (!error) setTournaments(data || []);
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (registrationId: number, tournamentId: number) => {
    setLoading((prev) => ({ ...prev, [tournamentId]: true }));
    const { error } = await supabase.from("tournament_registrations").delete().eq("id", registrationId);

    if (error) {
      showMessage("❌ Fehler beim Abmelden");
    } else {
      showMessage("👋 Erfolgreich abgemeldet");
      setSuccess((prev) => ({ ...prev, [tournamentId]: false }));
      await fetchTournaments();
    }
    setLoading((prev) => ({ ...prev, [tournamentId]: false }));
  };

  const handleSubmit = async (e: any, tournamentId: number) => {
    e.preventDefault();
    if (!user || !discordUser) return showMessage("Discord Login erforderlich!");
    if (!hasRequiredRole) return showMessage("Dir fehlt die Berechtigung (TeamVM oder Orga Rolle)!");
    if (!teamname[tournamentId]) return showMessage("Bitte Teamname eingeben");

    setLoading((prev) => ({ ...prev, [tournamentId]: true }));

    try {
      const currentTournament = tournaments.find(t => t.id === tournamentId);
      const registrations = currentTournament?.tournament_registrations || [];
      const approvedCount = registrations.filter((r: any) => r.status === "approved").length;

      const status = currentTournament?.max_teams && approvedCount >= Number(currentTournament.max_teams)
          ? "waiting"
          : "approved";

      let currentTeamId;
      const { data: existingTeam } = await supabase.from("teams").select("id").eq("user_id", user.id).single();

      if (existingTeam) {
        currentTeamId = existingTeam.id;
        await supabase.from("teams").update({ teamname: teamname[tournamentId], captain: captain[tournamentId] }).eq("id", currentTeamId);
      } else {
        const { data: newTeam, error: teamError } = await supabase
            .from("teams")
            .insert([{ teamname: teamname[tournamentId], captain: captain[tournamentId], user_id: user.id }])
            .select().single();
        if (teamError) throw teamError;
        currentTeamId = newTeam.id;
      }

      const { data: existingRegistration } = await supabase.from("tournament_registrations").select("id").eq("team_id", currentTeamId).eq("tournament_id", tournamentId).single();

      if (existingRegistration) {
        showMessage("⚠️ Du bist bereits angemeldet");
        setLoading((prev) => ({ ...prev, [tournamentId]: false }));
        return;
      }

      const { error: insertError } = await supabase.from("tournament_registrations").insert([{ team_id: currentTeamId, tournament_id: Number(tournamentId), status: status }]);
      if (insertError) throw insertError;

      await fetchTournaments();
      setSuccess((prev) => ({ ...prev, [tournamentId]: true }));
      showMessage(status === "approved" ? "✅ Team angemeldet!" : "🕒 Warteliste aktiv");

      setTeamname((prev) => ({ ...prev, [tournamentId]: "" }));
      setCaptain((prev) => ({ ...prev, [tournamentId]: "" }));

    } catch (err) {
      console.error("ERROR:", err);
      showMessage("❌ Fehler bei Anmeldung");
    }
    setLoading((prev) => ({ ...prev, [tournamentId]: false }));
  };

  return (
    <>
      <main className="min-h-screen px-4 sm:px-6 pt-24 md:pt-28 pb-12 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {tournaments.map((t) => {
            const registrations = t.tournament_registrations || [];
            const approvedCount = registrations.filter((r: any) => r.status === "approved").length;
            const waiting = registrations.filter((r: any) => r.status === "waiting").length;
            const freeSpots = t.max_teams ? Math.max(t.max_teams - approvedCount, 0) : null;
            const isFull = t.max_teams && approvedCount >= t.max_teams;
            const isReady = t.draw_finished === true;
            const percent = t.max_teams ? Math.min((approvedCount / t.max_teams) * 100, 100) : 0;
            const myRegistration = registrations.find((r: any) => r.teams?.user_id === user?.id);
            const myTeam = myRegistration ? myRegistration.teams : null;
            const isSuccess = success[t.id];

            return (
              <div
                key={t.id}
                className={`bg-white/5 backdrop-blur-lg border rounded-2xl p-6 shadow-xl flex flex-col gap-5 transition-all hover:scale-[1.02] ${
                  myRegistration ? "border-green-500/50 ring-1 ring-green-500/20" : "border-white/10"
                }`}
              >
                {/* HEADER */}
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] leading-tight">
                    {t.name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {t.start_time ? new Date(t.start_time).toLocaleString() : "Kein Datum"}
                  </p>
                  <p className="text-sm md:text-base mt-2 text-white font-semibold drop-shadow">
                    {approvedCount} / {t.max_teams || "∞"} Teams
                  </p>

                  <div className="w-full h-2 bg-white/10 rounded-full mt-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${isFull ? "bg-red-500" : "bg-green-500"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="text-xs md:text-sm mt-2 font-semibold flex flex-col gap-1">
                    {isFull && !isReady ? (
                      <span className="text-red-400">Aktuelle Warteliste ({waiting})</span>
                    ) : !isReady ? (
                      <span className="text-green-400">
                        {t.max_teams ? `Noch ${freeSpots} Plätze frei` : "Unbegrenzt Plätze frei"}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* ACTION AREA */}
                {isReady ? (
                  <div className="flex flex-col gap-3 mt-auto">
                    <div className="text-green-400 text-sm font-semibold animate-pulse text-center">🔴 Live – Gruppen verfügbar</div>
                    <a href={`/tabelle?tournament=${t.id}`} className="w-full block p-3 md:p-4 rounded-xl bg-blue-600 text-white text-center font-semibold hover:bg-blue-500 transition hover:scale-[1.03]">Zu den Gruppen →</a>
                  </div>
                ) : myRegistration ? (
                  <div className="flex flex-col gap-3 mt-auto">
                    <div className="p-3 md:p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                      <p className="text-green-400 text-sm md:text-base font-bold">✓ Angemeldet</p>
                      <p className="text-white text-xs md:text-sm opacity-70 truncate mt-1">{myTeam?.teamname}</p>
                    </div>
                    <button onClick={() => handleDelete(myRegistration.id, t.id)} disabled={loading[t.id]} className="w-full p-3 md:p-4 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition font-semibold disabled:opacity-50 text-sm md:text-base">
                      {loading[t.id] ? "Wird abgemeldet..." : "Vom Turnier abmelden"}
                    </button>
                  </div>
                ) : authLoading || !dataLoaded ? (
                  /* 🔥 Lade-Zustand greift, solange `dataLoaded` false ist oder auth noch lädt */
                  <div className="flex flex-col gap-3 mt-auto animate-pulse">
                    <div className="h-[52px] md:h-[56px] bg-white/5 rounded-xl w-full"></div>
                    <div className="h-[52px] md:h-[56px] bg-white/5 rounded-xl w-full"></div>
                    <div className="h-[52px] md:h-[56px] bg-white/10 rounded-xl w-full mt-1"></div>
                  </div>
                ) : (
                  <form onSubmit={(e) => handleSubmit(e, Number(t.id))} className="flex flex-col gap-3 mt-auto">
                    
                    {!user ? (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                            <p className="text-yellow-500 text-xs md:text-sm font-bold uppercase tracking-wider">Discord Login erforderlich</p>
                        </div>
                    ) : !hasRequiredRole ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                            <p className="text-red-500 text-xs md:text-sm font-bold uppercase tracking-wider">Rolle "TeamVM" erforderlich</p>
                        </div>
                    ) : null}

                    {user && hasRequiredRole && (
                      <>
                        <input
                          type="text"
                          placeholder="Teamname"
                          value={teamname[t.id] ?? ""}
                          disabled={isSuccess || loading[t.id]}
                          onChange={(e) => setTeamname((prev) => ({ ...prev, [t.id]: e.target.value }))}
                          className="w-full p-3 md:p-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 disabled:opacity-30 outline-none text-sm md:text-base"
                        />
                        <input
                          type="text"
                          placeholder="Captain"
                          value={captain[t.id] ?? ""}
                          disabled={isSuccess || loading[t.id]}
                          onChange={(e) => setCaptain((prev) => ({ ...prev, [t.id]: e.target.value }))}
                          className="w-full p-3 md:p-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 disabled:opacity-30 outline-none text-sm md:text-base"
                        />
                      </>
                    )}

                    <button
                      disabled={loading[t.id] || isSuccess || !user || !hasRequiredRole}
                      className={`w-full p-3 md:p-4 rounded-xl font-semibold transition text-sm md:text-base ${
                        !user || !hasRequiredRole
                          ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5"
                          : isSuccess 
                          ? "bg-green-600 cursor-default text-white" 
                          : isFull
                          ? "bg-gray-600 hover:bg-gray-500 text-white"
                          : "bg-gradient-to-r from-red-600 to-red-500 text-white hover:scale-[1.03] shadow-lg shadow-red-500/20"
                      }`}
                    >
                      {loading[t.id] ? "Wird angemeldet..." : !user ? "Anmeldung gesperrt" : !hasRequiredRole ? "Fehlende Berechtigung" : isSuccess ? "✅ Erfolgreich angemeldet!" : isFull ? "Für Warteliste anmelden" : "Jetzt teilnehmen"}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* TOAST NOTIFICATION */}
      {message && (
        <div className="fixed top-20 right-4 sm:right-6 md:top-24 bg-black/80 text-white px-4 md:px-6 py-3 rounded-lg shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 backdrop-blur-md border border-white/10 max-w-[90vw] md:max-w-md break-words text-sm md:text-base">
          {message}
        </div>
      )}
    </>
  );
}