/** @type {import('next').NextConfig} */
const nextConfig = {
  // Erlaubt den Zugriff von deinem Smartphone im lokalen Netzwerk
  allowedDevOrigins: ['192.168.2.111'],
  
  // 🔥 NEU: Erlaubt Next.js, die Discord-Profilbilder zu cachen und zu optimieren
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
    ],
  },
};

export default nextConfig;