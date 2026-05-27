"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTournaments } from "@/components/TournamentProvider";
import TeamCard from "@/components/TeamCard"; // 🔥 HIER IMPORTIEREN (Pfad ggf. anpassen)

export default function Anmelden() {
  const { tournaments, loading: tournamentsLoading, refreshTournaments } = useTournaments();

  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [teamname, setTeamname] = useState<{ [key: number]: string }>({});
  const [captain, setCaptain] = useState<{ [key: number]: string }>({});
  
  const [ownedTeams, setOwnedTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<{ [key: number]: string }>({});
  
  const [loading, setLoading] = useState<{ [key: number]: boolean }>({}); 
  const [deleteLoading, setDeleteLoading] = useState<{ [key: number]: boolean }>({}); 
  
  const [success, setSuccess] = useState<{ [key: number]: boolean }>({});
  const [message, setMessage] = useState<string | null>(null);

  const [showRolePopup, setShowRolePopup] = useState(false);
  const [selectedTournamentTeams, setSelectedTournamentTeams] = useState<any | null>(null);
  
  const [discordUser, setDiscordUser] = useState<any>(null);
  const [isCheckingDiscord, setIsCheckingDiscord] = useState<boolean>(true);
  const [dbCheckDone, setDbCheckDone] = useState<boolean>(false);

  // Rollen-Check
  const requiredRoleId = String(process.env.NEXT_PUBLIC_TEAMVM_ROLE_ID || "1492462340787011624");
  const hasDiscordRole = discordUser?.roles?.map(String).includes(requiredRoleId);
  const hasDbRole = userProfile?.role === "teamvm" || userProfile?.role === "admin";
  
  const hasRequiredRole = hasDbRole || hasDiscordRole;

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData.user;
      setUser(currentUser);

      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUser.id)
          .single();
          
        if (profile) {
          setUserProfile(profile);
        }

        const { data: teams } = await supabase
          .from("teams")
          .select("id, teamname, captain, is_active, user_id, level, logo_url, equipped_border, equipped_color, equipped_banner, team_rewards(*)")
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

  // Discord-Check
  useEffect(() => {
    const checkDiscord = async () => {
      const userId = localStorage.getItem("discord_user_id");
      if (!userId) {
        setIsCheckingDiscord(false);
        return;
      }

      const cachedDiscordData = sessionStorage.getItem("discord_cache");
      const cachedTime = sessionStorage.getItem("discord_cache_time");
      const now = new Date().getTime();

      if (cachedDiscordData && cachedTime && (now - parseInt(cachedTime)) < 300000) {
        setDiscordUser(JSON.parse(cachedDiscordData));
        setIsCheckingDiscord(false);
        return; 
      }

      try {
        const res = await fetch(`/api/discord/member?userId=${userId}`);
        const data = await res.json();
        
        if (!data.error) {
          setDiscordUser(data);
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

  // Standardwerte setzen
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

    if (!user || (!hasDbRole && !discordUser) || !hasRequiredRole) {
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
      <div className="px-4 sm:px-6 pt-10 md:pt-10 pb-16 w-full max-w-6xl mx-auto flex flex-col min-h-screen relative z-10">
        
        <h1 className="text-3xl md:text-5xl font-black mb-8 md:mb-10 tracking-tight drop-shadow-lg text-white flex-shrink-0">
          Turnier <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Anmeldung</span>
        </h1>

        {tournamentsLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
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
                <div 
                  key={t.id} 
                  className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 transition-all duration-300 hover:-translate-y-2 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)] h-fit overflow-visible"
                >
                  <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div className="flex justify-between items-start gap-4 relative z-10">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-black tracking-widest text-yellow-500/80 mb-1">
                        {t.cup_type === 'night_cup' ? '🌙 Night Cup' : t.cup_type === 'cup_21er' ? '🔥 21er Cup' : '🏆 T-Cup'}
                      </span>
                      <h3 className="text-xl md:text-2xl font-black text-white drop-shadow-md leading-tight">
                        {t.name}
                      </h3>
                    </div>
                    
                    <div className="shrink-0 mt-1">
                      {isReady ? (
                        <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 text-green-400 text-[10px] uppercase font-black tracking-widest rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)] animate-pulse">
                          Live
                        </span>
                      ) : isFull ? (
                        <span className="px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 text-[10px] uppercase font-black tracking-widest rounded-full">
                          Voll
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 text-blue-400 text-[10px] uppercase font-black tracking-widest rounded-full">
                          Offen
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-gray-300 font-medium relative z-10">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{t.start_time ? new Date(t.start_time).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : "Kein Datum"}</span>
                    </div>
                    
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-white font-bold">{approvedCount} <span className="text-gray-400 font-normal">/ {t.max_teams || "∞"} Teams</span></span>
                      </div>
                      <button 
                        onClick={() => setSelectedTournamentTeams(t)}
                        className="text-[10px] uppercase font-bold tracking-widest text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 px-2 py-1 rounded-lg transition-colors border border-yellow-500/20"
                      >
                        Angemeldete Teams
                      </button>
                    </div>
                  </div>

                  <div className="relative z-10 mt-1">
                    <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ease-out relative ${isFull ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]" : "bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]"}`} 
                        style={{ width: `${percent}%` }} 
                      >
                        <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/30 rounded-full"></div>
                      </div>
                    </div>
                    
                    <div className="text-[11px] mt-2 font-bold text-right uppercase tracking-wider text-gray-400">
                      {isFull && !isReady ? (
                        <span className="text-red-400 flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></span> {waiting} auf Warteliste</span>
                      ) : !isReady ? (
                        <span className="text-green-400">Noch {freeSpots} Plätze frei</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-auto pt-2 relative z-10">
                    {isReady ? (
                      <div className="flex flex-col gap-3">
                        <a href={`/tabelle?tournament=${t.id}`} className="w-full block p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-center font-bold hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 transition-all">Zu den Gruppen →</a>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        
                        {myRegistrations.length > 0 && (
                          <div className="flex flex-col gap-2 mb-2">
                            {myRegistrations.map((reg: any) => {
                              const isApproved = reg.status === "approved";
                              return (
                                <div key={reg.id} className="flex flex-col gap-1.5">
                                  <div className={`p-2.5 rounded-2xl border text-center ${isApproved ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"}`}>
                                    <p className={`font-black uppercase tracking-widest text-[10px] mb-0.5 ${isApproved ? "text-green-400" : "text-yellow-500"}`}>
                                      {isApproved ? "✓ Angemeldet" : "⏳ Auf Warteliste"}
                                    </p>
                                    <p className="text-white text-sm font-semibold truncate">{reg.teams?.teamname}</p>
                                  </div>
                                  <button 
                                    onClick={() => handleDelete(reg.id, t.id)} 
                                    disabled={deleteLoading[t.id]} 
                                    className="w-full p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold hover:bg-red-500 hover:text-white transition-all duration-300 disabled:opacity-50 uppercase tracking-widest"
                                  >
                                    {deleteLoading[t.id] ? "Wird abgemeldet..." : "Team abmelden"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {(availableTeams.length > 0 || ownedTeams.length === 0) && (
                          <form onSubmit={(e) => handleSubmit(e, Number(t.id))} className="flex flex-col gap-3 pt-4 border-t border-white/10">
                            {(!dbCheckDone || isCheckingDiscord) ? (
                              <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                                Lade Berechtigung...
                              </div>
                            ) : !user ? (
                           <button
                              type="button"
                              onClick={async () => {
                               try {
                                 const origin = window.location.origin;

                                 const currentPath =
                                  window.location.pathname + window.location.search;

                                 const redirectUrl =
                                  `${origin}/auth/callback?next=${encodeURIComponent(currentPath)}`;

                                await supabase.auth.signInWithOAuth({
                                 provider: "discord",
                                 options: {
                                  redirectTo: redirectUrl,
                                  },
                               });
                              } catch (error) {
                                console.error("Discord Login Fehler:", error);
                              }
                            }}
                            className="w-full p-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-[0_0_15px_rgba(88,101,242,0.3)] hover:-translate-y-0.5 text-center block"
                          >
                            Login mit Discord
                          </button>
                            ) : !hasRequiredRole ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setShowRolePopup(true)}
                                  className="w-full p-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:-translate-y-0.5 text-center block"
                                >
                                  Team VM Rolle fehlt
                                </button>
                              </>
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
                                              ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.15)]" 
                                              : "bg-black/40 border-white/10 text-white hover:bg-white/10"
                                            }`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className={`w-4 h-4 rounded-full border-2 transition-colors ${isSelected ? "border-yellow-400 bg-yellow-400" : "border-gray-500"} flex items-center justify-center shrink-0`}>
                                                {isSelected && <div className="w-2 h-2 bg-black rounded-full"></div>}
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
                                      className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none transition-all focus:border-yellow-500/50 focus:bg-white/5 text-sm" 
                                    />
                                    <input 
                                      type="text" 
                                      placeholder="Captain" 
                                      value={captain[t.id] ?? ""} 
                                      onChange={(e) => setCaptain((prev) => ({ ...prev, [t.id]: e.target.value }))} 
                                      className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none transition-all focus:border-yellow-500/50 focus:bg-white/5 text-sm" 
                                    />
                                  </>
                                )}

                                <button disabled={loading[t.id]} className="w-full p-3.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:-translate-y-0.5 active:translate-y-0 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                  {loading[t.id] ? "Lädt..." : isFull ? "Auf Warteliste setzen" : "Team Anmelden"}
                                </button>
                              </>
                            )}
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* POPUP ROLLEN CHECK */}
      {showRolePopup && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-[2rem] bg-[#0f0f14] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6 md:p-8 animate-in zoom-in-95 duration-300">
            
            <button
              onClick={() => setShowRolePopup(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
            >
              ✕
            </button>

            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black text-white mb-4">
                  Rolle fehlt
                </h2>

                <p className="text-gray-300 leading-relaxed text-base">
                  Ihr müsst euch zuerst die Rolle{" "}
                  <span className="text-yellow-400 font-bold">
                    „Team VM“ 🏆
                  </span>{" "}
                  im Channel{" "}
                  <span className="text-blue-400 font-bold">
                    #✅┃Beitreten
                  </span>{" "}
                  holen und euch anschließend auf der Website mit Discord
                  einloggen und euer Team anmelden oder ein neues erstellen.
                </p>
              </div>

              <a
                href="https://discord.gg/XJCZYWKQMm"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-4 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-black uppercase tracking-widest text-sm text-center transition-all hover:-translate-y-0.5 shadow-[0_0_20px_rgba(88,101,242,0.4)]"
              >
                Zum Channel #✅┃Beitreten
              </a>
            </div>
          </div>
        </div>
      )}

      {/* POPUP FÜR ANGEMELDETE TEAMS MIT TEAMCARDS */}
      {selectedTournamentTeams && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-[2rem] bg-[#0f0f14] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
            
            <div className="p-6 md:p-8 border-b border-white/10 flex-shrink-0 relative">
              <button
                onClick={() => setSelectedTournamentTeams(null)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
              >
                ✕
              </button>
              <h2 className="text-2xl font-black text-white pr-8">
                Teams: <span className="text-yellow-500">{selectedTournamentTeams.name}</span>
              </h2>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-grow custom-scrollbar">
              {/* Angemeldete Teams */}
              <div className="mb-8">
                <h3 className="text-sm uppercase tracking-widest font-bold text-green-400 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  Zugelassene Teams ({selectedTournamentTeams.tournament_registrations?.filter((r: any) => r.status === "approved").length || 0})
                </h3>
                {selectedTournamentTeams.tournament_registrations?.filter((r: any) => r.status === "approved").length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedTournamentTeams.tournament_registrations
                      .filter((r: any) => r.status === "approved")
                      .map((reg: any) => (
                        <TeamCard 
                          key={reg.id} 
                          team={reg.teams} 
                          isDu={reg.teams?.user_id === user?.id} 
                        />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">Noch keine Teams zugelassen.</p>
                )}
              </div>

              {/* Warteliste */}
              {selectedTournamentTeams.tournament_registrations?.filter((r: any) => r.status === "waiting").length > 0 && (
                <div>
                  <h3 className="text-sm uppercase tracking-widest font-bold text-yellow-500 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    Warteliste ({selectedTournamentTeams.tournament_registrations?.filter((r: any) => r.status === "waiting").length || 0})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-70 grayscale-[20%]">
                    {selectedTournamentTeams.tournament_registrations
                      .filter((r: any) => r.status === "waiting")
                      .map((reg: any) => (
                        <TeamCard 
                          key={reg.id} 
                          team={reg.teams} 
                          isDu={reg.teams?.user_id === user?.id} 
                        />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {message && <div className="fixed top-24 right-4 bg-black/90 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-top-4 border border-white/10 backdrop-blur-md font-bold">{message}</div>}
    </>
  );
}