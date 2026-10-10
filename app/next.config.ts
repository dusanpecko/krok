import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server Next 16 blokuje JS/HMR pri prístupe z inej adresy než localhost.
  // Povolené LAN adresy na testovanie z iných zariadení (len vývoj, na produkciu nemá vplyv).
  // + Tailscale (prístup na Mac Studio cez SSH / VPN): adresy 100.x a názvy *.ts.net
  allowedDevOrigins: ['10.130.2.107', '192.168.*.*', '10.*.*.*', '100.*.*.*', '*.ts.net'],
  // Staré adresy výziev z mojkrok.dcza.sk (WordPress) → nové /vyzvy/[slug]
  // Mimo produkcie (staging / preview) – žiadne indexovanie ani pri odkaze odinakiaľ
  async headers() {
    if (process.env.VERCEL_ENV === 'production') return []
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
  },
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
      { source: '/vseobecne-obchodne-podmienky', destination: '/podmienky', permanent: true },
      // Ďalšie staré adresy WordPressu, ktoré mali návštevy podľa Umami (2026) – nech nekončia na 404
      { source: '/grantova-vyzva-2025', destination: '/vyzvy', permanent: true },
      { source: '/farnost-:slug', destination: '/farnosti/:slug', permanent: true },
      { source: '/obnovitheslo', destination: '/prihlasenie', permanent: true },
      { source: '/login', destination: '/prihlasenie', permanent: true },
      { source: '/thank-you', destination: '/dakujeme', permanent: true },
      { source: '/projekty', destination: '/podporene-projekty', permanent: true },
      { source: '/projekty22', destination: '/podporene-projekty', permanent: true },
      { source: '/projects/:path*', destination: '/podporene-projekty', permanent: true },
      { source: '/category/:path*', destination: '/podporene-projekty', permanent: true },
      { source: '/kategorie/:path*', destination: '/podporene-projekty', permanent: true },
      { source: '/3d-flip-book/:path*', destination: '/na-stiahnutie', permanent: true },
      { source: '/vyrocna-sprava-pastoracnej-cinnosti-dcza-za-rok-2023', destination: '/na-stiahnutie', permanent: true },
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
