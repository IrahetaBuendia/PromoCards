import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@promocards/types"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.fedecredito.com.sv" },
      { protocol: "https", hostname: "www.bancoagricola.com" },
      { protocol: "https", hostname: "www.baccredomatic.com" },
      { protocol: "https", hostname: "www.credicomer.com.sv" },
      { protocol: "https", hostname: "www.credisiman.com" },
      { protocol: "https", hostname: "www.corporacionbi.com" },
    ],
  },
};

export default nextConfig;
