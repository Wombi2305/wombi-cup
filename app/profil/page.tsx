"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// 🔥 XP-KURVE HELPER (Wird für den Fortschrittsbalken noch gebraucht)
const getRequiredXpForLevel = (level: number) => {
  if (level < 11) return Math.floor(50 + (level - 1) * (70 / 9)); 
  if (level < 21) return Math.floor(130 + (level - 11) * (70 / 9));
  if (level < 36) return Math.floor(210 + (level - 21) * (110 / 14));
  if (level < 46) return Math.floor(330 + (level - 36) * (120 / 9));
  if (level === 46) return 500;
  if (level === 47) return 550;
  if (level === 48) return 600;
  if (level === 49) return 650;
  return 700;
};

// 🔥 NEUE, SCHLANKE LOGIK
const getTeamStatsUI = (team: any) => {
  if (!team) return { level: 1, totalXp: 0, progress: 0, currentLevelXp: 0, requiredLevelXp: 50, tierImage: "/Bronze.png" };

  // 1. Gesamt-XP ausrechnen
  const totalXp = 
    (team.participations || 0) * 50 +
    (team.wins_top5 || 0) * 50 +
    (team.wins_top3 || 0) * 75 +
    (team.wins_top1 || 0) * 100 +
    (team.total_goals_scored || 0) * 10;

  // 2. Level DIREKT aus der Datenbank nehmen!
  const level = team.level || 1;

  // 3. Berechnen, wie viele XP für das *aktuelle* Level übrig sind (für den Ladebalken)
  let xpForPreviousLevels = 0;
  for (let i = 1; i < level; i++) {
    xpForPreviousLevels += getRequiredXpForLevel(i);
  }

  const currentLevelXp = Math.max(0, totalXp - xpForPreviousLevels);
  const requiredLevelXp = getRequiredXpForLevel(level);
  const progress = level === 50 ? 100 : Math.min(100, Math.max(0, (currentLevelXp / requiredLevelXp) * 100));

  // 4. Rang-Bild zuweisen
  let tierImage = "/Bronze.png";
  if (level >= 45) tierImage = "/Prisma.png";
  else if (level >= 40) tierImage = "/Amethyst.png";
  else if (level >= 35) tierImage = "/Sapphire.png";
  else if (level >= 30) tierImage = "/Emerald.png";
  else if (level >= 25) tierImage = "/Ruby.png";
  else if (level >= 20) tierImage = "/Gold.png";
  else if (level >= 10) tierImage = "/Silber.png";

  return { level, totalXp, progress, currentLevelXp, requiredLevelXp, tierImage };
};

export default function ProfilPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const [teamname, setTeamname] = useState("");
  const [captain, setCaptain] = useState("");

  const TEAMVM_ROLE = process.env.NEXT_PUBLIC_TEAMVM_ROLE_ID || "1492462340787011624";
  const ORGA_ROLE = "1492478735444873398";
  const SPIELER_ROLE = "1491812561119875154";
  const FREEAGENT_ROLE = "1492462347967664198";

  useEffect(() => {
    const fetchData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData.user;
      
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setUser(currentUser);

      const discordId = currentUser.user_metadata?.provider_id;

      const [discordRes, profileRes, teamsRes] = await Promise.all([
        discordId 
          ? fetch(`/api/discord/member?userId=${discordId}`).then(res => res.json()).catch(() => ({}))
          : Promise.resolve({}),
        supabase.from("profiles").select("*").eq("id", currentUser.id).single(),
        supabase.from("teams").select("*").eq("user_id", currentUser.id).eq("is_deleted", false).order("created_at", { ascending: true })
      ]);

      if (discordRes.roles) setUserRoles(discordRes.roles);
      if (profileRes.data) setProfile(profileRes.data);

      if (teamsRes.data && teamsRes.data.length > 0) {
        setAllTeams(teamsRes.data);
        const activeTeam = teamsRes.data.find(t => t.is_active) || teamsRes.data[0];
        setIsCreating(false);
        setSelectedTeamId(activeTeam.id);
        setTeamname(activeTeam.teamname || "");
        setCaptain(activeTeam.captain || "");
      } else {
        setIsCreating(true);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSelectTeam = (team: any, setCreating = false) => {
    setIsCreating(setCreating);
    if (setCreating) {
      setSelectedTeamId(null);
      setTeamname("");
      setCaptain("");
    } else {
      setSelectedTeamId(team.id);
      setTeamname(team.teamname || "");
      setCaptain(team.captain || "");
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreating) return;

    if (!teamname.trim()) return showMessage("❌ Teamname darf nicht leer sein");
    if (!captain.trim()) return showMessage("❌ Captain darf nicht leer sein");

    setSaving(true);

    try {
      const isFirstTeam = allTeams.length === 0;
      const { data: newTeam, error } = await supabase
        .from("teams")
        .insert([{ teamname, captain, user_id: user.id, is_active: isFirstTeam }])
        .select()
        .single();

      if (error) throw error;
      
      setAllTeams([...allTeams, newTeam]);
      handleSelectTeam(newTeam, false);
      showMessage("✅ Team erfolgreich erstellt!");
    } catch (err: any) {
      console.error(err);
      showMessage("❌ Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeamClick = () => {
    setDeleteConfirmName("");
    setShowDeleteModal(true);
  };

  const confirmDeleteTeam = async () => {
    if (!selectedTeamId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("teams").update({ is_deleted: true, is_active: false }).eq("id", selectedTeamId);
      if (error) throw error;

      const remainingTeams = allTeams.filter(t => t.id !== selectedTeamId);
      setAllTeams(remainingTeams);
      
      if (remainingTeams.length > 0) handleSelectTeam(remainingTeams[0], false);
      else handleSelectTeam(null, true);

      setShowDeleteModal(false);
      showMessage("🗑️ Team entfernt.");
    } catch (err) {
      console.error(err);
      showMessage("❌ Fehler beim Löschen");
    } finally {
      setSaving(false);
    }
  };

  const handleMakeActive = async () => {
    if (!selectedTeamId) return;
    setSaving(true);
    try {
      await supabase.from("teams").update({ is_active: false }).eq("user_id", user.id).eq("is_deleted", false);
      const { error } = await supabase.from("teams").update({ is_active: true }).eq("id", selectedTeamId);
      if (error) throw error;

      setAllTeams(allTeams.map(t => ({ ...t, is_active: t.id === selectedTeamId })));
      showMessage("✅ Team als aktiv gesetzt!");
    } catch (err) {
      console.error(err);
      showMessage("❌ Fehler beim Aktivieren");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-[calc(100vh-100px)] flex items-center justify-center text-white"><div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center text-white"><h2 className="text-2xl font-bold mb-2">Nicht eingeloggt</h2><p className="text-gray-400">Bitte logge dich über Discord ein, um dein Profil zu sehen.</p></div>;

  const avatarUrl = user.user_metadata?.avatar_url || "/default-avatar.png";
  const discordName = user.user_metadata?.full_name || "Discord User";
  const hasFormAccess = userRoles.includes(TEAMVM_ROLE) || userRoles.includes(ORGA_ROLE);
  const hasPlayerRole = userRoles.includes(SPIELER_ROLE) || userRoles.includes(FREEAGENT_ROLE);

  const currentTeam = allTeams.find(t => t.id === selectedTeamId);
  const teamStats = getTeamStatsUI(currentTeam); // 🔥 Nutzt jetzt die neue Funktion

  return (
    <>
      <main className="min-h-[calc(100vh-100px)] px-4 sm:px-6 pt-16 md:pt-10 pb-8 w-full max-w-5xl mx-auto text-white">
        <h1 className="text-3xl md:text-4xl font-black mb-8 tracking-tight drop-shadow-md">
          Mein <span className="text-yellow-500">Profil</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* --- DISCORD INFO --- */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col items-center text-center h-fit">
            <img src={avatarUrl} alt="Avatar" className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-2 border-yellow-500/50 mb-4 shadow-lg shadow-yellow-500/20" referrerPolicy="no-referrer" />
            <h2 className="text-xl font-bold mb-4">{discordName}</h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {profile?.role === "orga" && <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">👑 Orga</span>}
              {profile?.role === "teamvm" && <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">🛡️ TeamVM</span>}
              {profile?.role === "spieler" && <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">🎮 Spieler</span>}
              {profile?.role === "freeagent" && <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">🔍 Free Agent</span>}
            </div>
          </div>

          {/* --- DYNAMISCHE ANSICHT --- */}
          <div className="md:col-span-2">
            {hasFormAccess ? (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl h-full flex flex-col">
                {/* TABS */}
                <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
                  {allTeams.map((team) => (
                    <button key={team.id} onClick={() => handleSelectTeam(team, false)} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${selectedTeamId === team.id ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
                      {team.teamname}
                      {team.is_active && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                    </button>
                  ))}
                  <button onClick={() => handleSelectTeam(null, true)} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 border border-dashed ${isCreating ? "border-yellow-500 text-yellow-500 bg-yellow-500/10" : "border-white/20 text-gray-400 hover:border-white/50 hover:text-white"}`}>+ Neues Team</button>
                </div>

                {/* 🔥 TEAM LEVEL & STATS UI 🔥 */}
                {!isCreating && currentTeam && (
                  <div className="mb-8 bg-black/10 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4 z-10">
                      {currentTeam.is_active ? (
                        <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Aktiv</span>
                      ) : (
                        <button onClick={handleMakeActive} disabled={saving} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase transition">Als Aktiv setzen</button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-5 mt-4">
                      <img src={teamStats.tierImage} alt={`Rank Level ${teamStats.level}`} className="w-28 h-28 sm:w-36 sm:h-36 object-contain mix-blend-screen transition-transform hover:scale-105" />
                      <div className="flex-1 w-full">
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <h4 className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">Team Level</h4>
                            <div className="text-4xl sm:text-5xl font-black text-yellow-500 drop-shadow-md">{teamStats.level}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xl sm:text-2xl font-bold text-white">{teamStats.currentLevelXp}</span>
                            <span className="text-gray-500 text-sm font-medium"> / {teamStats.requiredLevelXp} XP</span>
                            <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">Gesamt: {teamStats.totalXp} XP</div>
                          </div>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden shadow-inner relative">
                          <div className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${teamStats.progress}%` }}>
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 sm:gap-3 text-center text-xs text-gray-400 mt-6">
                      <div className="bg-white/5 border border-white/5 rounded-xl p-2 flex flex-col justify-center">
                        <span className="text-white font-black text-base sm:text-lg">{currentTeam.participations || 0}</span><span className="truncate">Teilnahmen</span>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-xl p-2 flex flex-col justify-center">
                        <span className="text-white font-black text-base sm:text-lg">{currentTeam.wins_top1 || 0}</span><span className="truncate">Cup Siege</span>
                      </div>
                      {/* 🔥 HIER SIND DIE UMBENANNTEN LABELS: Top 4 & Top 8 */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-2 flex flex-col justify-center">
                        <span className="text-white font-black text-base sm:text-lg">{currentTeam.wins_top3 || 0}</span><span className="truncate">Top 4</span>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-xl p-2 flex flex-col justify-center">
                        <span className="text-white font-black text-base sm:text-lg">{currentTeam.wins_top5 || 0}</span><span className="truncate">Top 8</span>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-xl p-2 flex flex-col justify-center">
                        <span className="text-white font-black text-base sm:text-lg">{currentTeam.total_goals_scored || 0}</span><span className="truncate">Tore</span>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveTeam} className="flex flex-col gap-5 mt-auto">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2 ml-1">{isCreating ? "Teamname" : "Teamname (kann nicht geändert werden)"}</label>
                    <input type="text" value={teamname} onChange={(e) => setTeamname(e.target.value)} placeholder="Dein Teamname" disabled={!isCreating} className={`w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition ${!isCreating ? 'opacity-50 cursor-not-allowed' : ''}`} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2 ml-1">{isCreating ? "Captain (Ingame Name)" : "Captain (kann nicht geändert werden)"}</label>
                    <input type="text" value={captain} onChange={(e) => setCaptain(e.target.value)} placeholder="Riot ID / Captain Name" disabled={!isCreating} className={`w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition ${!isCreating ? 'opacity-50 cursor-not-allowed' : ''}`} />
                  </div>
                  
                  <div className="mt-2 flex flex-col gap-3">
                    {isCreating ? (
                      <button type="submit" disabled={saving} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl transition shadow-lg shadow-yellow-500/20 disabled:opacity-50">{saving ? "Speichern..." : "Team erstellen"}</button>
                    ) : (
                      <button type="button" onClick={handleDeleteTeamClick} disabled={saving} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-4 px-6 rounded-xl transition disabled:opacity-50">Team löschen</button>
                    )}
                  </div>
                </form>
              </div>
            ) : hasPlayerRole ? (
               <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-10 shadow-xl flex flex-col items-center justify-center text-center h-full relative overflow-hidden">
               <div className="w-full max-w-sm mb-6 relative rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10 group cursor-pointer">
                 <img src="/Spieleranalys.png" alt="Teaser Spieleranalyse" className="w-full h-auto object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-80"></div>
               </div>
               <h3 className="text-2xl font-bold mb-3 text-white flex items-center justify-center gap-2"><span>🚧</span> Profil in Arbeit <span>🚧</span></h3>
               <p className="text-gray-400 mb-8 max-w-md text-sm md:text-base leading-relaxed">Als Spieler oder Free Agent kannst du hier bald deine <strong>persönlichen Statistiken</strong> einsehen und nach passenden Teams suchen. Stay tuned!</p>
               <button disabled className="bg-white/5 border border-white/10 text-gray-500 font-bold py-3.5 px-8 rounded-xl cursor-not-allowed w-full sm:w-auto">Demnächst verfügbar</button>
             </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-10 shadow-xl flex flex-col items-center justify-center text-center h-full">
                <div className="text-6xl mb-6">👋</div>
                <h3 className="text-2xl font-bold mb-3 text-white">Fast geschafft!</h3>
                <p className="text-gray-400 mb-8 max-w-md text-sm md:text-base leading-relaxed">Um alle Funktionen der Website nutzen zu können, musst du auf unserem Discord sein. <br/><br/>Bitte tritt dem Server bei und hole dir im Kanal <strong>#beitreten</strong> eine Rolle.</p>
                <a href="https://discord.gg/2QsPJ6r5" target="_blank" rel="noreferrer" className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3.5 px-8 rounded-xl transition shadow-lg shadow-[#5865F2]/20 flex items-center justify-center gap-3 w-full sm:w-auto"><span>💬</span> Jetzt dem WombiCup Discord beitreten</a>
              </div>
            )}
          </div>
        </div>

        {message && <div className="fixed top-20 right-4 sm:right-6 bg-black/80 text-white px-6 py-3 rounded-lg shadow-2xl z-50 animate-in fade-in border border-white/10 backdrop-blur-md">{message}</div>}
      </main>

      {/* 🔥 LÖSCH-MODAL 🔥 */}
      {showDeleteModal && currentTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#111] border border-red-500/30 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-bold text-white mb-2">Team wirklich löschen?</h3>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">Diese Aktion entfernt das Team aus deinem Profil. Um Missbrauch zu verhindern, gib bitte den exakten Namen <strong className="text-red-400">{currentTeam.teamname}</strong> ein.</p>
            <input type="text" value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} placeholder="Teamname bestätigen" className="w-full bg-black/40 border border-red-500/20 rounded-xl p-4 text-white focus:outline-none focus:border-red-500 transition mb-6 placeholder-gray-600" />
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition">Abbrechen</button>
              <button onClick={confirmDeleteTeam} disabled={deleteConfirmName !== currentTeam.teamname || saving} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed">{saving ? "Lösche..." : "Löschen"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}