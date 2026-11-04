/**
 * Dočasná stránka „Pripravujeme nový web“ na dcza.sk (D6) – kým nie je web diecézy spustený.
 * Zapína ju DCZA_COMING_SOON=1 (len produkcia); týka sa iba dcza.sk, www.dcza.sk a subdomén *.dcza.sk
 * (okrem celebret) – mojkrok.sk, test.mojkrok.sk ani dcza.dev sa nemenia. Starý web je archivovaný.
 * Samostatné HTML bez databázy a layoutu, odpoveď 503 + Retry-After (vyhľadávače stránky dočasne nevyradia).
 * Bez serverových závislostí – používa ju middleware (edge).
 */

export function isDczaComingSoon(host: string | null | undefined): boolean {
  if (process.env.DCZA_COMING_SOON !== '1') return false
  const h = (host ?? '').toLowerCase().split(':')[0]
  return h === 'dcza.sk' || (h.endsWith('.dcza.sk') && h !== 'celebret.dcza.sk')
}

const HTML = `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Žilinská diecéza – pripravujeme nový web</title>
<meta name="description" content="Rímskokatolícka cirkev – Žilinská diecéza. Pripravujeme nový web diecézy.">
<link rel="icon" href="/dcza/erb-240.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;900&display=swap" rel="stylesheet">
<style>
  :root { --blue: #095096; --deep: #052342; --gold: #CBBB2D; --gold-bright: #F5E300; --paper: #faf9f5; --ink: #1a2433; --mute: #5b6577; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--deep); color: #fff; min-height: 100vh; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased; }
  .hero { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 64px 16px 48px;
    background: radial-gradient(ellipse at 50% 0%, rgba(9,80,150,.55), transparent 65%); }
  .hero img { width: 96px; height: auto; margin-bottom: 28px; }
  .kicker { font-size: 12px; font-weight: 900; letter-spacing: .28em; text-transform: uppercase; color: var(--gold); margin: 0 0 18px; }
  h1 { font-weight: 300; font-size: clamp(34px, 7vw, 64px); line-height: 1.08; letter-spacing: -.02em; margin: 0 0 22px; }
  h1 strong { font-weight: 900; color: var(--gold-bright); }
  .lead { max-width: 560px; font-size: 17px; line-height: 1.65; color: rgba(255,255,255,.75); margin: 0; }
  .fb { margin-top: 30px; display: inline-flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 14px; background: rgba(255,255,255,.1); color: #fff; font-weight: 700; font-size: 14px; text-decoration: none; }
  .fb:hover { background: rgba(255,255,255,.16); }
  .fb span { width: 22px; height: 22px; border-radius: 50%; background: #1877F2; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; }
  .info { background: var(--paper); color: var(--ink); padding: 48px 16px; }
  .grid { max-width: 960px; margin: 0 auto; display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .card { background: #fff; border: 1px solid rgba(9,80,150,.1); border-radius: 24px; padding: 24px; }
  .card h2 { font-size: 11px; font-weight: 900; letter-spacing: .2em; text-transform: uppercase; color: var(--blue); margin: 0 0 14px; }
  .card p { margin: 0; font-size: 15px; line-height: 1.7; }
  .card strong { font-weight: 700; }
  .card a { color: var(--blue); text-decoration: none; font-weight: 700; }
  .card a:hover { text-decoration: underline; }
  footer { background: var(--paper); color: var(--mute); text-align: center; font-size: 12px; padding: 0 16px 32px; }
</style>
</head>
<body>
  <section class="hero">
    <img src="/dcza/erb-240.png" alt="Erb Žilinskej diecézy" width="96" height="112">
    <p class="kicker">Rímskokatolícka cirkev · Žilinská diecéza</p>
    <h1>Pripravujeme<br><strong>nový web</strong></h1>
    <p class="lead">Čoskoro tu nájdete aktuality, kalendár podujatí, schematizmus, farnosti a všetko o živote Žilinskej diecézy na jednom mieste.</p>
    <a class="fb" href="https://www.facebook.com/zilinskadieceza" target="_blank" rel="noopener noreferrer"><span>f</span> Medzitým nás sledujte na Facebooku</a>
  </section>
  <section class="info">
    <div class="grid">
      <div class="card">
        <h2>Kontakt</h2>
        <p><strong>Biskupský úrad Žilina</strong><br>Jána Kalinčiaka 1<br>P. O. Box B-46<br>011 36 Žilina 1</p>
        <p style="margin-top:12px">tel.: <a href="tel:+421415002215">+421 41 500 22 15</a><br>tel.: <a href="tel:+421904738524">+421 904 738 524</a><br>e-mail: <a href="mailto:sekretariat@dcza.sk">sekretariat@dcza.sk</a><br>e-mail: <a href="mailto:kuria@dcza.sk">kuria@dcza.sk</a></p>
      </div>
      <div class="card">
        <h2>Fakturačné údaje</h2>
        <p><strong>Rímskokatolícka cirkev<br>Žilinská diecéza</strong><br>Jána Kalinčiaka 1<br>010 01 Žilina</p>
        <p style="margin-top:12px">IČO: 42063043<br>DIČ: 2022594398<br>IČ DPH: SK2022594398</p>
      </div>
    </div>
  </section>
  <footer>© Žilinská diecéza</footer>
</body>
</html>`

export function dczaComingSoonResponse(): Response {
  return new Response(HTML, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '86400', 'Cache-Control': 'no-store' },
  })
}
