import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Das hier einfügen: Erlaubt den Zugriff von deinem Smartphone im lokalen Netzwerk
  allowedDevOrigins: ['192.168.2.111'],
  
  // (Falls hier schon andere Dinge standen, lass sie einfach stehen!)
};

export default nextConfig;