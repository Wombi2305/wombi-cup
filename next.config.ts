/** @type {import('next').NextConfig} */
const nextConfig = {
  // Erlaubt den Zugriff von deinem Smartphone im lokalen Netzwerk
  allowedDevOrigins: ['192.168.2.111'],
  
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lkmjlwobszitlzmyxhsd.supabase.co' }, // 🔥 Hier das https:// entfernt!
      { protocol: 'https', hostname: 'cdn.discordapp.com' }
    ],
  },
};

export default nextConfig;