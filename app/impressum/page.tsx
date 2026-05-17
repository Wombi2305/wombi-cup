import Link from "next/link";

export default function ImpressumPage() {
  return (
    <div className="px-4 sm:px-6 pt-10 pb-20 w-full max-w-3xl mx-auto text-white flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="mb-4">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2 w-fit mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Zurück zur Startseite
        </Link>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-1">
          Impressum
        </h1>
        <p className="text-gray-400 text-sm md:text-base">Rechtliche Informationen zum WombiCup</p>
      </div>

      {/* 1. KONTAKT */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Kontakt</h2>
        </div>
        <p className="text-gray-400 mb-6 text-sm sm:text-base">
          Bei Fragen, Anregungen oder Problemen erreichst du uns über folgende Kanäle:
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">E-Mail</div>
              <a href="mailto:info@wombicup.de" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">[noamacklemore@gmail.com]</a>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.33-.35-.76-.53-1.09a.09.09 0 0 0-.07-.03c-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06-.01.07-.04.41-.56.78-1.15 1.11-1.77.01-.03 0-.06-.03-.07a9.42 9.42 0 0 1-1.63-.78.05.05 0 0 1-.01-.07c.11-.08.23-.17.34-.26.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .03-.01.06 0 .07.01.11.09.23.18.34.26.03.02.02.06-.01.07a9.59 9.59 0 0 1-1.63.78.05.05 0 0 0-.03.07c.33.62.7 1.21 1.11 1.77.02.03.05.04.07.04 1.71-.53 3.44-1.33 5.24-2.65.02-.01.03-.03.03-.05.41-4.32-.47-8.31-3.13-11.97a.06.06 0 0 0-.03-.02zM8.02 15.33c-1.18 0-2.15-1.08-2.15-2.41s.96-2.41 2.15-2.41c1.2 0 2.17 1.09 2.15 2.41 0 1.33-.96 2.41-2.15 2.41zm7.97 0c-1.18 0-2.15-1.08-2.15-2.41s.96-2.41 2.15-2.41c1.2 0 2.17 1.09 2.15 2.41 0 1.33-.96 2.41-2.15 2.41z"/></svg>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Discord</div>
              <a href="https://discord.gg/Ajjx7eEdBX" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">discord.gg/Ajjx7eEdBX</a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ÜBER WOMBICUP */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-yellow-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Über WombiCup</h2>
        </div>
        <p className="text-gray-400 leading-relaxed mb-6 text-sm sm:text-base">
          Der WombiCup ist ein rein privates Hobby-Projekt, das sich der Durchführung von EA FC Pro Clubs Wettbewerben widmet. Unser Ziel ist es, der deutschsprachigen Community einen spannenden und fairen Rahmen für E-Sports-Turniere zu bieten. Das gesamte Projekt ist nicht auf Profit ausgerichtet: Jegliche Einnahmen durch eventuelle Startgebühren werden zu 100 % als Preispool an die Gewinner ausgeschüttet und teilweise durch eigene Mittel aufgestockt.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>
            EA FC Pro Clubs
          </span>
          <span className="bg-white/5 text-gray-300 border border-white/10 px-3 py-1.5 rounded-full text-xs font-semibold">Community-Projekt</span>
        </div>
      </section>

      {/* 3. TECHNISCHE INFORMATIONEN */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Technische Informationen</h2>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-gray-400 text-sm">Website</span>
            <span className="font-bold text-white text-sm">wombicup.de</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-gray-400 text-sm">Hosting</span>
            <span className="font-bold text-white text-sm">Vercel Inc. (USA / Global)</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-gray-400 text-sm">Datenbank</span>
            <span className="font-bold text-white text-sm">Supabase (AWS Frankfurt, EU)</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-400 text-sm">Discord Bot</span>
            <span className="font-bold text-white text-sm">WombiCup Bot</span>
          </div>
        </div>
      </section>

      {/* 4. ANGABEN GEMÄß § 5 TMG */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Angaben gemäß § 5 TMG</h2>
        </div>
        <div className="text-gray-400 leading-relaxed text-sm sm:text-base">
          <p className=" text-white mb-1">[Florian] [Unger]</p>
          <p>[Marburger] [86]</p>
          <p>[35398] [Giessen]</p>
          <p>Deutschland</p>
        </div>
      </section>

      {/* 5. HAFTUNGSAUSSCHLUSS */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Haftungsausschluss</h2>
        </div>
        <div className="flex flex-col gap-6 text-sm text-gray-400 leading-relaxed">
          <div>
            <h3 className="text-white font-bold mb-1 text-base">Inhaltliche Verantwortung</h3>
            <p>Sämtliche Texte und Informationen auf dieser Plattform werden gewissenhaft geprüft und eingepflegt. Dennoch übernehmen wir keine Garantie dafür, dass die bereitgestellten Daten stets fehlerfrei, lückenlos oder auf dem neuesten Stand sind. Gemäß den gesetzlichen Bestimmungen sind wir als rein privater Betreiber lediglich für unsere eigenen Inhalte auf dieser Seite verantwortlich.</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-1 text-base">Externe Verlinkungen</h3>
            <p>Auf unserer Homepage befinden sich Verweise und Links zu Angeboten von Drittanbietern (z.B. Discord oder EA). Da wir die Gestaltung und die Inhalte dieser fremden Websites nicht kontrollieren können, schließen wir jegliche Haftung dafür aus. Verantwortlich für den Inhalt verlinkter Seiten bleibt ausnahmslos der entsprechende Betreiber.</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-1 text-base">Schutz des Urheberrechts</h3>
            <p>Die von uns kreierten Texte, Grafiken und Werke auf dieser Website sind durch das deutsche Urheberrecht geschützt. Die verwendeten Logos der teilnehmenden Teams wurden von diesen selbst hochgeladen und bleiben selbstverständlich das geistige Eigentum der jeweiligen Clubs oder deren Ersteller.</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-1 text-base">Teilnahme am Turnierbetrieb</h3>
            <p>Jeder Spieler und jedes Team nimmt aus freien Stücken und auf eigene Gefahr an den Wettbewerben des WombiCups teil. Wir schließen jede Form der Haftung für eventuelle Nachteile, Streitigkeiten oder Schäden aus, die im Rahmen der Turniere entstehen könnten.</p>
          </div>
        </div>
      </section>

      {/* 6. EA SPORTS DISCLAIMER */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 bg-blue-500 h-full"></div>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">EA SPORTS Disclaimer</h2>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">
          WombiCup ist ein <strong className="text-white">inoffizielles, von Fans betriebenes Projekt</strong> und steht in <strong className="text-white">keiner Verbindung</strong> zu Electronic Arts Inc. oder dessen Tochtergesellschaften.<br /><br />
          EA SPORTS, EA SPORTS FC, das EA SPORTS FC-Logo und Pro Clubs sind Marken von Electronic Arts Inc. Alle anderen Marken sind Eigentum ihrer jeweiligen Inhaber.
        </p>
      </section>

      {/* 7. DATENSCHUTZ LINK */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8">
        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200 mb-3">Datenschutz</h2>
        <p className="text-gray-400 text-sm mb-6">
          Informationen zum Umgang mit deinen Daten findest du in unserer Datenschutzerklärung.
        </p>
        <Link href="/datenschutz" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg transition-colors text-sm">
          Zur Datenschutzerklärung
        </Link>
      </section>

      {/* STAND */}
      <div className="text-gray-600 text-xs mt-2 pl-2">
        Stand: Mai 2026
      </div>

    </div>
  );
}