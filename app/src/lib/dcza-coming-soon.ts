/**
 * Dočasná stránka „Pripravujeme nový web“ na dcza.sk (D6) – kým nie je web diecézy spustený.
 * Zapína ju DCZA_COMING_SOON=1 (len produkcia); týka sa iba dcza.sk, www.dcza.sk a subdomén *.dcza.sk
 * (okrem celebret) – mojkrok.sk, test.mojkrok.sk ani dcza.dev sa nemenia. Starý web je archivovaný.
 * Samostatné HTML bez databázy a layoutu, odpoveď 503 + Retry-After (vyhľadávače stránky dočasne nevyradia).
 * Formulár „Dáme vám vedieť“ posiela na DCZA_COMING_SOON_SIGNUP_PATH (jediná cesta, ktorú middleware pustí ďalej):
 * upozornenie na spustenie webu + voliteľne newsletter KROK (posiela aj v mene diecézy; samostatný súhlas, 064).
 * Bez serverových závislostí – používa ju middleware (edge).
 */

export const DCZA_COMING_SOON_SIGNUP_PATH = '/api/newsletter/dcza'

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
  .notify { width: 100%; max-width: 520px; margin-top: 36px; text-align: left; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 24px; padding: 24px; }
  .notify h2 { font-size: 20px; font-weight: 700; margin: 0 0 6px; }
  .notify > p { font-size: 14px; line-height: 1.6; color: rgba(255,255,255,.7); margin: 0 0 16px; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; }
  .row input { flex: 1 1 200px; min-width: 0; padding: 13px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); color: #fff; font: inherit; font-size: 15px; outline: none; }
  .row input.name { flex: 0 1 150px; }
  .row input::placeholder { color: rgba(255,255,255,.45); }
  .row input:focus { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
  .opt { display: flex; gap: 10px; align-items: flex-start; margin-top: 14px; cursor: pointer; font-size: 14px; line-height: 1.5; }
  .opt input { width: 18px; height: 18px; margin: 1px 0 0; accent-color: var(--gold); flex-shrink: 0; }
  .opt small { display: block; color: rgba(255,255,255,.55); font-size: 12px; }
  .send { margin-top: 18px; width: 100%; padding: 14px 20px; border: 0; border-radius: 14px; background: linear-gradient(90deg, var(--gold), var(--gold-bright), var(--gold)); color: var(--deep); font: inherit; font-size: 15px; font-weight: 900; cursor: pointer; }
  .send:disabled { opacity: .6; cursor: wait; }
  .legal { margin: 12px 0 0; font-size: 11px; line-height: 1.6; color: rgba(255,255,255,.5); }
  .legal a { color: rgba(255,255,255,.75); }
  .msg { display: none; margin-top: 14px; padding: 12px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; }
  .msg.ok, #prihlasenie-ok:target { display: block; background: rgba(203,187,45,.15); border: 1px solid rgba(203,187,45,.4); }
  .msg.err, #prihlasenie-chyba:target { display: block; background: rgba(220,60,60,.15); border: 1px solid rgba(220,60,60,.4); }
  .hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
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
    <form class="notify" id="notify" method="post" action="${DCZA_COMING_SOON_SIGNUP_PATH}">
      <h2>Dáme vám vedieť</h2>
      <p>Nechajte nám e-mail – napíšeme vám, keď nový web spustíme. Ak chcete, môžete dostávať aj newsletter KROK – Pastoračného fondu Žilinskej diecézy.</p>
      <input type="hidden" name="launch" value="1">
      <div class="hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div>
      <div class="row">
        <input class="name" type="text" name="first_name" placeholder="Meno (nepovinné)" autocomplete="given-name" aria-label="Meno (nepovinné)" maxlength="80">
        <input type="email" name="email" placeholder="vas@email.sk" autocomplete="email" aria-label="E-mail" required>
      </div>
      <label class="opt"><input type="checkbox" name="krok" value="1"><span>Newsletter KROK – Pastoračného fondu<small>Výzvy, podporené projekty a život fondu</small></span></label>
      <button class="send" type="submit">Dajte mi vedieť</button>
      <p class="legal">Odoslaním súhlasíte s jednorazovým e-mailom o spustení nového webu; newsletter len ak ho zaškrtnete. Odhlásiť sa môžete kedykoľvek odkazom v e-maile. <a href="https://mojkrok.sk/ochrana-udajov" target="_blank" rel="noopener">Ochrana osobných údajov</a></p>
      <div class="msg" id="prihlasenie-ok" role="status">Ďakujeme! Keď nový web spustíme, dáme vám vedieť.</div>
      <div class="msg" id="prihlasenie-chyba" role="alert">Prihlásenie sa nepodarilo. Skúste to prosím znova.</div>
    </form>
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
<script>
(function () {
  var f = document.getElementById('notify'), ok = document.getElementById('prihlasenie-ok'), err = document.getElementById('prihlasenie-chyba');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = f.querySelector('.send'), d = new FormData(f), body = {};
    d.forEach(function (v, k) { body[k] = v; });
    ok.className = err.className = 'msg'; btn.disabled = true; btn.textContent = 'Odosielam…';
    fetch(f.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success) {
          ok.textContent = res.alreadySubscribed ? 'Tento e-mail už máme. Ďakujeme, že ste s nami.' : 'Ďakujeme! Keď nový web spustíme, dáme vám vedieť.';
          ok.className = 'msg ok'; f.querySelectorAll('input, .send').forEach(function (el) { el.disabled = true; }); btn.textContent = 'Prihlásené';
        } else { err.textContent = res.error || 'Prihlásenie sa nepodarilo.'; err.className = 'msg err'; btn.disabled = false; btn.textContent = 'Dajte mi vedieť'; }
      })
      .catch(function () { err.textContent = 'Prihlásenie sa nepodarilo. Skúste to prosím znova.'; err.className = 'msg err'; btn.disabled = false; btn.textContent = 'Dajte mi vedieť'; });
  });
})();
</script>
</body>
</html>`

export function dczaComingSoonResponse(): Response {
  return new Response(HTML, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '86400', 'Cache-Control': 'no-store' },
  })
}
