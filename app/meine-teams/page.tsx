"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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

// 🔥 SCHLANKE LOGIK FÜR STATS
const getTeamStatsUI = (team: any) => {
  if (!team) return { level: 1, totalXp: 0, progress: 0, currentLevelXp: 0, requiredLevelXp: 50, tierImage: "/Bronze.png" };

  const totalXp = team.total_xp || 0;
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

// 🔥 DYNAMISCHE FARBEN WIE IN DER TURNIERTABELLE
const getTierStyles = (level: number) => {
  const l = level || 1;
  if (l >= 45) return { bg: "bg-fuchsia-500/20", border: "border-fuchsia-500/40", text: "text-fuchsia-50" };
  if (l >= 40) return { bg: "bg-purple-500/20", border: "border-purple-500/40", text: "text-purple-50" };
  if (l >= 35) return { bg: "bg-blue-500/20", border: "border-blue-500/40", text: "text-blue-50" };
  if (l >= 30) return { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-50" };
  if (l >= 25) return { bg: "bg-red-500/20", border: "border-red-500/40", text: "text-red-50" };
  if (l >= 20) return { bg: "bg-yellow-500/20", border: "border-yellow-500/40", text: "text-yellow-50" };
  if (l >= 10) return { bg: "bg-slate-400/20", border: "border-slate-400/40", text: "text-slate-50" };
  return { bg: "bg-amber-700/20", border: "border-amber-700/40", text: "text-amber-50" };
};

export default function MeineTeamsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"overview" | "inventory" | "members">("overview");
  
  const [cosmeticTab, setCosmeticTab] = useState<"banner" | "color" | "border">("banner");
  const [pendingCosmetics, setPendingCosmetics] = useState<{banner?: string, color?: string, border?: string, background?: string}>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Modals & Form
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistData, setWaitlistData] = useState<any[]>([]);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [teamname, setTeamname] = useState("");
  const [captain, setCaptain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Teammitglieder State
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData.user;
      
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setUser(currentUser);

      const [profileRes, teamsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", currentUser.id).single(),
        supabase.from("teams").select("*").eq("user_id", currentUser.id).eq("is_deleted", false).order("created_at", { ascending: true })
      ]);

      if (profileRes.data) setProfile(profileRes.data);

      if (teamsRes.data && teamsRes.data.length > 0) {
        setAllTeams(teamsRes.data);
        const activeTeam = teamsRes.data.find((t: any) => t.is_active) || teamsRes.data[0];
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

  const currentTeam = useMemo(() => allTeams.find(t => t.id === selectedTeamId), [allTeams, selectedTeamId]);

  // Lade Teammitglieder wenn der Tab "members" aktiv ist
  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedTeamId || !currentTeam || activeTab !== "members") return;
      setLoadingMembers(true);
      
      try {
        const theCaptain = {
          id: `captain-${currentTeam.id}`,
          user_id: currentTeam.user_id,
          role: 'captain',
          profiles: { 
            ea_ingame_name: currentTeam.captain, 
            discord_id: "Team-Gründer" 
          }
        };

        const { data, error } = await supabase
          .from('team_members')
          .select('id, user_id, role, profiles(id, discord_id, ea_ingame_name)')
          .eq('team_id', selectedTeamId);

        if (error) {
          console.error("Fehler beim Laden der Mitglieder", error.message);
          setMembers([theCaptain]);
        } else {
          const dbMembers = (data || []).filter(m => m.user_id !== currentTeam.user_id);
          setMembers([theCaptain, ...dbMembers]);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Mitglieder", err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [activeTab, selectedTeamId, currentTeam]);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }, []);

  // 🔗 LINK KOPIEREN HELPER
  const handleCopyInviteLink = () => {
    if (!currentTeam) return;
    const inviteLink = `${window.location.origin}/invite/${currentTeam.id}`;
    navigator.clipboard.writeText(inviteLink);
    showMessage("✅ Einladungslink in die Zwischenablage kopiert!");
  };

  const handleSelectTeam = useCallback((team: any, setCreating = false) => {
    setIsCreating(setCreating);
    setActiveTab("overview");
    setPendingCosmetics({}); 
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
  }, []);

  const hasFormAccess = useMemo(() => {
    return profile?.role === "teamvm" || profile?.role === "orga";
  }, [profile]);

  // Kosmetik Speichern...
  const handleSelectCosmetic = useCallback((category: "banner" | "color" | "border" | "background", itemValue: string) => {
    if (!selectedTeamId || isCreating || !currentTeam) return;

    const currentlyEquipped = currentTeam[`equipped_${category}`] || 'default';

    setPendingCosmetics(prev => {
      const currentlyDisplayed = prev[category] !== undefined ? prev[category] : currentlyEquipped;
      const newPending = { ...prev };
      
      if (currentlyDisplayed === itemValue) {
        if (currentlyEquipped === 'default') delete newPending[category];
        else newPending[category] = 'default';
      } else {
        if (itemValue === currentlyEquipped) delete newPending[category];
        else newPending[category] = itemValue;
      }
      return newPending;
    });
  }, [selectedTeamId, isCreating, currentTeam]);

  const handleSaveCosmetics = async () => {
    if (!selectedTeamId || Object.keys(pendingCosmetics).length === 0) return;
    setSaving(true);
    
    try {
      const updates: any = {};
      if (pendingCosmetics.banner !== undefined) updates.equipped_banner = pendingCosmetics.banner;
      if (pendingCosmetics.color !== undefined) updates.equipped_color = pendingCosmetics.color;
      if (pendingCosmetics.border !== undefined) updates.equipped_border = pendingCosmetics.border;
      if (pendingCosmetics.background !== undefined) updates.equipped_background = pendingCosmetics.background;

      const { error } = await supabase.from('teams').update(updates).eq('id', selectedTeamId);
      if (error) throw error;

      setAllTeams(prev => prev.map(t => t.id === selectedTeamId ? { ...t, ...updates } : t));
      setPendingCosmetics({}); 
      showMessage("✅ Aussehen erfolgreich gespeichert!");
    } catch (error) {
      showMessage("❌ Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  // Warteliste / Tickets ...
  const openWaitlistModal = async () => {
    if (!selectedTeamId) return;
    setShowWaitlistModal(true);
    setLoadingWaitlist(true);
    
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('id, tournament_id, status, tournaments(id, name, max_teams)')
        .eq('team_id', selectedTeamId)
        .in('status', ['waiting', 'waitlist', 'Waitlist', 'warteliste', 'Warteliste', 'pending']); 
        
      if (error) throw error;

      const formattedData = (data || []).map((reg: any) => ({
        ...reg,
        tournaments: Array.isArray(reg.tournaments) ? reg.tournaments[0] : reg.tournaments
      }));

      setWaitlistData(formattedData);
    } catch (err) {
      showMessage("❌ Fehler beim Laden der Wartelisten.");
    } finally {
      setLoadingWaitlist(false);
    }
  };

  const confirmWaitlistSkip = async (regId: number, tournamentId: number, maxTeams: number | null) => {
    if (!selectedTeamId || !currentTeam) return;
    setSaving(true);
    
    try {
      const { count, error: countError } = await supabase
        .from('tournament_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('status', 'approved');

      if (countError) throw countError;

      const isFull = maxTeams ? (count || 0) >= maxTeams : false;

      if (!isFull) {
        const { error } = await supabase.from('tournament_registrations').update({ status: 'approved' }).eq('id', regId);
        if (error) throw error;
        showMessage("🎉 Ticket eingelöst! Ihr seid jetzt FEST im Turnier!");
      } else {
        const { error } = await supabase.from('tournament_registrations').update({ created_at: '2000-01-01T00:00:00Z' }).eq('id', regId);
        if (error) throw error;
        showMessage("🔥 Ticket eingelöst! Ihr seid jetzt auf Platz 1 der Warteliste!");
      }

      const newTicketAmount = currentTeam.waitlist_tickets - 1;
      await supabase.from('teams').update({ waitlist_tickets: newTicketAmount }).eq('id', selectedTeamId);

      setAllTeams(prev => prev.map(t => t.id === selectedTeamId ? { ...t, waitlist_tickets: newTicketAmount } : t));
      setShowWaitlistModal(false);
    } catch (error) {
      showMessage("❌ Fehler beim Einlösen des Tickets.");
    } finally {
      setSaving(false);
    }
  };

  const handleRedeemTicket = async (ticketColumn: string, rewardName: string) => {
    if (!selectedTeamId || !currentTeam) return;
    
    if ((currentTeam[ticketColumn] || 0) <= 0) {
      showMessage(`❌ Du hast keine Tickets mehr für: ${rewardName}`);
      return;
    }

    if (ticketColumn === 'waitlist_tickets') {
      openWaitlistModal();
      return;
    }

    if (ticketColumn === 'double_xp_matches') {
      setSaving(true);
      try {
        const newTicketAmount = currentTeam.double_xp_matches - 1;
        const newActiveBoosts = (currentTeam.active_xp_boosts || 0) + 8; 
        
        const { error } = await supabase
          .from('teams')
          .update({ double_xp_matches: newTicketAmount, active_xp_boosts: newActiveBoosts })
          .eq('id', selectedTeamId);

        if (error) throw error;
        
        setAllTeams(prev => prev.map(t => t.id === selectedTeamId ? { ...t, double_xp_matches: newTicketAmount, active_xp_boosts: newActiveBoosts } : t));
        showMessage("✅ XP-BOOST AKTIVIERT! Eure nächsten 8 Siege bringen Doppelte-XP!");
      } catch (err) {
        showMessage("❌ Fehler beim Einlösen.");
      } finally {
        setSaving(false); 
      }
      return;
    }

    if (ticketColumn === 'random_tickets') {
      setSaving(true);
      try {
        const newRandomTickets = currentTeam.random_tickets - 1;
        const roll = Math.random();
        let updates: any = { random_tickets: newRandomTickets };
        let rewardMessage = "";

        if (roll < 0.60) {
          updates.active_xp_boosts = (currentTeam.active_xp_boosts || 0) + 8;
          rewardMessage = "🎉 Glückwunsch! Du hast einen 8-Spiele XP-Boost gezogen!";
        } else if (roll < 0.85) {
          updates.feature_tickets = (currentTeam.feature_tickets || 0) + 1;
          rewardMessage = "🎉 Glückwunsch! Du hast ein Feature Match Ticket gezogen!";
        } else if (roll < 0.95) {
          updates.waitlist_tickets = (currentTeam.waitlist_tickets || 0) + 1;
          rewardMessage = "🎉 Glückwunsch! Du hast ein Warteliste-Skip Ticket gezogen!";
        } else {
          updates.active_xp_boosts = (currentTeam.active_xp_boosts || 0) + 8;
          updates.feature_tickets = (currentTeam.feature_tickets || 0) + 1;
          updates.waitlist_tickets = (currentTeam.waitlist_tickets || 0) + 1;
          rewardMessage = "🎰 JACKPOT! 8-Spiele XP-Boost + Feature Match + Warteliste-Skip!";
        }

        const { error } = await supabase.from('teams').update(updates).eq('id', selectedTeamId);
        if (error) throw error;
        
        setAllTeams(prev => prev.map(t => t.id === selectedTeamId ? { ...t, ...updates } : t));
        showMessage(rewardMessage);
      } catch (error) {
        showMessage("❌ Fehler beim Öffnen der Lootbox.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const newTicketAmount = currentTeam[ticketColumn] - 1;
      const { error: updateError } = await supabase.from('teams').update({ [ticketColumn]: newTicketAmount }).eq('id', selectedTeamId);
      if (updateError) throw updateError;

      await supabase.from('orga_alerts').insert([{
        team_id: selectedTeamId,
        teamname: currentTeam.teamname,
        level: currentTeam.level,
        reward_name: `TICKET EINGELÖST: ${rewardName}`
      }]);

      setAllTeams(prev => prev.map(t => t.id === selectedTeamId ? { ...t, [ticketColumn]: newTicketAmount } : t));
      showMessage(`✅ Ticket erfolgreich eingelöst! Die Orga wurde benachrichtigt.`);
    } catch (error) {
      showMessage("❌ Fehler beim Einlösen des Tickets.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 15 * 1024 * 1024) {
        showMessage("❌ Das Bild ist gigantisch (über 15MB). Bitte wähle ein etwas kleineres.");
        return;
      }

      setUploadingLogo(true);
      const optimizedFile = await resizeImage(file, 400, 400);
      const fileName = `team-${Date.now()}.webp`; 
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('team-logos').upload(filePath, optimizedFile);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('team-logos').getPublicUrl(filePath);
      const newLogoUrl = data.publicUrl;
      setLogoUrl(newLogoUrl);

      if (!isCreating && selectedTeamId) {
        await supabase.from('teams').update({ logo_url: newLogoUrl }).eq('id', selectedTeamId);
        setAllTeams(prev => prev.map(t => t.id === selectedTeamId ? { ...t, logo_url: newLogoUrl } : t));
        showMessage("✅ Team Logo aktualisiert!");
      } else {
        showMessage("✅ Logo hochgeladen! Speichere das Team, um es abzuschließen.");
      }
    } catch (error: any) {
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
        .insert([{ teamname, captain, user_id: user.id, is_active: isFirstTeam, logo_url: logoUrl }])
        .select()
        .single();

      if (error) throw error;
      
      setAllTeams(prev => [...prev, newTeam]);
      handleSelectTeam(newTeam, false);
      showMessage("✅ Team erfolgreich erstellt!");
    } catch (err: any) {
      showMessage("❌ Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteTeam = async () => {
    if (!selectedTeamId) return;
    setSaving(true);
    try {
      await supabase.from("teams").update({ is_deleted: true, is_active: false }).eq("id", selectedTeamId);

      const remainingTeams = allTeams.filter(t => t.id !== selectedTeamId);
      setAllTeams(remainingTeams);
      
      if (remainingTeams.length > 0) handleSelectTeam(remainingTeams[0], false);
      else handleSelectTeam(null, true);

      setShowDeleteModal(false);
      showMessage("🗑️ Team entfernt.");
    } catch (err) {
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
      await supabase.from("teams").update({ is_active: true }).eq("id", selectedTeamId);

      setAllTeams(prev => prev.map(t => ({ ...t, is_active: t.id === selectedTeamId })));
      showMessage("✅ Team als aktiv gesetzt!");
    } catch (err) {
      showMessage("❌ Fehler beim Aktivieren");
    } finally {
      setSaving(false);
    }
  };

  // --- LOGIK FÜR TEAMMITGLIEDER ---
  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase.from('team_members').update({ role: newRole }).eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      showMessage("✅ Rolle aktualisiert.");
    } catch (error) {
      showMessage("❌ Fehler beim Ändern der Rolle.");
    }
  };

  const handleKickMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Möchtest du ${memberName} wirklich aus dem Team werfen?`)) return;
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
      showMessage(`🚪 ${memberName} wurde aus dem Team entfernt.`);
    } catch (error) {
      showMessage("❌ Fehler beim Entfernen.");
    }
  };

  const { teamStats, tierStyles, previewSettings } = useMemo(() => {
    const stats = getTeamStatsUI(currentTeam);
    const styles = getTierStyles(stats.level);
    
    const getCosmeticValue = (category: "banner" | "color" | "border" | "background") => {
      if (pendingCosmetics[category] !== undefined) return pendingCosmetics[category];
      if (currentTeam) return currentTeam[`equipped_${category}`] || 'default';
      return 'default';
    };

    const borderVal = getCosmeticValue('border');
    const bannerVal = getCosmeticValue('banner');
    const colorVal = getCosmeticValue('color');

    return {
      teamStats: stats,
      tierStyles: styles,
      previewSettings: {
        border: borderVal === '1' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : styles.border,
        banner: bannerVal,
        bg: styles.bg,
        colorClass: colorVal === '1' ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400' : styles.text,
        getValue: getCosmeticValue
      }
    };
  }, [currentTeam, pendingCosmetics]);

  const hasUnsavedChanges = Object.keys(pendingCosmetics).length > 0;

  if (loading) return <div className="min-h-[calc(100vh-100px)] flex items-center justify-center text-white"><div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center text-white"><h2 className="text-2xl font-bold mb-2">Nicht eingeloggt</h2><p className="text-gray-400">Bitte logge dich über Discord ein.</p></div>;

  if (!hasFormAccess) {
    return (
      <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 pt-10 pb-8 w-full max-w-5xl mx-auto text-white flex flex-col items-center justify-center">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center justify-center text-center w-full max-w-2xl relative overflow-hidden transform-gpu">
          
          <div className="w-full mb-6 relative rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-white/5">
            <img src="/TeamVM_InArbeit.png" alt="In Arbeit" className="w-full h-auto object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90"></div>
            
            <div className="absolute bottom-4 left-0 w-full text-center z-10 px-4">
              <h3 className="text-2xl md:text-3xl font-black text-white drop-shadow-md">🚧 Zugriff nur für TeamVM 🚧</h3>
            </div>
          </div>

          <p className="text-gray-400 text-sm md:text-base leading-relaxed">
            Aktuell können nur die <strong className="text-yellow-500">TeamVMs</strong> ihre Teams einsehen.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 pt-6 pb-12 w-full max-w-6xl mx-auto text-white flex flex-col">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* --- LINKE SPALTE: LOGO & VORSCHAU --- */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            
            <h1 className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-lg mt-1">
              Meine <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Teams</span>
            </h1>

            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col items-center relative overflow-hidden transform-gpu">
              <label className="relative cursor-pointer mb-3 block mt-1">
                <div className="relative z-10 w-24 h-24 rounded-full border-4 border-[#1a1a1a] shadow-[0_0_15px_rgba(250,204,21,0.3)] bg-black/50 overflow-hidden flex items-center justify-center transition-transform duration-300">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Team Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl text-gray-500">🛡️</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-yellow-500/50 scale-[1.05] pointer-events-none transition-transform duration-300 z-0"></div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </label>
              
              <div className="text-center w-full relative z-10">
                <h4 className="text-white font-bold text-sm mb-1 flex items-center justify-center gap-2">
                  Team Logo {uploadingLogo && <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>}
                </h4>
                <p className="text-[10px] text-gray-400 leading-relaxed max-w-[180px] mx-auto">
                  Klicke, um ein Logo hochzuladen.
                </p>
              </div>
            </div>

            {!isCreating && currentTeam && (
              <div className="hidden lg:flex bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl flex-col relative overflow-hidden transform-gpu">
                <h4 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3 pl-1 text-center">Vorschau: Team Karte</h4>
                <div className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-md border text-sm md:text-base font-bold transition duration-500 relative overflow-hidden ${previewSettings.border} ${previewSettings.bg}`}>
                  {previewSettings.banner !== 'default' && (
                    <img src={`/rewards/banner_${previewSettings.banner}.png`} alt="" className="absolute inset-0 w-full h-full object-cover object-center scale-[1.05] pointer-events-none" onError={(e) => e.currentTarget.style.display = 'none'} />
                  )}
                  <div className="relative z-10 flex items-center gap-3 w-full">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Team Logo Preview" className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/20 bg-black/40 shadow-sm" />
                    ) : (
                      <img src={teamStats.tierImage} alt="Rank" className="w-8 h-8 object-contain shrink-0" />
                    )}
                    <span className={`whitespace-nowrap truncate tracking-tight transition-colors duration-500 ${previewSettings.colorClass}`}>
                      {teamname || "Teamname"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- RECHTE SPALTE: TEAM VERWALTUNG TABS --- */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col h-fit transform-gpu">
              
              <div className="mb-4 flex flex-wrap gap-2 bg-black/40 p-1.5 rounded-2xl w-fit border border-white/5 mx-auto">
                {allTeams.map((team) => (
                  <button key={team.id} onClick={() => handleSelectTeam(team, false)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-300 flex items-center gap-2 ${selectedTeamId === team.id ? "bg-white/10 text-yellow-400 shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                    {team.logo_url ? (
                      <img src={team.logo_url} alt="Logo" className="w-5 h-5 rounded-full object-cover border border-white/20" />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px]">🛡️</span>
                    )}
                    {team.teamname}
                    {team.is_active && <span className="w-1.5 h-1.5 rounded-full bg-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)] animate-pulse"></span>}
                  </button>
                ))}
                <button onClick={() => handleSelectTeam(null, true)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${isCreating ? "bg-yellow-500/10 text-yellow-500" : "text-gray-500 hover:text-white hover:bg-white/5"}`}>
                  <span className="text-base leading-none">+</span> Neu
                </button>
              </div>

              {/* TABS NAVIGATION */}
              {!isCreating && currentTeam && (
                <div className="flex justify-center gap-4 sm:gap-6 border-b border-white/10 mb-5 px-2">
                  <button onClick={() => setActiveTab("overview")} className={`pb-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 ${activeTab === "overview" ? "border-yellow-500 text-yellow-500" : "border-transparent text-gray-500 hover:text-white"}`}>
                    Übersicht
                  </button>
                  <button onClick={() => setActiveTab("inventory")} className={`pb-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 ${activeTab === "inventory" ? "border-yellow-500 text-yellow-500" : "border-transparent text-gray-500 hover:text-white"}`}>
                    Inventar & Stil
                  </button>
                  <button onClick={() => setActiveTab("members")} className={`pb-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 ${activeTab === "members" ? "border-yellow-500 text-yellow-500" : "border-transparent text-gray-500 hover:text-white"}`}>
                    Teammitglieder
                  </button>
                </div>
              )}

              {/* === INHALT: ÜBERSICHT === */}
              {!isCreating && currentTeam && activeTab === "overview" && (
                <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col gap-5">
                  <div className="bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 rounded-3xl p-6 relative transform-gpu">
                    {currentTeam.has_season_badge && (
                      <div className="absolute top-4 left-4 z-10" title="Exklusives Season-Badge freigeschaltet!">
                        <span className="text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse">🏆</span>
                      </div>
                    )}

                    <div className="absolute top-4 right-4 z-10">
                      {currentTeam.is_active ? (
                        <span className="bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span> Aktiv
                        </span>
                      ) : (
                        <button onClick={handleMakeActive} disabled={saving} className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors">Als Aktiv setzen</button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 mb-4 mt-2">
                      <img src={teamStats.tierImage} alt={`Rank Level ${teamStats.level}`} className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_25px_rgba(250,204,21,0.2)]" />
                      <div className="flex-1 w-full">
                        <div className="flex justify-between items-end mb-3">
                          <div>
                            <h4 className="text-gray-500 text-[11px] uppercase tracking-widest font-bold mb-1">Team Level</h4>
                            <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 drop-shadow-sm">{teamStats.level}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xl md:text-2xl font-bold text-white">{teamStats.currentLevelXp}</span>
                            <span className="text-gray-500 text-xs font-medium ml-1">/ {teamStats.requiredLevelXp} XP</span>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Gesamt: <span className="text-gray-400">{teamStats.totalXp}</span></div>
                          </div>
                        </div>
                        <div className="w-full bg-black/60 rounded-full h-3 overflow-hidden border border-white/5 shadow-inner">
                          <div className="bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${teamStats.progress}%` }}>
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse"></div>
                          </div>
                        </div>

                        {(currentTeam.active_xp_boosts || 0) > 0 && (
                          <div className="mt-4 flex items-center justify-center gap-2">
                            <div className="bg-purple-500/20 border border-purple-500/40 px-4 py-1.5 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                              <span className="text-[11px] font-black uppercase tracking-widest text-purple-300">
                                XP Boost aktiv für <span className="text-white text-sm mx-1">{currentTeam.active_xp_boosts}</span> Spiele
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-3 text-center">
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-1.5 sm:p-3 flex flex-col justify-center items-center">
                        <span className="text-white font-black text-lg md:text-xl drop-shadow-md">{currentTeam.participations || 0}</span>
                        <span className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-wide sm:tracking-widest mt-1 font-semibold">Events</span>
                      </div>
                      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-1.5 sm:p-3 flex flex-col justify-center items-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
                        <span className="text-yellow-400 font-black text-lg md:text-xl drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">{currentTeam.wins_top1 || 0}</span>
                        <span className="text-[8px] sm:text-[10px] text-yellow-500/80 uppercase tracking-wide sm:tracking-widest mt-1 font-semibold">Siege</span>
                      </div>
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-1.5 sm:p-3 flex flex-col justify-center items-center">
                        <span className="text-white font-black text-lg md:text-xl drop-shadow-md">{currentTeam.wins_top3 || 0}</span>
                        <span className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-wide sm:tracking-widest mt-1 font-semibold whitespace-nowrap">Top 4</span>
                      </div>
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-1.5 sm:p-3 flex flex-col justify-center items-center">
                        <span className="text-white font-black text-lg md:text-xl drop-shadow-md">{currentTeam.wins_top5 || 0}</span>
                        <span className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-wide sm:tracking-widest mt-1 font-semibold whitespace-nowrap">Top 8</span>
                      </div>
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-1.5 sm:p-3 flex flex-col justify-center items-center">
                        <span className="text-white font-black text-lg md:text-xl drop-shadow-md">{currentTeam.total_goals_scored || 0}</span>
                        <span className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-wide sm:tracking-widest mt-1 font-semibold">Tore</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={() => setActiveTab("members")} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                      Teammitglieder verwalten
                    </button>
                    <button onClick={() => showMessage("🛒 Transfermarkt öffnet sich bald!")} className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                      Transfermarkt
                    </button>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <form className="flex flex-col gap-4 mt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Teamname</label>
                          <input type="text" value={teamname} disabled className="w-full bg-black/40 border border-white/5 shadow-inner rounded-xl p-3 text-sm text-gray-400 cursor-not-allowed" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Captain</label>
                          <input type="text" value={captain} disabled className="w-full bg-black/40 border border-white/5 shadow-inner rounded-xl p-3 text-sm text-gray-400 cursor-not-allowed" />
                        </div>
                      </div>
                      
                      <button type="button" onClick={() => {setDeleteConfirmName(""); setShowDeleteModal(true);}} disabled={saving || uploadingLogo} className="w-full bg-black/20 hover:bg-red-500/10 text-red-500/80 hover:text-red-500 border border-red-500/10 hover:border-red-500/30 font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2 text-sm">
                        Team löschen
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* === INHALT: TEAMMITGLIEDER === */}
              {!isCreating && currentTeam && activeTab === "members" && (
                <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.04] border border-white/5 rounded-2xl p-4 sm:p-5">
                    <div>
                      <h3 className="text-lg font-black text-white">Der Kader</h3>
                      <p className="text-xs text-gray-400 mt-1">Verwalte hier deine Spieler und Co-Captains.</p>
                    </div>
                    {/* Nur der Team-Ersteller darf Leute einladen */}
                    {currentTeam.user_id === user?.id && (
                      <button onClick={() => setShowAddMemberModal(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                        + Einladen
                      </button>
                    )}
                  </div>

                  {loadingMembers ? (
                    <div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {members.map((member) => (
                        <div key={member.id} className="bg-black/40 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col relative overflow-hidden group">
                          
                          {/* Role Badge */}
                          <div className="absolute top-0 right-0">
                            {member.role === 'captain' && <span className="bg-yellow-500/20 text-yellow-400 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-bl-xl border-b border-l border-yellow-500/30">Captain</span>}
                            {member.role === 'co-captain' && <span className="bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-bl-xl border-b border-l border-blue-500/30">Co-Captain</span>}
                            {member.role === 'spieler' && <span className="bg-white/10 text-gray-300 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-bl-xl border-b border-l border-white/10">Spieler</span>}
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Profilbild Placeholder */}
                            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden">
                              <span className="text-sm">👤</span>
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-white font-bold text-sm truncate">
                                {member.profiles?.ea_ingame_name || member.profiles?.discord_id || "Unbekannt"}
                              </span>
                              <span className="text-gray-500 text-xs truncate">
                                {member.profiles?.discord_id && member.role !== 'captain' && !member.profiles.discord_id.match(/^[0-9]+$/) ? `@${member.profiles.discord_id}` : ""}
                              </span>
                            </div>
                          </div>

                          {/* Action Area (Nur Captain darf ändern, und er darf sich selbst nicht ändern/löschen) */}
                          {currentTeam.user_id === user?.id && member.role !== 'captain' && (
                            <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                              <select 
                                value={member.role} 
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-500 cursor-pointer"
                              >
                                <option value="spieler">Spieler</option>
                                <option value="co-captain">Co-Captain</option>
                              </select>
                              
                              <button 
                                onClick={() => handleKickMember(member.id, member.profiles?.ea_ingame_name || "Spieler")}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                title="Kicken"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {members.length === 0 && (
                        <div className="col-span-1 md:col-span-2 text-center text-gray-500 text-sm py-6">
                          Keine Mitglieder gefunden.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* === INHALT: INVENTAR & AUSSEHEN === */}
              {!isCreating && currentTeam && activeTab === "inventory" && (
                <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col gap-2">
                  
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mt-1">Gutscheine & Tickets</h4>
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    
                    {/* WARTELISTE */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col relative h-[170px] transform-gpu">
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 rounded px-1.5 py-0.5 flex items-center z-10 shadow-lg">
                        <span className="text-[11px] font-black text-white">{currentTeam.waitlist_tickets || 0}x</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center min-h-0 w-full mb-2 mt-1">
                        <img src="/rewards/warteliste_skip.png" alt="Warteliste" className="h-full max-h-[100px] w-auto object-contain drop-shadow-xl" onError={(e) => e.currentTarget.style.opacity = '0'} />
                      </div>
                      <button onClick={() => handleRedeemTicket('waitlist_tickets', 'Wartelisten-Priorität')} disabled={saving || (currentTeam.waitlist_tickets || 0) <= 0} className="w-full mt-auto flex-shrink-0 bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold py-1.5 rounded-lg text-[10px] uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        Einlösen
                      </button>
                    </div>
                    
                    {/* FEATURE */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col relative h-[170px] transform-gpu">
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 rounded px-1.5 py-0.5 flex items-center z-10 shadow-lg">
                        <span className="text-[11px] font-black text-white">{currentTeam.feature_tickets || 0}x</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center min-h-0 w-full mb-2 mt-1">
                        <img src="/rewards/feature.png" alt="Feature" className="h-full max-h-[100px] w-auto object-contain drop-shadow-xl" />
                      </div>
                      <button onClick={() => handleRedeemTicket('feature_tickets', 'Feature Match')} disabled={saving || (currentTeam.feature_tickets || 0) <= 0} className="w-full mt-auto flex-shrink-0 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 font-bold py-1.5 rounded-lg text-[10px] uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        Einlösen
                      </button>
                    </div>
                    
                    {/* DOUBLE XP */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col relative h-[170px] transform-gpu">
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 rounded px-1.5 py-0.5 flex items-center z-10 shadow-lg flex flex-col items-center">
                        <span className="text-[11px] font-black text-white">{currentTeam.double_xp_matches || 0}x</span>
                        {(currentTeam.active_xp_boosts || 0) > 0 && <span className="text-[8px] text-purple-400 font-bold">({currentTeam.active_xp_boosts} Aktiv)</span>}
                      </div>
                      <div className="flex-1 flex items-center justify-center min-h-0 w-full mb-2 mt-1">
                        <img src="/rewards/doppelte_xp.png" alt="Double XP" className="h-full max-h-[100px] w-auto object-contain drop-shadow-xl" />
                      </div>
                      <button onClick={() => handleRedeemTicket('double_xp_matches', 'Double-XP Boost')} disabled={saving || (currentTeam.double_xp_matches || 0) <= 0} className="w-full mt-auto flex-shrink-0 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 font-bold py-1.5 rounded-lg text-[10px] uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        Einlösen
                      </button>
                    </div>

                    {/* COTW */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col relative h-[170px] transform-gpu">
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 rounded px-1.5 py-0.5 flex items-center z-10 shadow-lg">
                        <span className="text-[11px] font-black text-white">{currentTeam.cotw_tickets || 0}x</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center min-h-0 w-full mb-2 mt-1">
                        <img src="/rewards/club_der_woche.png" alt="Club der Woche" className="h-full max-h-[100px] w-auto object-contain drop-shadow-xl" />
                      </div>
                      <button onClick={() => handleRedeemTicket('cotw_tickets', 'Club der Woche Feature')} disabled={saving || (currentTeam.cotw_tickets || 0) <= 0} className="w-full mt-auto flex-shrink-0 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 font-bold py-1.5 rounded-lg text-[10px] uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        Einlösen
                      </button>
                    </div>

                    {/* HIGHLIGHT */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col relative h-[170px] transform-gpu">
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 rounded px-1.5 py-0.5 flex items-center z-10 shadow-lg">
                        <span className="text-[11px] font-black text-white">{currentTeam.highlight_tickets || 0}x</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center min-h-0 w-full mb-2 mt-1">
                        <img src="/rewards/homepage_highlight.png" alt="HP Highlight" className="h-full max-h-[100px] w-auto object-contain drop-shadow-xl" />
                      </div>
                      <button onClick={() => handleRedeemTicket('highlight_tickets', 'Homepage-Highlight für den Club')} disabled={saving || (currentTeam.highlight_tickets || 0) <= 0} className="w-full mt-auto flex-shrink-0 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-bold py-1.5 rounded-lg text-[10px] uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        Einlösen
                      </button>
                    </div>

                    {/* RANDOM */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col relative h-[170px] transform-gpu">
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 rounded px-1.5 py-0.5 flex items-center z-10 shadow-lg">
                        <span className="text-[11px] font-black text-white">{currentTeam.random_tickets || 0}x</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center min-h-0 w-full mb-2 mt-1">
                        <img src="/rewards/mystery_reward.png" alt="Zufalls Loot" className="h-full max-h-[100px] w-auto object-contain drop-shadow-xl" />
                      </div>
                      <button onClick={() => handleRedeemTicket('random_tickets', 'Zufällige Belohnung auswürfeln')} disabled={saving || (currentTeam.random_tickets || 0) <= 0} className="w-full mt-auto flex-shrink-0 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 font-bold py-1.5 rounded-lg text-[10px] uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        Einlösen
                      </button>
                    </div>
                  </div>

                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 pl-1 mt-2">Aussehen</h4>
                  
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button onClick={() => setCosmeticTab("banner")} className={`px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors ${cosmeticTab === "banner" ? "bg-white/10 text-white" : "bg-black/20 text-gray-500 hover:text-gray-300"}`}>Banner</button>
                    <button onClick={() => setCosmeticTab("color")} className={`px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors ${cosmeticTab === "color" ? "bg-white/10 text-white" : "bg-black/20 text-gray-500 hover:text-gray-300"}`}>Farben</button>
                    <button onClick={() => setCosmeticTab("border")} className={`px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors ${cosmeticTab === "border" ? "bg-white/10 text-white" : "bg-black/20 text-gray-500 hover:text-gray-300"}`}>Rahmen</button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                    {cosmeticTab === "banner" && (
                      <>
                        <button disabled={teamStats.level < 8} onClick={() => handleSelectCosmetic('banner', '0')} className={`relative border-2 rounded-xl overflow-hidden h-24 sm:h-28 w-full flex items-center justify-center transition ${teamStats.level < 8 ? 'opacity-40 cursor-not-allowed border-white/5' : previewSettings.getValue('banner') === '0' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'border-white/10 hover:border-white/30'}`}>
                          <img src="/rewards/banner_0.png" alt="Basic Banner" className="absolute inset-0 w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                          {teamStats.level < 8 && (
                            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                              <span className="text-lg font-black uppercase tracking-widest text-red-500">Lvl 8</span>
                            </div>
                          )}
                        </button>
                        
                        <button disabled={teamStats.level < 22} onClick={() => handleSelectCosmetic('banner', '1')} className={`relative border-2 rounded-xl overflow-hidden h-24 sm:h-28 w-full flex items-center justify-center transition ${teamStats.level < 22 ? 'opacity-40 cursor-not-allowed border-white/5' : previewSettings.getValue('banner') === '1' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'border-white/10 hover:border-white/30'}`}>
                          <img src="/rewards/banner_1.png" alt="Upgraded Banner" className="absolute inset-0 w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                          {teamStats.level < 22 && (
                            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                              <span className="text-lg font-black uppercase tracking-widest text-red-500">Lvl 22</span>
                            </div>
                          )}
                        </button>
                        
                        <button disabled={teamStats.level < 39} onClick={() => handleSelectCosmetic('banner', '2')} className={`relative border-2 rounded-xl overflow-hidden h-24 sm:h-28 w-full flex items-center justify-center transition ${teamStats.level < 39 ? 'opacity-40 cursor-not-allowed border-white/5' : previewSettings.getValue('banner') === '2' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'border-white/10 hover:border-white/30'}`}>
                          <img src="/rewards/banner_2.png" alt="Elite Banner" className="absolute inset-0 w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                          {teamStats.level < 39 && (
                            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                              <span className="text-lg font-black uppercase tracking-widest text-red-500">Lvl 39</span>
                            </div>
                          )}
                        </button>

                        <button disabled={teamStats.level < 47} onClick={() => handleSelectCosmetic('banner', '3')} className={`relative border-2 rounded-xl overflow-hidden h-24 sm:h-28 w-full flex items-center justify-center transition ${teamStats.level < 47 ? 'opacity-40 cursor-not-allowed border-white/5' : previewSettings.getValue('banner') === '3' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'border-white/10 hover:border-white/30'}`}>
                          <img src="/rewards/banner_3.png" alt="Special Banner" className="absolute inset-0 w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                          {teamStats.level < 47 && (
                            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                              <span className="text-lg font-black uppercase tracking-widest text-red-500">Lvl 47</span>
                            </div>
                          )}
                        </button>
                      </>
                    )}
                    {cosmeticTab === "color" && (
                      <button disabled={teamStats.level < 14} onClick={() => handleSelectCosmetic('color', '1')} className={`relative border-2 rounded-xl overflow-hidden h-24 sm:h-28 w-full flex items-center justify-center transition ${teamStats.level < 14 ? 'opacity-40 cursor-not-allowed border-white/5' : previewSettings.getValue('color') === '1' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'border-white/10 hover:border-white/30'}`}>
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-purple-500 to-blue-500"></div>
                        {teamStats.level < 14 && (
                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                            <span className="text-lg font-black uppercase tracking-widest text-red-500">Lvl 14</span>
                          </div>
                        )}
                      </button>
                    )}
                    {cosmeticTab === "border" && (
                      <button disabled={teamStats.level < 40} onClick={() => handleSelectCosmetic('border', '1')} className={`relative border-2 rounded-xl overflow-hidden h-24 sm:h-28 w-full flex items-center justify-center transition ${teamStats.level < 40 ? 'opacity-40 cursor-not-allowed border-white/5' : previewSettings.getValue('border') === '1' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'border-white/10 hover:border-white/30'}`}>
                        <div className="absolute inset-0 w-full h-full bg-white/5 border-[3px] border-yellow-500"></div>
                        {teamStats.level < 40 && (
                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                            <span className="text-lg font-black uppercase tracking-widest text-red-500">Lvl 40</span>
                          </div>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="lg:hidden mt-4 mb-4">
                    <h4 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3 pl-1 text-center">Vorschau: Team Karte</h4>
                    <div className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-md border text-sm md:text-base font-bold transition duration-500 relative overflow-hidden ${previewSettings.border} ${previewSettings.bg}`}>
                      {previewSettings.banner !== 'default' && <img src={`/rewards/banner_${previewSettings.banner}.png`} alt="" className="absolute inset-0 w-full h-full object-cover object-center scale-[1.05] pointer-events-none" onError={(e) => e.currentTarget.style.display = 'none'} />}
                      <div className="relative z-10 flex items-center gap-3 w-full">
                        {logoUrl ? <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/20 bg-black/40 shadow-sm" /> : <img src={teamStats.tierImage} alt="Rank" className="w-8 h-8 object-contain shrink-0" />}
                        <span className={`whitespace-nowrap truncate tracking-tight transition-colors duration-500 ${previewSettings.colorClass}`}>{teamname || "Teamname"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-auto border-t border-white/10">
                    <button onClick={handleSaveCosmetics} disabled={saving || !hasUnsavedChanges} className={`w-full font-black uppercase tracking-widest py-3 text-sm rounded-xl transition-all flex justify-center items-center gap-2 ${hasUnsavedChanges ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:-translate-y-0.5' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}>
                      {saving ? "WIRD GESPEICHERT..." : hasUnsavedChanges ? "AUSSEHEN SPEICHERN" : "KEINE ÄNDERUNGEN"}
                    </button>
                  </div>

                </div>
              )}

              {/* === INHALT: NEUES TEAM ERSTELLEN === */}
              {isCreating && (
                <form onSubmit={handleSaveTeam} className="flex flex-col gap-6 mt-6 flex-1 animate-in fade-in zoom-in-95">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold ml-1">Teamname</label>
                      <input type="text" value={teamname} onChange={(e) => setTeamname(e.target.value)} placeholder="Dein Teamname" className="w-full bg-black/40 border border-white/10 shadow-inner rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 hover:border-white/20 transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold ml-1">Captain (Riot ID)</label>
                      <input type="text" value={captain} onChange={(e) => setCaptain(e.target.value)} placeholder="Riot ID eingeben" className="w-full bg-black/40 border border-white/10 shadow-inner rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 hover:border-white/20 transition-colors" />
                    </div>
                  </div>
                  
                  <button type="submit" disabled={saving || uploadingLogo} className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] hover:-translate-y-0.5 disabled:opacity-50 mt-auto">
                    {saving ? "Wird gespeichert..." : "Team erstellen"}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>

        {message && <div className="fixed top-24 right-4 sm:right-6 bg-[#111] text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 border border-white/10 backdrop-blur-md flex items-center gap-3 font-medium">
          {message}
        </div>}
      </main>

      {/* --- ADD MEMBER MODAL (JETZT NUR NOCH ALS LINK-ANZEIGE) --- */}
      {showAddMemberModal && currentTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md px-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 transform-gpu flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl md:text-2xl font-black text-white">Spieler einladen</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition-colors">✕</button>
            </div>
            
            <div className="flex-1">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">🔗 Einladungslink</h4>
                <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                  Kopiere diesen Link und schicke ihn deinen Spielern z.B. über Discord. Sie können dem Team dann mit einem Klick beitreten.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    readOnly 
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${currentTeam.id}`} 
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-400 truncate outline-none cursor-copy"
                    onClick={handleCopyInviteLink}
                  />
                  <button onClick={handleCopyInviteLink} className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                    Kopieren
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end shrink-0 pt-4 border-t border-white/10">
              <button onClick={() => setShowAddMemberModal(false)} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-colors text-sm">Schließen</button>
            </div>
          </div>
        </div>
      )}

      {/* ... andere Modals (Delete, Waitlist) bleiben gleich ... */}
      {showDeleteModal && currentTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md px-4">
          <div className="bg-[#0a0a0a] border border-red-500/20 rounded-3xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(220,38,38,0.15)] animate-in zoom-in-95 transform-gpu">
            <h3 className="text-2xl font-black text-white mb-3">Team wirklich löschen?</h3>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">Bitte gib zur Bestätigung den exakten Namen <strong className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{currentTeam.teamname}</strong> ein.</p>
            <input type="text" value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} placeholder="Teamname bestätigen" className="w-full bg-black border border-white/10 focus:border-red-500/50 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors mb-8 placeholder-gray-600" />
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-colors">Abbrechen</button>
              <button onClick={confirmDeleteTeam} disabled={deleteConfirmName !== currentTeam.teamname || saving} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:shadow-none">{saving ? "Wird gelöscht..." : "Endgültig löschen"}</button>
            </div>
          </div>
        </div>
      )}

      {showWaitlistModal && currentTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md px-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 transform-gpu">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl md:text-2xl font-black text-white">🎟️ Skip-Ticket einlösen</h3>
              <button onClick={() => setShowWaitlistModal(false)} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition-colors">✕</button>
            </div>
            
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
              Für welches Turnier möchtest du das Ticket nutzen? 
              Ist das Turnier voll, rutscht ihr auf <strong>Platz 1 der Warteliste</strong>. Ist noch Platz, seid ihr <strong>direkt dabei!</strong>
            </p>

            {loadingWaitlist ? (
              <div className="py-10 flex justify-center"><div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : waitlistData.length === 0 ? (
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center text-gray-400 mb-6 text-sm">
                Dein Team befindet sich aktuell auf keiner Warteliste für ein Turnier.
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                {waitlistData.map((reg) => (
                  <div key={reg.id} className="bg-[#1e1e1e] border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="text-center sm:text-left">
                      <h4 className="font-bold text-white text-lg">{reg.tournaments?.name}</h4>
                      <div className="text-xs text-yellow-500 font-bold uppercase tracking-widest mt-1">Status: Warteliste</div>
                    </div>
                    <button onClick={() => confirmWaitlistSkip(reg.id, reg.tournament_id, reg.tournaments?.max_teams)} disabled={saving} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 px-6 rounded-xl transition-colors shadow-[0_0_15px_rgba(250,204,21,0.3)] disabled:opacity-50 w-full sm:w-auto">
                      {saving ? "Lädt..." : "Hier einlösen"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end">
              <button onClick={() => setShowWaitlistModal(false)} className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-8 rounded-xl transition-colors">Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}