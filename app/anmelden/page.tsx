  "use client";
  import { useEffect, useState } from "react";
  import { supabase } from "@/lib/supabase";
  import { useTournaments } from "@/components/TournamentProvider";

  export default function Anmelden() {
    const { tournaments, loading: tournamentsLoading, refreshTournaments } = useTournaments();

    const [user, setUser] = useState<any>(null);
    const [teamname, setTeamname] = useState<{ [key: number]: string }>({});
    const [captain, setCaptain] = useState<{ [key: number]: string }>({});
    const [loading, setLoading] = useState<{ [key: number]: boolean }>({});
    const [success, setSuccess] = useState<{ [key: number]: boolean }>({});
    const [message, setMessage] = useState<string | null>(null);
    
    const [discordUser, setDiscordUser] = useState<any>(null);
    const [isCheckingDiscord, setIsCheckingDiscord] = useState<boolean>(true);
    const [existingDbTeam, setExistingDbTeam] = useState<any>(null);
    const [dbCheckDone, setDbCheckDone] = useState<boolean>(false);

    const requiredRoleId = process.env.NEXT_PUBLIC_TEAMVM_ROLE_ID || "1492462340787011624";
    const hasRequiredRole = discordUser?.roles?.includes(requiredRoleId);

    useEffect(() => {
      const init = async () => {
        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData.user;
        setUser(currentUser);

        if (currentUser) {
          const { data: teams } = await supabase
            .from("teams")
            .select("id, teamname, captain, is_active")
            .eq("user_id", currentUser.id);
          
          if (teams && teams.length > 0) {
            const activeTeam = teams.find((t: any) => t.is_active) || teams[0];
            setExistingDbTeam(activeTeam);
          }
        }
        setDbCheckDone(true);
      };
      init();
    }, []);

    useEffect(() => {
      const checkDiscord = async () => {
        const userId = localStorage.getItem("discord_user_id");
        if (!userId) {
          setIsCheckingDiscord(false);
          return;
        }
        try {
          const res = await fetch(`/api/discord/member?userId=${userId}`);
          const data = await res.json();
          setDiscordUser(data.error ? null : data);
        } catch (err) {
          setDiscordUser(null);
        } finally {
          setIsCheckingDiscord(false); 
        }
      };
      checkDiscord();
    }, []);

    useEffect(() => {
      if (tournaments.length === 0 || !dbCheckDone || isCheckingDiscord) return;

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
        tournaments.forEach((t: any) => {
          if (updated[t.id] === undefined || updated[t.id] === "") updated[t.id] = defaultTeam;
        });
        return updated;
      });

      setCaptain((prev) => {
        const updated = { ...prev };
        tournaments.forEach((t: any) => {
          if (updated[t.id] === undefined || updated[t.id] === "") updated[t.id] = defaultCaptain;
        });
        return updated;
      });
    }, [discordUser, tournaments, existingDbTeam, dbCheckDone, isCheckingDiscord]);

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
        refreshTournaments(); 
      }
      setLoading((prev) => ({ ...prev, [tournamentId]: false }));
    };

    const handleSubmit = async (e: any, tournamentId: number) => {
      e.preventDefault();
      if (!discordUser || !hasRequiredRole || !user || !teamname[tournamentId]) {
        return showMessage("Check deine Berechtigung / Eingabe");
      }

      setLoading((prev) => ({ ...prev, [tournamentId]: true }));

      try {
        const currentTournament = tournaments.find((t: any) => t.id === tournamentId);
        const registrations = currentTournament?.tournament_registrations || [];
        const approvedCount = registrations.filter((r: any) => r.status === "approved").length;

        const status = currentTournament?.max_teams && approvedCount >= Number(currentTournament.max_teams)
            ? "waiting"
            : "approved";

        let currentTeamId;
        
        const { data: teams } = await supabase
          .from("teams")
          .select("id, is_active")
          .eq("user_id", user.id);

        const activeTeam = teams?.find((t) => t.is_active) || (teams && teams[0]);

        if (activeTeam) {
          currentTeamId = activeTeam.id;
          // UPDATE ENTFERNT: Wenn ein aktives Team existiert, sollen Name und Captain nicht überschrieben werden können.
        } else {
          const { data: newTeam, error: teamError } = await supabase
            .from("teams")
            .insert([{ 
              teamname: teamname[tournamentId], 
              captain: captain[tournamentId], 
              user_id: user.id,
              is_active: true 
            }])
            .select()
            .single();
            
          if (teamError) throw teamError;
          currentTeamId = newTeam.id;
          
          // Neues Team lokal im State als aktiv setzen, damit direkt die Felder für andere Turniere gesperrt werden
          setExistingDbTeam(newTeam);
        }

        const { error: insertError } = await supabase.from("tournament_registrations").insert([{ team_id: currentTeamId, tournament_id: Number(tournamentId), status: status }]);
        if (insertError) throw insertError;

        refreshTournaments(); 
        setSuccess((prev) => ({ ...prev, [tournamentId]: true }));
        showMessage(status === "approved" ? "✅ Team angemeldet!" : "🕒 Warteliste aktiv");
      } catch (err) {
        showMessage("❌ Fehler bei Anmeldung");
      }
      setLoading((prev) => ({ ...prev, [tournamentId]: false }));
    };

    if (tournamentsLoading) {
      return <div className="h-screen flex items-center justify-center text-white">Lade Turniere...</div>;
    }

    return (
      <>
        <main className="min-h-screen px-4 sm:px-6 pt-10 md:pt-12 pb-12 w-full max-w-6xl mx-auto">
          
          {/* 🔥 NEUE ÜBERSCHRIFT */}
          <h1 className="text-3xl md:text-5xl font-black mb-10 tracking-tight drop-shadow-lg text-white">
            Turnier <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Anmeldung</span>
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {tournaments.map((t: any) => {
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

              // Prüfen, ob Felder gesperrt sein sollen
              const isLocked = !!existingDbTeam;

              return (
                <div key={t.id} className={`bg-white/5 backdrop-blur-lg border rounded-3xl p-6 shadow-xl flex flex-col gap-5 transition-all hover:scale-[1.02] ${myRegistration ? "border-green-500/50 ring-1 ring-green-500/20" : "border-white/10"}`}>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">{t.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{t.start_time ? new Date(t.start_time).toLocaleString() : "Kein Datum"}</p>
                    <p className="text-sm md:text-base mt-4 text-white font-semibold">{approvedCount} / {t.max_teams || "∞"} Teams</p>
                    <div className="w-full h-2 bg-white/10 rounded-full mt-2">
                      <div className={`h-2 rounded-full transition-all duration-500 ${isFull ? "bg-red-500" : "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]"}`} style={{ width: `${percent}%` }} />
                    </div>
                    <div className="text-xs md:text-sm mt-2 font-semibold italic uppercase tracking-wider">
                      {isFull && !isReady ? <span className="text-red-400">Warteliste ({waiting})</span> : !isReady ? <span className="text-green-400">{t.max_teams ? `Noch ${freeSpots} Plätze frei` : "Unbegrenzt frei"}</span> : null}
                    </div>
                  </div>

                  {isReady ? (
                    <div className="flex flex-col gap-3 mt-auto">
                      <div className="text-green-400 text-xs font-bold animate-pulse text-center uppercase tracking-widest bg-green-500/10 py-2 rounded-lg border border-green-500/20">🔴 Live – Gruppen verfügbar</div>
                      <a href={`/tabelle?tournament=${t.id}`} className="w-full block p-3 md:p-4 rounded-2xl bg-blue-600 text-white text-center font-bold hover:bg-blue-500 transition shadow-lg">Zu den Gruppen →</a>
                    </div>
                  ) : myRegistration ? (
                    <div className="flex flex-col gap-3 mt-auto">
                      <div className="p-3 md:p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-center">
                        <p className="text-green-400 font-bold uppercase tracking-widest text-xs">✓ Angemeldet</p>
                        <p className="text-white text-sm font-semibold mt-1 truncate">{myTeam?.teamname}</p>
                      </div>
                      <button onClick={() => handleDelete(myRegistration.id, t.id)} disabled={loading[t.id]} className="w-full p-3 rounded-2xl bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition disabled:opacity-50 uppercase tracking-widest">Vom Turnier abmelden</button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleSubmit(e, Number(t.id))} className="flex flex-col gap-3 mt-auto">
                      {!discordUser || !hasRequiredRole ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center text-xs font-bold text-red-400 uppercase tracking-widest">Zugriff gesperrt <br/><span className="opacity-60 text-[10px]">TeamVM Rolle nötig</span></div>
                      ) : (
                        <>
                          <input 
                            type="text" 
                            placeholder="Teamname" 
                            value={teamname[t.id] ?? ""} 
                            readOnly={isLocked}
                            onChange={(e) => !isLocked && setTeamname((prev) => ({ ...prev, [t.id]: e.target.value }))} 
                            className={`w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-white outline-none transition-all ${isLocked ? 'opacity-70 cursor-not-allowed bg-black/60' : 'focus:border-yellow-500/50'}`} 
                          />
                          <input 
                            type="text" 
                            placeholder="Captain" 
                            value={captain[t.id] ?? ""} 
                            readOnly={isLocked}
                            onChange={(e) => !isLocked && setCaptain((prev) => ({ ...prev, [t.id]: e.target.value }))} 
                            className={`w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-white outline-none transition-all ${isLocked ? 'opacity-70 cursor-not-allowed bg-black/60' : 'focus:border-yellow-500/50'}`} 
                          />
                        </>
                      )}
                      <button disabled={loading[t.id] || isSuccess || !discordUser || !hasRequiredRole} className={`w-full p-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${!discordUser || !hasRequiredRole ? "bg-gray-800 text-gray-500 cursor-not-allowed" : isSuccess ? "bg-green-600 text-white" : "bg-gradient-to-r from-yellow-600 to-yellow-500 text-black shadow-lg hover:shadow-yellow-500/20 active:scale-95"}`}>
                        {loading[t.id] ? "Lädt..." : isSuccess ? "Erfolgreich!" : isFull ? "Auf Warteliste" : "Jetzt anmelden"}
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        {message && <div className="fixed top-24 right-4 bg-black/90 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-top-4 border border-white/10 backdrop-blur-md font-bold">{message}</div>}
      </>
    );
  }