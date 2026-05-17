import Image from "next/image";
import TeamCardMobile from "./TeamCardMobile"; // 🔥 Lädt die Handy-Version

// 🔥 HELPER: Holt das passende Bild
const getTierImage = (level: number) => {
  const l = level || 1;
  if (l >= 45) return "/Prisma.png";
  if (l >= 40) return "/Amethyst.png";
  if (l >= 35) return "/Sapphire.png";
  if (l >= 30) return "/Emerald.png";
  if (l >= 25) return "/Ruby.png";
  if (l >= 20) return "/Gold.png";
  if (l >= 10) return "/Silber.png";
  return "/Bronze.png";
};

// 🔥 HELPER: Holt die passende Farbe
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

interface TeamCardProps {
  team?: any;
  isDu?: boolean;
  reverseOnMobile?: boolean;
  isTBD?: boolean;
  isWinner?: boolean;
}

export default function TeamCard({ team, isDu = false, reverseOnMobile = false, isTBD = false, isWinner = false }: TeamCardProps) {
  
  // ==========================================
  // TBD / FREILOS LOGIK
  // ==========================================
  if (!team || isTBD) {
    return (
      <>
        {/* MOBILE TBD */}
        <TeamCardMobile team={team} isDu={isDu} reverseOnMobile={reverseOnMobile} isTBD={isTBD} isWinner={isWinner} />
        
        {/* DESKTOP TBD: h-16 entfernt, w-full und aspect-ratio hinzugefügt */}
        <div 
          className={`hidden md:flex items-center border border-white/5 bg-white/5 rounded-xl px-4 w-full text-sm font-bold flex-1 min-w-0 text-gray-500 italic shadow-sm justify-center ${reverseOnMobile ? 'flex-row-reverse' : ''}`}
          style={{ aspectRatio: "4.8 / 1" }}
        >
          <span className="truncate">TBD</span>
        </div>
      </>
    );
  }

  // ==========================================
  // STYLING & LOGIK FÜR DIE KARTE
  // ==========================================
  const tierStyles = getTierStyles(team.level);
  
  const border = team.equipped_border === '1' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 
                 team.equipped_border === 'diamond' ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)] animate-pulse' : 
                 tierStyles.border;
  
  const banner = team.equipped_banner;
  const bg = banner && banner !== 'default' ? 'bg-black/60' : tierStyles.bg;
  
  let textColor = tierStyles.text;
  if (team.equipped_color === '1') textColor = 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400';
  if (team.equipped_color === 'cyberpunk') textColor = 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]';

  let resolvedBannerUrl = null;
  if (banner && banner !== 'default') {
    if (['0', '1', '2', '3'].includes(banner)) {
      resolvedBannerUrl = `/rewards/banner_${banner}.png`;
    } else {
      const customReward = team.team_rewards?.find((tr: any) => tr.custom_rewards?.type === 'banner' && tr.custom_rewards?.value === banner);
      resolvedBannerUrl = customReward?.custom_rewards?.image_url || null;
    }
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* 📱 MOBILE VERSION WIRD HIER GELADEN                                       */}
      {/* ========================================================================= */}
      <TeamCardMobile team={team} isDu={isDu} reverseOnMobile={reverseOnMobile} isTBD={isTBD} isWinner={isWinner} />

      {/* ========================================================================= */}
      {/* 💻 DESKTOP VERSION (Perfekt zentriert & proportional)                     */}
      {/* ========================================================================= */}
      {/* 🔥 HIER GEFIXT: h-16 entfernt, w-full hinzugefügt und per inline-style das perfekte Seitenverhältnis erzwungen */}
      <div 
        className={`hidden md:flex items-center px-3 w-full rounded-xl border text-base font-bold flex-1 min-w-0 transition duration-500 relative overflow-hidden shadow-md justify-center ${border} ${bg} ${reverseOnMobile ? 'flex-row-reverse' : ''}`}
        style={{ aspectRatio: "4.8 / 1" }}
      >
        
        {resolvedBannerUrl && (
          <Image 
            src={resolvedBannerUrl} 
            alt="Banner" 
            fill
            quality={100}
            sizes="(max-width: 768px) 100vw, 1200px" 
            // 🔥 HIER GEFIXT: object-fill legt das Bild exakt und ohne Abschneiden in das aspect-[4.8/1] Feld!
            className="absolute inset-0 object-fill pointer-events-none opacity-100"
          />
        )}

        <div className={`relative z-10 flex items-center gap-3 min-w-0 max-w-full w-full justify-center flex-row ${reverseOnMobile ? 'flex-row-reverse' : ''}`}>
          
          {/* Desktop Logo */}
          {team.logo_url ? (
            <Image 
              src={team.logo_url} 
              alt="Logo" 
              width={80} 
              height={80} 
              quality={100}
              className={`w-9 h-9 rounded-full object-cover shrink-0 border border-white/20 bg-black/60 shadow-sm ${isWinner ? 'ring-2 ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]' : ''}`} 
            />
          ) : (
            <Image 
              src={getTierImage(team.level)} 
              alt="Rank" 
              width={80} 
              height={80} 
              quality={100}
              className={`w-9 h-9 object-contain shrink-0 drop-shadow-md ${isWinner ? 'drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : ''}`} 
            />
          )}
          
          {/* Desktop Text */}
          <span
            className={`truncate shrink leading-none tracking-tight transition-colors duration-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${textColor}`}
            style={{ fontSize: "clamp(10px, 1vw, 16px)" }}
          >
            {team.name || team.teamname}
          </span>

          {/* Unschuldiges, glow-freies (Du) */}
          {isDu && (
            <span className="opacity-90 font-black text-[9px] uppercase tracking-wider text-yellow-500 shrink-0 relative top-[1px]">
              (Du)
            </span>
          )}

        </div>
      </div>
    </>
  );
}