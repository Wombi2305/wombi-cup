"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// 🔥 BILD-KOMPRIMIERUNG HELPER
const resizeImage = (file: File, maxWidth = 400, maxHeight = 400): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height *= maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width *= maxHeight / height));
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
                type: "image/webp",
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error("Bildkonvertierung fehlgeschlagen"));
            }
          },
          "image/webp",
          0.8
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// 🔥 XP-KURVE HELPER
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

  const totalXp = 
    (team.participations || 0) * 50 +
    (team.wins_top5 || 0) * 50 +
    (team.wins_top3 || 0) * 75 +
    (team.wins_top1 || 0) * 100 +
    (team.total_goals_scored || 0) * 10;

  const level = team.level || 1;

  let xpForPreviousLevels = 0;
  for (let i = 1; i < level; i++) {
    xpForPreviousLevels += getRequiredXpForLevel(i);
  }

  const currentLevelXp = Math.max(0, totalXp - xpForPreviousLevels);
  const requiredLevelXp = getRequiredXpForLevel(level);
  const progress = level === 50 ? 100 : Math.min(100, Math.max(0, (currentLevelXp / requiredLevelXp) * 100));

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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const [teamname, setTeamname] = useState("");
  const [captain, setCaptain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

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
        setLogoUrl(activeTeam.logo_url || "");
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
      setLogoUrl("");
    } else {
      setSelectedTeamId(team.id);
      setTeamname(team.teamname || "");
      setCaptain(team.captain || "");
      setLogoUrl(team.logo_url || "");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const CRASH_LIMIT = 15 * 1024 * 1024; 
      if (file.size > CRASH_LIMIT) {
        showMessage("❌ Das Bild ist gigantisch (über 15MB). Bitte wähle ein etwas kleineres.");
        return;
      }

      setUploadingLogo(true);
      
      const optimizedFile = await resizeImage(file, 400, 400);
      
      const fileName = `team-${Date.now()}.webp`; 
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(filePath, optimizedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('team-logos').getPublicUrl(filePath);
      const newLogoUrl = data.publicUrl;
      
      setLogoUrl(newLogoUrl);

      if (!isCreating && selectedTeamId) {
        const { error: updateError } = await supabase
          .from('teams')
          .update({ logo_url: newLogoUrl })
          .eq('id', selectedTeamId);
          
        if (updateError) throw updateError;
        
        setAllTeams(allTeams.map(t => t.id === selectedTeamId ? { ...t, logo_url: newLogoUrl } : t));
        showMessage("✅ Team Logo aktualisiert!");
      } else {
        showMessage("✅ Logo hochgeladen! Speichere das Team, um es abzuschließen.");
      }
      
    } catch (error: any) {
      console.error(error);
      showMessage("❌ Fehler beim Hochladen des Logos");
    } finally {
      setUploadingLogo(false);
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
        .insert([{ 
          teamname, 
          captain, 
          user_id: user.id, 
          is_active: isFirstTeam,
          logo_url: logoUrl
        }])
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
  const teamStats = getTeamStatsUI(currentTeam);

  return (
    <>
      <main className="min-h-[calc(100vh-100px)] px-4 sm:px-6 pt-10 pb-32 w-full max-w-5xl mx-auto text-white">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
          
          {/* --- LINKE SPALTE --- */}
          <div className="flex flex-col gap-6 md:gap-8 lg:col-span-1">
            
            {/* 🔥 ÜBERSCHRIFT HIERHER VERSCHOBEN (Jetzt drückt sie rechts nichts mehr runter) 🔥 */}
            <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-lg pt-2">
              Mein <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Profil</span>
            </h1>

            {/* --- DISCORD INFO --- */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative mb-6">
                <img src={avatarUrl} alt="Avatar" className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-[#1a1a1a] shadow-[0_0_15px_rgba(250,204,21,0.3)] relative z-10" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 rounded-full border-2 border-yellow-500/50 scale-105"></div>
              </div>
              
              <h2 className="text-2xl font-bold mb-5 tracking-wide">{discordName}</h2>
              <div className="flex flex-wrap gap-2 justify-center w-full">
                {profile?.role === "orga" && <span className="w-full bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">👑 Orga</span>}
                {profile?.role === "teamvm" && <span className="w-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">🛡️ TeamVM</span>}
                {profile?.role === "spieler" && <span className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">🎮 Spieler</span>}
                {profile?.role === "freeagent" && <span className="w-full bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">🔍 Free Agent</span>}
              </div>
            </div>

            {/* --- TEAM LOGO UPLOAD --- */}
            {hasFormAccess && (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center relative overflow-hidden">
                
                <label className="relative group cursor-pointer mb-6 block mt-2">
                  <div className="relative z-10 w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-[#1a1a1a] shadow-[0_0_15px_rgba(250,204,21,0.3)] bg-black/50 overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Team Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl text-gray-500">🛡️</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-yellow-500/50 scale-[1.05] pointer-events-none transition-transform duration-300 group-hover:scale-[1.10] z-0"></div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
                
                <div className="text-center w-full relative z-10">
                  <h4 className="text-white font-bold text-xl mb-2 flex items-center justify-center gap-2">
                    Team Logo {uploadingLogo && <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>}
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-[200px] mx-auto">
                    Klicke auf das Bild, um ein Logo hochzuladen.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* --- RECHTE SPALTE (Rutscht jetzt komplett mit nach oben) --- */}
          <div className="lg:col-span-2">
            {hasFormAccess ? (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col relative overflow-hidden">
                
                {/* TABS */}
                <div className="mb-8 flex flex-wrap gap-2 bg-black/40 p-1.5 rounded-2xl w-fit border border-white/5 mx-auto">
                  {allTeams.map((team) => (
                    <button key={team.id} onClick={() => handleSelectTeam(team, false)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${selectedTeamId === team.id ? "bg-white/10 text-yellow-400 shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                      {team.logo_url ? (
                        <img src={team.logo_url} alt="Logo" className="w-5 h-5 rounded-full object-cover border border-white/20" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px]">🛡️</span>
                      )}
                      {team.teamname}
                      {team.is_active && <span className="w-2 h-2 rounded-full bg-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)] animate-pulse"></span>}
                    </button>
                  ))}
                  <button onClick={() => handleSelectTeam(null, true)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isCreating ? "bg-yellow-500/10 text-yellow-500" : "text-gray-500 hover:text-white hover:bg-white/5"}`}>
                    <span className="text-lg leading-none">+</span> Neu
                  </button>
                </div>

                {/* 🔥 TEAM LEVEL & STATS UI 🔥 */}
                {!isCreating && currentTeam && (
                  <div className="bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 rounded-3xl p-6 md:p-8 relative">
                    <div className="absolute top-6 right-6 z-10">
                      {currentTeam.is_active ? (
                        <span className="bg-green-500/10 text-green-400 border border-green-500/30 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 backdrop-blur-md">
                          <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span> Aktiv
                        </span>
                      ) : (
                        <button onClick={handleMakeActive} disabled={saving} className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">Als Aktiv setzen</button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-8 mb-8 mt-2">
                      <img src={teamStats.tierImage} alt={`Rank Level ${teamStats.level}`} className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-[0_0_25px_rgba(250,204,21,0.2)] hover:scale-105 transition-transform duration-500" />
                      <div className="flex-1 w-full">
                        <div className="flex justify-between items-end mb-3">
                          <div>
                            <h4 className="text-gray-500 text-xs uppercase tracking-widest font-bold mb-1">Team Level</h4>
                            <div className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 drop-shadow-sm">{teamStats.level}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-white">{teamStats.currentLevelXp}</span>
                            <span className="text-gray-500 text-sm font-medium ml-1">/ {teamStats.requiredLevelXp} XP</span>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Gesamt: <span className="text-gray-400">{teamStats.totalXp}</span></div>
                          </div>
                        </div>
                        <div className="w-full bg-black/60 rounded-full h-3.5 overflow-hidden border border-white/5 shadow-inner">
                          <div className="bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300 h-full rounded-full transition-all duration-1000 ease-out relative shadow-[0_0_10px_rgba(250,204,21,0.5)]" style={{ width: `${teamStats.progress}%` }}>
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-3 md:gap-4 text-center">
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-3 flex flex-col justify-center transition-all hover:bg-white/5 hover:-translate-y-1">
                        <span className="text-white font-black text-xl md:text-2xl drop-shadow-md">{currentTeam.participations || 0}</span>
                        <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-1 font-semibold truncate">Events</span>
                      </div>
                      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-3 flex flex-col justify-center transition-all hover:bg-yellow-500/10 hover:-translate-y-1 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
                        <span className="text-yellow-400 font-black text-xl md:text-2xl drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">{currentTeam.wins_top1 || 0}</span>
                        <span className="text-[10px] md:text-xs text-yellow-500/80 uppercase tracking-widest mt-1 font-semibold truncate">Siege</span>
                      </div>
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-3 flex flex-col justify-center transition-all hover:bg-white/5 hover:-translate-y-1">
                        <span className="text-white font-black text-xl md:text-2xl drop-shadow-md">{currentTeam.wins_top3 || 0}</span>
                        <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-1 font-semibold truncate">Top 4</span>
                      </div>
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-3 flex flex-col justify-center transition-all hover:bg-white/5 hover:-translate-y-1">
                        <span className="text-white font-black text-xl md:text-2xl drop-shadow-md">{currentTeam.wins_top5 || 0}</span>
                        <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-1 font-semibold truncate">Top 8</span>
                      </div>
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-3 flex flex-col justify-center transition-all hover:bg-white/5 hover:-translate-y-1">
                        <span className="text-white font-black text-xl md:text-2xl drop-shadow-md">{currentTeam.total_goals_scored || 0}</span>
                        <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-1 font-semibold truncate">Tore</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🔥 TRANSFER & TEAM BUTTONS 🔥 */}
                {!isCreating && currentTeam && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 mb-6">
                    <button 
                      onClick={() => showMessage("👥 Teammitglieder-Ansicht kommt bald!")}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 px-4 rounded-xl transition-all hover:border-white/20 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      Teammitglieder
                    </button>
                    
                    <button 
                      onClick={() => showMessage("🛒 Transfermarkt öffnet sich bald!")}
                      className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-bold py-3.5 px-4 rounded-xl transition-all hover:border-blue-500/40 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                      Transfermarkt
                    </button>
                  </div>
                )}

                {/* 🔥 VISUELLE TRENNLINIE 🔥 */}
                {!isCreating && <hr className="border-t border-white/5 mb-8 w-3/4 mx-auto" />}

                {/* 🔥 FORMULAR 🔥 */}
                <form onSubmit={handleSaveTeam} className="flex flex-col gap-6 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[11px] uppercase tracking-widest text-gray-400 font-bold ml-1">{isCreating ? "Teamname" : "Teamname (Fix)"}</label>
                      <input type="text" value={teamname} onChange={(e) => setTeamname(e.target.value)} placeholder="Dein Teamname" disabled={!isCreating} className={`w-full bg-black/40 border border-white/5 shadow-inner rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 transition-all ${!isCreating ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'}`} />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] uppercase tracking-widest text-gray-400 font-bold ml-1">{isCreating ? "Captain (Riot ID)" : "Captain (Fix)"}</label>
                      <input type="text" value={captain} onChange={(e) => setCaptain(e.target.value)} placeholder="Riot ID eingeben" disabled={!isCreating} className={`w-full bg-black/40 border border-white/5 shadow-inner rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 transition-all ${!isCreating ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'}`} />
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    {isCreating ? (
                      <button type="submit" disabled={saving || uploadingLogo} className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                        {saving ? "Wird gespeichert..." : "Team erstellen"}
                      </button>
                    ) : (
                      <button type="button" onClick={handleDeleteTeamClick} disabled={saving || uploadingLogo} className="w-full bg-black/20 hover:bg-red-500/10 text-red-500/80 hover:text-red-500 border border-red-500/10 hover:border-red-500/30 font-bold py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100 transition-opacity"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        Team unwiderruflich löschen
                      </button>
                    )}
                  </div>
                </form>
              </div>
            ) : hasPlayerRole ? (
               <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl flex flex-col items-center justify-center text-center h-full relative overflow-hidden">
               <div className="w-full max-w-sm mb-6 relative rounded-2xl overflow-hidden shadow-2xl shadow-black border border-white/10 group cursor-pointer">
                 <img src="/Spieleranalys.png" alt="Teaser Spieleranalyse" className="w-full h-auto object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90"></div>
               </div>
               <h3 className="text-3xl font-bold mb-3 text-white">🚧 Profil in Arbeit 🚧</h3>
               <p className="text-gray-400 mb-8 max-w-md text-sm md:text-base leading-relaxed">Als Spieler oder Free Agent kannst du hier bald deine <strong className="text-white">persönlichen Statistiken</strong> einsehen und nach passenden Teams suchen. Stay tuned!</p>
               <button disabled className="bg-white/5 border border-white/10 text-gray-500 font-bold py-3.5 px-8 rounded-xl cursor-not-allowed w-full sm:w-auto uppercase tracking-widest text-xs">Demnächst verfügbar</button>
             </div>
            ) : (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl flex flex-col items-center justify-center text-center h-full">
                <div className="text-7xl mb-6 drop-shadow-lg animate-bounce">👋</div>
                <h3 className="text-3xl font-bold mb-3 text-white">Fast geschafft!</h3>
                <p className="text-gray-400 mb-8 max-w-md text-sm md:text-base leading-relaxed">Um alle Funktionen der Website nutzen zu können, musst du auf unserem Discord sein. <br/><br/>Bitte tritt dem Server bei und hole dir im Kanal <strong className="text-white bg-white/10 px-2 py-0.5 rounded">#beitreten</strong> eine Rolle.</p>
                <a href="https://discord.gg/2QsPJ6r5" target="_blank" rel="noreferrer" className="bg-[#5865F2] hover:bg-[#4752C4] hover:-translate-y-1 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(88,101,242,0.4)] flex items-center justify-center gap-3 w-full sm:w-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 127.14 96.36"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.3,46,96.19,53,91.08,65.69,84.69,65.69Z"/></svg>
                  Jetzt dem WombiCup Discord beitreten
                </a>
              </div>
            )}
          </div>
        </div>

        {message && <div className="fixed top-24 right-4 sm:right-6 bg-[#111] text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 border border-white/10 backdrop-blur-md flex items-center gap-3 font-medium">
          {message}
        </div>}
      </main>

      {/* 🔥 LÖSCH-MODAL 🔥 */}
      {showDeleteModal && currentTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md px-4">
          <div className="bg-[#0a0a0a] border border-red-500/20 rounded-3xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(220,38,38,0.15)] animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-white mb-3">Team wirklich löschen?</h3>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">Diese Aktion entfernt das Team unwiderruflich. Bitte gib zur Bestätigung den exakten Namen <strong className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{currentTeam.teamname}</strong> ein.</p>
            <input type="text" value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} placeholder="Teamname bestätigen" className="w-full bg-black border border-white/10 focus:border-red-500/50 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all mb-8 placeholder-gray-600" />
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-colors">Abbrechen</button>
              <button onClick={confirmDeleteTeam} disabled={deleteConfirmName !== currentTeam.teamname || saving} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:shadow-none">{saving ? "Wird gelöscht..." : "Endgültig löschen"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}