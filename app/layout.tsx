import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css"; 

// 🔥 WICHTIG: Den neuen AuthProvider importieren
import { AuthProvider } from "@/components/AuthProvider";

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
        
        {/* 🔥 Wir wickeln die gesamte App in den AuthProvider ein */}
        <AuthProvider>
          
          {/* Background Overlay */}
          <div className="fixed inset-0 z-[-10] pointer-events-none">
            <div className="absolute inset-0 bg-[url('/bg.webp')] bg-cover bg-center" />
          </div>

          {/* Die Navbar hat jetzt auch sofort Zugriff auf den User-Status */}
          <Navbar />

          {/* Content Container */}
          <main className="flex-1 w-full relative z-10 pt-20">
            {children}
          </main>

        </AuthProvider>

      </body>
    </html>
  );
}