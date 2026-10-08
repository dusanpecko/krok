/**
 * Vykreslenie e-mailovej šablóny – zdieľané serverom (odoslanie) aj adminom (náhľad).
 * Bez tajných údajov, dá sa importovať aj na klienta.
 *
 * Syntax šablóny:
 *   {{premenna}}                     – hodnota (HTML-escapovaná)
 *   {{#premenna}}…{{/premenna}}      – blok sa zobrazí, ak je premenná vyplnená / pravdivá
 *   {{^premenna}}…{{/premenna}}      – blok sa zobrazí, ak NIE je
 */

export type EmailVariables = Record<string, string | number | boolean | null | undefined>

export type EmailTemplateKey =
  | 'donor_welcome'
  | 'donation_one_time'
  | 'donation_recurring'
  | 'donation_project'
  | 'donation_anonymous'
  | 'newsletter_welcome'
  | 'parish_box_gift'

export interface EmailTemplate {
  id: string
  template_key: string
  name: string
  description: string | null
  category: string
  subject: string
  body: string
  available_variables: string[]
  from_email: string
  from_name: string
  reply_to: string | null
  is_active: boolean
  sent_count: number
  last_sent_at: string | null
  updated_at: string
}

export const EMAIL_CATEGORY_LABELS: Record<string, string> = {
  account: 'Účet',
  donation: 'Dary',
  newsletter: 'Newsletter',
  clergy: 'Kňazská zóna',
}

/** Popis premenných pre admin (čo znamenajú). */
export const EMAIL_VARIABLE_HELP: Record<string, string> = {
  first_name: 'Krstné meno',
  last_name: 'Priezvisko',
  full_name: 'Celé meno',
  email: 'E-mail príjemcu',
  variable_symbol: 'Variabilný symbol darcu',
  amount: 'Suma daru (napr. 20,00 €)',
  donation_date: 'Dátum daru',
  interval: '„každý mesiac“ / „každý rok“',
  next_payment_date: 'Dátum najbližšej pravidelnej platby',
  project_name: 'Názov výzvy',
  project_url: 'Odkaz na výzvu',
  parish_name: 'Názov farnosti (e-zvonček)',
  parish_url: 'Odkaz na stránku farnosti',
  profile_url: 'Odkaz na profil darcu',
  register_url: 'Odkaz na registráciu',
  site_url: 'Odkaz na web KROK',
  is_recurring: 'Blok len pri pravidelnom dare',
  is_registered: 'Blok len pre darcu s účtom',
  has_name: 'Blok len ak poznáme meno',
  category: 'Kategória dokumentu (kňazská zóna)',
  title: 'Názov dokumentu',
  doc_number: 'Číslo dokumentu (napr. obežníka)',
  summary: 'Krátky popis dokumentu',
  doc_url: 'Odkaz na dokument v kňazskej zóne',
  zone_url: 'Odkaz na kňazskú zónu',
  salutation: 'Oslovenie (napr. „Vážený pán farár“)',
}

/** Ukážkové hodnoty pre náhľad a testovací e-mail. */
export const SAMPLE_EMAIL_VARIABLES: EmailVariables = {
  first_name: 'Mária',
  last_name: 'Nováková',
  full_name: 'Mária Nováková',
  email: 'maria.novakova@example.sk',
  variable_symbol: '11770123',
  amount: '20,00 €',
  donation_date: '6. októbra 2026',
  interval: 'každý mesiac',
  next_payment_date: '6. novembra 2026',
  project_name: 'Oprava strechy kostola',
  project_url: 'https://mojkrok.sk/vyzvy/ukazka',
  parish_name: 'Farnosť Rajec',
  parish_url: 'https://mojkrok.sk/farnosti/rajec',
  profile_url: 'https://mojkrok.sk/profil',
  register_url: 'https://mojkrok.sk/registracia',
  site_url: 'https://mojkrok.sk',
  is_recurring: true,
  is_registered: true,
  has_name: true,
  category: 'Obežníky',
  title: 'Obežník k Adventu a Vianociam',
  doc_number: '7/2026',
  summary: 'Pokyny k adventnej zbierke a sviatočným bohoslužbám.',
  doc_url: 'https://mojkrok.sk/knazska-zona/dokument/ukazka',
  zone_url: 'https://mojkrok.sk/knazska-zona',
  salutation: 'Vážený pán farár',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isTruthy(v: EmailVariables[string]): boolean {
  return v !== undefined && v !== null && v !== false && v !== '' && v !== 0
}

/**
 * Vizuálny editor ukladá značky blokov do samostatných odsekov (<p>{{#x}}</p>)
 * a k odkazom pridáva https:// (https://{{profile_url}}) – vyčistíme to.
 */
function normalizeEditorHtml(html: string): string {
  return html
    .replace(/<p>\s*(\{\{[#^/]\w+\}\})\s*<\/p>/g, '$1')
    .replace(/https?:\/\/(\{\{\w+\}\})/g, '$1')
    .replace(/%7B%7B(\w+)%7D%7D/gi, '{{$1}}')
}

export function renderTemplate(template: string, variables: EmailVariables, opts: { html: boolean }): string {
  let out = opts.html ? normalizeEditorHtml(template) : template

  // Podmienené bloky (opakovane – kvôli vnoreným blokom)
  const block = /\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g
  for (let i = 0; i < 5; i++) {
    const next = out.replace(block, (_m, kind: string, key: string, content: string) =>
      (kind === '#') === isTruthy(variables[key]) ? content : ''
    )
    if (next === out) break
    out = next
  }

  // Neznáma / nevyplnená premenná → prázdny text (príjemca nesmie vidieť {{…}})
  out = out.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const v = variables[key]
    if (v === undefined || v === null || typeof v === 'boolean') return ''
    return opts.html ? escapeHtml(String(v)) : String(v)
  })

  return opts.html ? out.replace(/<p>\s*<\/p>/g, '') : out.replace(/\s+/g, ' ').trim()
}

/** Obalí obsah šablóny do jednotnej hlavičky a pätičky KROK (inline štýly kvôli e-mailovým klientom). */
export function wrapEmailLayout(bodyHtml: string, opts: { siteUrl: string; preheader?: string }): string {
  const siteUrl = escapeHtml(opts.siteUrl)
  return `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  .krok-body a { color: #095096; font-weight: 700; }
  .krok-body p { margin: 0 0 16px; }
  .krok-body h1, .krok-body h2, .krok-body h3 { color: #052342; margin: 0 0 12px; }
</style>
</head>
<body style="margin:0;padding:0;background:#f3f5f8;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f8;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#052342;padding:24px 32px;">
        <a href="${siteUrl}" style="text-decoration:none;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
          <span style="font-size:26px;font-weight:900;letter-spacing:2px;">KROK</span>
          <span style="display:block;font-size:12px;color:#CBBB2D;letter-spacing:1px;text-transform:uppercase;margin-top:4px;">Pastoračný fond Žilinskej diecézy</span>
        </a>
      </td></tr>
      <tr><td class="krok-body" style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1f2937;">
${bodyHtml}
      </td></tr>
      <tr><td style="padding:20px 32px;background:#e2effb;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#4b5563;">
        Pastoračný fond KROK · Žilinská diecéza · <a href="mailto:mojkrok@dcza.sk" style="color:#095096;">mojkrok@dcza.sk</a><br>
        <a href="${siteUrl}" style="color:#095096;">${siteUrl.replace(/^https?:\/\//, '')}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
