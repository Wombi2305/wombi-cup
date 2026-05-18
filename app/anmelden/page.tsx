"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTournaments } from "@/components/TournamentProvider";

export default function Anmelden() {
  const { tournaments, loading: tournamentsLoading, refreshTournaments } = useTournaments();

  const [user, setUser] = useState<any>(null);
  
  const [teamname, setTeamname] = useState<{ [key: number]: string }>({});
  const [captain, setCaptain] = useState<{ [key: number]: string }>({});
  
  const [ownedTeams, setOwnedTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<{ [key: number]: string }>({});
  
  const [loading, setLoading] = useState<{ [key: number]: boolean }>({}); 
  const [deleteLoading, setDeleteLoading] = useState<{ [key: number]: boolean }>({}); 
  
  const [success, setSuccess] = useState<{ [key: number]: boolean }>({});
  const [message, setMessage] = useState<string | null>(null);
  
  const [discordUser, setDiscordUser] = useState<any>(null);
  const [isCheckingDiscord, setIsCheckingDiscord] = useState<boolean>(true);
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
          .select("id, teamname, captain, is_active, user_id")
          .eq("user_id", currentUser.id)
          .eq("is_deleted", false);
        
        if (teams) {
          setOwnedTeams(teams);
        }
      }
      setDbCheckDone(true);
    };
    init();
  }, []);

  // 🔥 HIER IST DER NEUE CACHE FÜR DISCORD EINGEBAUT
  useEffect(() => {
    const checkDiscord = async () => {
      const userId = localStorage.getItem("discord_user_id");
      if (!userId) {
        setIsCheckingDiscord(false);
        return;
      }

      // Prüfen, ob wir einen frischen Cache haben (jünger als 5 Minuten / 300.000 ms)
      const cachedDiscordData = sessionStorage.getItem("discord_cache");
      const cachedTime = sessionStorage.getItem("discord_cache_time");
      const now = new Date().getTime();

      if (cachedDiscordData && cachedTime && (now - parseInt(cachedTime)) < 300000) {
        setDiscordUser(JSON.parse(cachedDiscordData));
        setIsCheckingDiscord(false);
        return; // Direkt abbrechen, keine API-Anfrage nötig!
      }

      // Falls kein Cache da ist -> Fetch ausführen
      try {
        const res = await fetch(`/api/discord/member?userId=${userId}`);
        const data = await res.json();
        
        if (!data.error) {
          setDiscordUser(data);
          // Daten frisch in den Cache schreiben
          sessionStorage.setItem("discord_cache", JSON.stringify(data));
          sessionStorage.setItem("discord_cache_time", now.toString());
        } else {
          setDiscordUser(null);
        }
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

    if (discordUser && discordUser.nick) {
      const rawNick = discordUser.nick.trim();

      if (rawNick.includes("|")) {
        const parts = rawNick.split("|");
        defaultTeam = parts[0].trim();
        defaultCaptain = parts.length > 1 ? parts[1].trim() : ""; 
      } else {
        defaultCaptain = rawNick;
        defaultTeam = ""; 
      }
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
  }, [discordUser, tournaments, dbCheckDone, isCheckingDiscord]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (registrationId: number, tournamentId: number) => {
    setDeleteLoading((prev) => ({ ...prev, [tournamentId]: true }));
    
    try {
      const { error } = await supabase.from("tournament_registrations").delete().eq("id", registrationId);
      if (error) throw error;
      
      showMessage("👋 Erfolgreich abgemeldet");
      setSuccess((prev) => ({ ...prev, [tournamentId]: false }));
      
      if (typeof refreshTournaments === "function") {
        refreshTournaments();
      } else {
        window.location.reload();
      }
      
    } catch (err) {
      showMessage("❌ Fehler beim Abmelden");
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [tournamentId]: false }));
    }
  };

  const handleSubmit = async (e: any, tournamentId: number) => {
    e.preventDefault();

    if (!discordUser || !hasRequiredRole || !user) {
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
      
      if (ownedTeams.length > 0) {
        const availableTeams = ownedTeams.filter(ot => !registrations.some((r: any) => r.team_id === ot.id));
        currentTeamId = selectedTeam[tournamentId] || availableTeams[0]?.id;
        
        if (!currentTeamId) {
          setLoading((prev) => ({ ...prev, [tournamentId]: false }));
          return showMessage("❌ Alle deine Teams sind bereits angemeldet.");
        }
      } else {
        if (!teamname[tournamentId]) {
            setLoading((prev) => ({ ...prev, [tournamentId]: false }));
            return showMessage("Teamname fehlt");
        }

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
        
        setOwnedTeams([newTeam]);
      }

      const { error: insertError } = await supabase.from("tournament_registrations").insert([{ team_id: currentTeamId, tournament_id: Number(tournamentId), status: status }]);
      if (insertError) throw insertError;

      if (typeof refreshTournaments === "function") {
        refreshTournaments();
      } else {
        window.location.reload(); 
      }
      
      setSuccess((prev) => ({ ...prev, [tournamentId]: true }));
      showMessage(status === "approved" ? "✅ Team angemeldet!" : "🕒 Warteliste aktiv");
    } catch (err) {
      showMessage("❌ Fehler bei Anmeldung");
    }
    setLoading((prev) => ({ ...prev, [tournamentId]: false }));
  };

  return (
    <>
      <div className="px-4 sm:px-6 pt-10 md:pt-10 pb-16 w-full max-w-6xl mx-auto flex flex-col min-h-screen">
        
        <h1 className="text-3xl md:text-5xl font-black mb-8 md:mb-10 tracking-tight drop-shadow-lg text-white flex-shrink-0">
          Turnier <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Anmeldung</span>
        </h1>

        {tournamentsLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-10">
            {tournaments.filter((t: any) => t.status !== "finished" && !t.archived).map((t: any) => {
              const registrations = t.tournament_registrations || [];
              const approvedCount = registrations.filter((r: any) => r.status === "approved").length;
              const waiting = registrations.filter((r: any) => r.status === "waiting").length;
              const freeSpots = t.max_teams ? Math.max(t.max_teams - approvedCount, 0) : null;
              const isFull = t.max_teams && approvedCount >= t.max_teams;
              const isReady = t.draw_finished === true;
              const percent = t.max_teams ? Math.min((approvedCount / t.max_teams) * 100, 100) : 0;
              
              const myRegistrations = registrations.filter((r: any) => r.teams?.user_id === user?.id);
              const registeredTeamIds = myRegistrations.map((r: any) => r.team_id);
              
              const availableTeams = ownedTeams.filter(ot => !registeredTeamIds.includes(ot.id));

              return (
                <div key={t.id} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col gap-3 transition-all h-fit">
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
                  ) : (
                    <div className="flex flex-col gap-3 mt-auto">
                      
                      {myRegistrations.length > 0 && (
                        <div className="flex flex-col gap-2 mb-2">
                          {myRegistrations.map((reg: any) => {
                            const isApproved = reg.status === "approved";
                            return (
                              <div key={reg.id} className="flex flex-col gap-2">
                                <div className={`p-2 rounded-2xl border text-center ${isApproved ? "bg-green-500/10 border-green-500/20" : "bg-yellow-500/10 border-yellow-500/20"}`}>
                                  <p className={`font-bold uppercase tracking-widest text-[10px] mb-0.5 ${isApproved ? "text-green-400" : "text-yellow-500"}`}>
                                    {isApproved ? "✓ Angemeldet" : "⏳ Auf Warteliste"}
                                  </p>
                                  <p className="text-white text-sm font-semibold truncate">{reg.teams?.teamname}</p>
                                </div>
                                <button 
                                  onClick={() => handleDelete(reg.id, t.id)} 
                                  disabled={deleteLoading[t.id]} 
                                  className="w-full p-2 rounded-xl bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition disabled:opacity-50 uppercase tracking-widest"
                                >
                                  {deleteLoading[t.id] ? "Wird abgemeldet..." : "Team abmelden"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {(availableTeams.length > 0 || ownedTeams.length === 0) && (
                        <form onSubmit={(e) => handleSubmit(e, Number(t.id))} className="flex flex-col gap-3 pt-2 border-t border-white/10 mt-2">
                          
                          {(!dbCheckDone || isCheckingDiscord) ? (
                            <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                              Lade Berechtigung...
                            </div>
                          ) : !user || !discordUser || !hasRequiredRole ? (
                            <a 
                              href="https://discord.gg/Ajjx7eEdBX" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="w-full p-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-[0_0_15px_rgba(88,101,242,0.3)] hover:-translate-y-0.5 text-center block"
                            >
                              Discord Beitreten
                            </a>
                          ) : (
                            <>
                              {ownedTeams.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest ml-1">Team wählen:</span>
                                  <div className="flex flex-col gap-2">
                                    {availableTeams.map((at) => {
                                      const isSelected = (selectedTeam[t.id] || availableTeams[0]?.id) === at.id;
                                      return (
                                        <button
                                          key={at.id}
                                          type="button"
                                          onClick={() => setSelectedTeam(prev => ({ ...prev, [t.id]: at.id }))}
                                          className={`w-full p-3 rounded-xl text-sm font-bold text-left transition-all border ${
                                            isSelected 
                                            ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-400 shadow-sm" 
                                            : "bg-black/40 border-white/10 text-white hover:bg-white/5"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full border ${isSelected ? "border-yellow-400 bg-yellow-400" : "border-gray-500"} flex items-center justify-center shrink-0`}>
                                              {isSelected && <div className="w-1.5 h-1.5 bg-black rounded-full"></div>}
                                            </div>
                                            <span className="truncate">{at.teamname}</span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <input 
                                    type="text" 
                                    placeholder="Teamname" 
                                    value={teamname[t.id] ?? ""} 
                                    onChange={(e) => setTeamname((prev) => ({ ...prev, [t.id]: e.target.value }))} 
                                    className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-white outline-none transition-all focus:border-yellow-500/50 text-sm" 
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="Captain" 
                                    value={captain[t.id] ?? ""} 
                                    onChange={(e) => setCaptain((prev) => ({ ...prev, [t.id]: e.target.value }))} 
                                    className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-white outline-none transition-all focus:border-yellow-500/50 text-sm" 
                                  />
                                </>
                              )}

                              <button disabled={loading[t.id]} className="w-full p-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all bg-gradient-to-r from-yellow-600 to-yellow-500 text-black shadow-lg hover:shadow-yellow-500/20 active:scale-95 mt-2">
                                {loading[t.id] ? "Lädt..." : isFull ? "Auf Warteliste setzen" : "Team Anmelden"}
                              </button>
                            </>
                          )}

                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {message && <div className="fixed top-24 right-4 bg-black/90 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-top-4 border border-white/10 backdrop-blur-md font-bold">{message}</div>}
    </>
  );
}