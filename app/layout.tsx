import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import "./globals.css"; 

import { AuthProvider } from "@/components/AuthProvider";
import { TournamentProvider } from "@/components/TournamentProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
}); 

const geistMono = Geist_Mono({  
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
 
export const metadata: Metadata = {
  title: "WOMBI CUP | Esports Tournament",
  description: "The ultimate tournament experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) { 
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="text-white bg-black antialiased flex flex-col min-h-screen w-full relative">
        
        <AuthProvider>
          <TournamentProvider> 
            
            {/* Background Overlay */}
            <div className="fixed inset-0 z-[-10] pointer-events-none">
              <div className="absolute inset-0 bg-[url('/bg.webp')] bg-cover bg-center" />
            </div>

            <Navbar />

            {/* main nimmt den restlichen Platz ein (flex-1) und drückt den Footer nach unten */}
            <main className="flex-1 w-full relative z-10 pt-20">
              {children}
            </main>

            {/* 🔥 GLOBALE RECHTLICHE LINKS (FOOTER) */}
            <footer className="w-full relative z-10 flex justify-center gap-6 py-6 text-xs font-light text-white/50">
              <Link 
                href="/impressum" 
                className="hover:text-white transition-colors duration-300"
              >
                Impressum
              </Link>
              <Link 
                href="/datenschutz" 
                className="hover:text-white transition-colors duration-300"
              >
                Datenschutz
              </Link>
            </footer>

          </TournamentProvider>
        </AuthProvider>

      </body>
    </html>
  );
}