import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Upload PDF a obrázkov na Backblaze B2 cez server actions
      // (predvolený limit 1 MB je pre výročné správy málo)
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
