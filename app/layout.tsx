import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css"; 

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
      {/* 🔥 GANZ NORMALER BODY: 
        min-h-screen lässt die Seite mindestens so groß wie den Bildschirm sein.
        Der Browser kümmert sich ab sofort komplett von alleine um das Scrollen!
      */}
      <body className="text-white bg-black antialiased flex flex-col min-h-screen w-full relative">
        
        {/* Background Overlay - z-[-10] und pointer-events-none garantieren, dass es keine Klicks klaut */}
        <div className="fixed inset-0 z-[-10] pointer-events-none">
          <div className="absolute inset-0 bg-[url('/bg.webp')] bg-cover bg-center" />
        </div>

        <Navbar />

        {/* Content Container - z-10 hebt ihn über den Hintergrund */}
        <main className="flex-1 w-full relative z-10 pt-20">
          {children}
        </main>

      </body>
    </html>
  );
}