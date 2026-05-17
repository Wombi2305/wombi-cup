import Image from "next/image";

// 🔥 HELPER
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

export default function TeamCardMobile({ team, isDu = false, reverseOnMobile = false, isTBD = false, isWinner = false }: any) {
  
  if (!team || isTBD) {
    return (
      <div 
        className={`flex md:hidden items-center border border-white/5 bg-white/5 rounded-xl px-[3cqi] font-bold flex-1 min-w-0 text-gray-500 italic shadow-sm mx-auto justify-center ${reverseOnMobile ? 'flex-row-reverse' : ''}`}
        style={{ aspectRatio: "4.8 / 1", width: "100%", containerType: "inline-size", fontSize: "clamp(10px, 6cqi, 15px)" }}
      >
        <span className="truncate">TBD</span>
      </div>
    );
  }

  const tierStyles = getTierStyles(team.level);
  const border = team.equipped_border === '1' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 
                 team.equipped_border === 'diamond' ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)] animate-pulse' : tierStyles.border;
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
    // 🔥 HIER GEFIXT: 'containerType' macht die Karte zum Messwerkzeug für alles, was drinnen liegt!
    <div 
      className={`flex md:hidden items-center px-[3cqi] rounded-xl border font-bold flex-1 min-w-0 transition duration-500 relative overflow-hidden shadow-md ${border} ${bg} ${reverseOnMobile ? 'flex-row-reverse' : ''}`}
      style={{ aspectRatio: "4.8 / 1", width: "100%", containerType: "inline-size" }}
    >
      
      {resolvedBannerUrl && (
        <Image 
          src={resolvedBannerUrl} 
          alt="Banner" 
          fill
          quality={100}
          sizes="(max-width: 768px) 100vw, 1200px" 
          className="absolute inset-0 object-fill pointer-events-none opacity-100"
        />
      )}

      {/* Die Abstände wachsen und schrumpfen (gap-[2cqi]) ab jetzt auch automatisch mit! */}
      <div className={`relative z-10 flex items-center gap-[2cqi] min-w-0 max-w-full flex-row mx-auto ${reverseOnMobile ? 'flex-row-reverse' : ''}`}>
        
        {/* 🔥 FLUID LOGO: Es ist jetzt immer exakt 12% der Kartenbreite groß! */}
        <div 
          className={`relative shrink-0 flex items-center justify-center rounded-full bg-black/60 shadow-sm border border-white/20 overflow-hidden ${isWinner ? 'ring-1 ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]' : ''}`}
          style={{ width: "12cqi", height: "12cqi" }}
        >
          {team.logo_url ? (
            <Image 
              src={team.logo_url} 
              alt="Logo" 
              fill 
              quality={100}
              className="object-cover" 
            />
          ) : (
            <Image 
              src={getTierImage(team.level)} 
              alt="Rank" 
              fill 
              quality={100}
              className="object-contain scale-[0.8] drop-shadow-md" 
            />
          )}
        </div>
        
        {/* 🔥 FLUID TEXT: Die Schriftgröße liest die Kartenbreite und passt sich stufenlos an! */}
        <span 
          className={`truncate shrink leading-none tracking-tight transition-colors duration-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${textColor}`}
          style={{ fontSize: "clamp(10px, 5.5cqi, 15px)" }}
        >
          {team.name || team.teamname}
          {isDu && (
            <span 
              className="ml-[1cqi] opacity-90 font-black uppercase tracking-wider text-yellow-500 shrink-0 relative top-[1px]"
              style={{ fontSize: "clamp(7px, 3.5cqi, 10px)" }}
            >
              (Du)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}