"use client";

import { useState } from "react";
import Link from "next/link";

export default function DatenschutzPage() {
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="px-4 sm:px-6 pt-10 pb-20 w-full max-w-3xl mx-auto text-white flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="mb-4">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2 w-fit mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Zurück zur Startseite
        </Link>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-1">
          Datenschutzerklärung
        </h1>
        <p className="text-gray-400 text-sm md:text-base">Informationen zum Umgang mit deinen Daten beim WombiCup</p>
      </div>

      {/* 1. DATENSCHUTZ AUF EINEN BLICK */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-sm sm:text-base">
        <div className="flex items-center gap-4 mb-6 text-blue-400">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Datenschutz auf einen Blick</h2>
        </div>
        <p className="text-gray-400 leading-relaxed mb-4">
          Der WombiCup ist ein privates Projekt für EA FC Pro Clubs. Wir erheben nur Daten, die für den Turnierbetrieb und die Darstellung von Spielerstatistiken notwendig sind.
        </p>
        <p className="text-gray-400 leading-relaxed font-bold italic">
          Wir verzichten auf klassische Werbe-Tracking- oder Analyse-Tools. Zur Verbesserung des Spielerlebnisses gleichen wir jedoch Daten mit öffentlichen Schnittstellen ab.
        </p>
      </section>

      {/* 2. DISCORD LOGIN */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-sm sm:text-base">
        <div className="flex items-center gap-4 mb-6 text-blue-400">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.33-.35-.76-.53-1.09a.09.09 0 0 0-.07-.03c-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06-.01.07-.04.41-.56.78-1.15 1.11-1.77.01-.03 0-.06-.03-.07a9.42 9.42 0 0 1-1.63-.78.05.05 0 0 1-.01-.07c.11-.08.23-.17.34-.26.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .03-.01.06 0 .07.01.11.09.23.18.34.26.03.02.02.06-.01.07a9.59 9.59 0 0 1-1.63.78.05.05 0 0 0-.03.07c.33.62.7 1.21 1.11 1.77.02.03.05.04.07.04 1.71-.53 3.44-1.33 5.24-2.65.02-.01.03-.03.03-.05.41-4.32-.47-8.31-3.13-11.97a.06.06 0 0 0-.03-.02zM8.02 15.33c-1.18 0-2.15-1.08-2.15-2.41s.96-2.41 2.15-2.41c1.2 0 2.17 1.09 2.15 2.41 0 1.33-.96 2.41-2.15 2.41zm7.97 0c-1.18 0-2.15-1.08-2.15-2.41s.96-2.41 2.15-2.41c1.2 0 2.17 1.09 2.15 2.41 0 1.33-.96 2.41-2.15 2.41z"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Discord Login</h2>
        </div>
        <p className="text-gray-400 leading-relaxed mb-4">
          Für die Anmeldung beim WombiCup verwenden wir ausschließlich Discord OAuth2. Folgende Daten werden beim Login von Discord an uns übertragen:
        </p>
        <ul className="list-disc list-inside text-gray-400 space-y-1 ml-2 font-medium">
          <li>Discord User-ID</li>
          <li>Benutzername & Nickname</li>
          <li>Avatar-Bild (Profilbild)</li>
        </ul>
      </section>

      {/* 3. EXTERN DATENABGLEICH (EA SPORTS) */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-sm sm:text-base">
        <div className="flex items-center gap-4 mb-6 text-yellow-400">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Spielerstatistiken (EA FC)</h2>
        </div>
        <p className="text-gray-400 leading-relaxed mb-4">
          Um detaillierte Statistiken und Rankings für einzelne Spieler anzuzeigen, rufen wir öffentlich zugängliche Daten von den offiziellen EA SPORTS FC Pro Clubs Servern ab.
        </p>
        <p className="text-gray-400 leading-relaxed">
          Hierbei werden Informationen wie Tore, Vorlagen oder Spielbewertungen basierend auf deiner im Profil hinterlegten EA ID abgefragt und auf unserer Seite visualisiert. Es werden dabei keine privaten Kontoinformationen von EA abgefragt oder gespeichert.
        </p>
      </section>

      {/* 4. TURNIER- UND TEAMDATEN */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-sm sm:text-base">
        <div className="flex items-center gap-4 mb-6 text-yellow-400">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Turnier- und Teamdaten</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <h3 className="text-white font-bold mb-2 text-sm">Team-Daten</h3>
            <ul className="list-disc list-inside text-gray-400 text-xs space-y-1">
              <li>Teamname & Team-ID</li>
              <li>Logo (sofern hochgeladen)</li>
              <li>EA ID & Ingame Namen</li>
              <li>Mitglieder (Discord-IDs)</li>
            </ul>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <h3 className="text-white font-bold mb-2 text-sm">WombiCup Stats</h3>
            <ul className="list-disc list-inside text-gray-400 text-xs space-y-1">
              <li>WombiCup Spielergebnisse</li>
              <li>Torschützen & Assists</li>
              <li>Auszeichnungen & Level</li>
            </ul>
          </div>
        </div>
        <p className="mt-6 text-gray-400 text-xs bg-yellow-500/5 p-4 border border-yellow-500/10 rounded-xl leading-relaxed">
          <span className="text-white font-bold uppercase tracking-widest block mb-1 text-[10px]">Hinweis zur Öffentlichkeit</span>
          Alle Turnierdaten (Teams, Ergebnisse, Statistiken) sind öffentlich einsehbar, um Transparenz für alle Teilnehmer zu ermöglichen.
        </p>
      </section>

      {/* 5. DATENSPEICHERUNG */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-sm sm:text-base">
        <div className="flex items-center gap-4 mb-6 text-blue-400">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Datenspeicherung</h2>
        </div>
        <p className="text-gray-400 leading-relaxed mb-4">
          Deine Daten werden sicher in einer PostgreSQL-Datenbank gespeichert. Wir nutzen modernste Sicherheitsstandards und Verschlüsselung, um deine Daten vor fremdem Zugriff zu schützen.
        </p>
        <p className="text-gray-400 mb-2 font-bold">Speicherdauer:</p>
        <ul className="list-disc list-inside text-gray-400 text-sm space-y-1 ml-2">
          <li>Turnierdaten: Dauerhaft (für Statistiken & Historie)</li>
          <li>Profil- & Teamdaten: Bis zur Löschung durch den Nutzer</li>
        </ul>
      </section>

      {/* 6. COOKIES & LOCAL STORAGE */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-sm sm:text-base">
        <div className="flex items-center gap-4 mb-6 text-blue-400">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-3.9A10 10 0 0 0 12 2Z"/><path d="M3.3 7a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z"/><path d="M11.9 14.2a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z"/><path d="M15.7 8a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z"/><path d="M6.5 15.5a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z"/><path d="M10 3.8a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Cookies & Local Storage</h2>
        </div>
        <p className="text-gray-400 leading-relaxed">
          Wir verwenden ausschließlich technisch notwendige Daten im Local Storage deines Browsers (z.B. Login-Status), um den Betrieb der Seite zu ermöglichen. Es werden keine Tracking-Cookies eingesetzt.
        </p>
      </section>

      {/* 7. DEINE RECHTE (DSGVO) */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-sm sm:text-base">
        <div className="flex items-center gap-4 mb-6 text-blue-400">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Deine Rechte (DSGVO)</h2>
        </div>
        <p className="text-gray-400 mb-4">Du hast gemäß der Datenschutz-Grundverordnung (DSGVO) jederzeit das Recht auf:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-400 text-xs sm:text-sm">
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-bold">•</span>
            <p><span className="text-gray-200 font-bold">Auskunft</span> über deine bei uns gespeicherten Daten</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-bold">•</span>
            <p><span className="text-gray-200 font-bold">Berichtigung</span> unrichtiger oder unvollständiger Daten</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-bold">•</span>
            <p><span className="text-gray-200 font-bold">Löschung</span> deiner Daten, soweit rechtlich zulässig</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-bold">•</span>
            <p><span className="text-gray-200 font-bold">Einschränkung</span> der Datenverarbeitung</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-bold">•</span>
            <p><span className="text-gray-200 font-bold">Widerspruch</span> gegen die Datenverarbeitung</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-bold">•</span>
            <p><span className="text-gray-200 font-bold">Datenübertragbarkeit</span> (Herausgabe der Daten)</p>
          </div>
        </div>
        <p className="mt-4 text-gray-500 text-xs italic">
          Kontaktiere uns per E-Mail oder über unseren Discord-Server, um diese Rechte geltend zu machen.
        </p>
      </section>

      {/* 8. HOSTING & EXTERNE DIENSTE (Vercel & Supabase) */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 bg-blue-500 h-full"></div>
        <h2 className="text-lg font-bold uppercase tracking-wider text-white mb-4">Hosting & Externe Dienste</h2>
        <div className="flex flex-col gap-6 text-sm text-gray-400">
          <div>
            <h3 className="text-white font-bold mb-1">Vercel (Website-Hosting)</h3>
            <p className="mb-2">Wir hosten unsere Website bei Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA. Wenn du unsere Seite besuchst, erfasst Vercel technisch bedingt notwendige Verbindungsdaten (z. B. IP-Adresse, Browsertyp), um die Website korrekt ausliefern zu können und Fehleranalysen durchzuführen.</p>
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">Datenschutzerklärung von Vercel</a>
          </div>
          <div>
            <h3 className="text-white font-bold mb-1">Supabase (Datenbank & Storage)</h3>
            <p className="mb-2">Die Speicherung deiner Turnier- und Teamdaten sowie hochgeladener Bilder erfolgt über Supabase. Die Daten werden auf gesicherten Servern von AWS in Frankfurt (Deutschland/EU) gehostet, um europäische Datenschutzstandards einzuhalten.</p>
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">Datenschutzerklärung von Supabase</a>
          </div>
        </div>
      </section>

      {/* 9. VERANTWORTLICHER (Versteckt hinter Klick) */}
      <section className="bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-sm sm:text-base">
        <div className="flex items-center gap-4 mb-6 text-blue-400">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-200">Verantwortlicher</h2>
        </div>
        
        {!showContact ? (
          <button 
            onClick={() => setShowContact(true)}
            className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 py-2 px-4 rounded-lg transition-all"
          >
            Kontaktdaten des Verantwortlichen anzeigen
          </button>
        ) : (
          <div className="text-gray-300 leading-relaxed animate-in fade-in duration-500">
            <p className="font-bold text-white text-lg mb-1">[X] [X]</p>
            <p>[X] [X]</p>
            <p>[X] [X]</p>
            <p className="mt-2 text-blue-400 hover:underline"><a href="mailto:info@wombicup.de">@wombicup.de</a></p>
            <button 
              onClick={() => setShowContact(false)}
              className="mt-4 text-[10px] uppercase text-gray-500 hover:text-white transition-colors"
            >
              Wieder einklappen
            </button>
          </div>
        )}
      </section>

      {/* FOOTER MESSAGE */}
      <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center">
        <h2 className="text-lg font-bold text-yellow-500 mb-2 uppercase tracking-widest text-[11px]">Fragen zum Datenschutz?</h2>
        <p className="text-gray-300 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
          Solltest du Fragen haben, kannst du uns jederzeit kontaktieren.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="mailto:info@wombicup.de" className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-8 rounded-xl transition-all border border-white/10 text-sm text-center">
            E-Mail senden
          </a>
          <a href="https://discord.gg/Ajjx7eEdBX" target="_blank" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all text-sm text-center">
            Discord Server
          </a>
        </div>
      </section>

      {/* STAND */}
      <div className="text-gray-600 text-[10px] uppercase tracking-widest mt-2 pl-2">
        Stand: Mai 2026
      </div>

    </div>
  );
}