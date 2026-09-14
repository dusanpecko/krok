import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server Next 16 blokuje JS/HMR pri prístupe z inej adresy než localhost.
  // Povolené LAN adresy na testovanie z iných zariadení (len vývoj, na produkciu nemá vplyv).
  allowedDevOrigins: ['10.130.2.107', '192.168.*.*', '10.*.*.*'],
  // Staré adresy výziev z mojkrok.dcza.sk (WordPress) → nové /vyzvy/[slug]
  async redirects() {
    return [
      { source: '/grantove-vyzvy', destination: '/vyzvy', permanent: true },
      { source: '/grantove-vyzvy/lectio', destination: '/vyzvy/lectio-divina', permanent: true },
      { source: '/grantove-vyzvy/diecezna-animatorska-skola', destination: '/vyzvy/podpora-mladeze', permanent: true },
      {
        source: '/grantove-vyzvy/chodime-spolu-pomozme-mladym-dobre-sa-pripravit-pre-zivot-v-manzelstve',
        destination: '/vyzvy/chodime-spolu',
        permanent: true,
      },
      { source: '/grantove-vyzvy/:slug', destination: '/vyzvy/:slug', permanent: true },
    ]
  },
  experimental: {
    serverActions: {
      // Upload PDF a obrázkov na Backblaze B2 cez server actions
      // (predvolený limit 1 MB je pre výročné správy málo)
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
