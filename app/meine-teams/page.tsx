"use client";

// 🔥 Unseren neuen Hook importieren
import { useAuth } from "@/components/AuthProvider";

export default function MeineTeamsTeaserPage() {
  // 🔥 BAM! User und Loading blitzschnell aus dem globalen State holen
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-2">Nicht eingeloggt</h2>
        <p className="text-gray-400">Bitte logge dich über Discord ein, um dieses Feature zu sehen.</p>
      </div>
    );
  }

  return (
    // 🔥 Top-Padding und Bottom-Padding reduziert
    <main className="min-h-[calc(100vh-100px)] px-4 sm:px-6 pt-20 md:pt-24 pb-6 w-full max-w-5xl mx-auto text-white flex flex-col justify-center">
      <h1 className="text-2xl md:text-3xl font-black mb-6 tracking-tight drop-shadow-md">
        Das <span className="text-yellow-500">Team-System</span> wächst
      </h1>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
        
        {/* --- DAS GEILE TEASER-BILD (KOMPAKTER) --- */}
        {/* 🔥 max-w-lg und max-h-[35vh] sorgen dafür, dass es nie den Bildschirm sprengt */}
        <div className="w-full max-w-md md:max-w-lg mb-6 relative rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10 group cursor-pointer">
          <img 
            src="/MeineTeamsInArbeit.png" 
            alt="Teaser Team Management" 
            className="w-full h-auto max-h-[35vh] object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-80"></div>
        </div>

        {/* --- TEXT --- */}
        <h3 className="text-2xl md:text-3xl font-bold mb-3 text-white flex items-center justify-center gap-3">
          <span>🚧</span> In Arbeit <span>🚧</span>
        </h3>
        
        <p className="text-gray-400 mb-6 max-w-2xl text-sm md:text-base leading-relaxed">
          Hinter den Kulissen basteln wir bereits an neuen Funktionen für dein Team. Zukünftig wirst du hier mehr Möglichkeiten haben, dich und deine Mitspieler zu organisieren und eure gemeinsamen Erfolge besser im Blick zu behalten. <br/><br/>
          Wir wollen das System Schritt für Schritt verbessern – bleib also gespannt, was die kommenden Updates für den WombiCup bringen!
        </p>
        
        <button 
          disabled
          className="bg-white/5 border border-white/10 text-gray-500 font-bold py-3 px-8 rounded-xl cursor-not-allowed w-full sm:w-auto text-sm"
        >
          Weitere Infos folgen
        </button>
      </div>
    </main>
  );
}