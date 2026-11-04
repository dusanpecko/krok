import type { NewsletterList } from './consent'

/**
 * Brevo (ex Sendinblue) – pridanie kontaktu do zoznamov newslettera.
 * Env: BREVO_API_KEY (xkeysib-…) a číselné ID zoznamov v Brevo → Contacts → Lists:
 * BREVO_LIST_ID (KROK), BREVO_LIST_ID_DCZA (newsletter diecézy), BREVO_LIST_ID_DCZA_LAUNCH (upozornenie na nový web).
 * Serverový modul – kľúč nikdy nesmie ísť na klienta.
 */

const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts'
const BREVO_TIMEOUT_MS = 10_000

const LIST_ENV: Record<NewsletterList, string> = {
  krok: 'BREVO_LIST_ID',
  dcza: 'BREVO_LIST_ID_DCZA',
  dcza_launch: 'BREVO_LIST_ID_DCZA_LAUNCH',
}

export function isBrevoConfigured(): boolean {
  return !!process.env.BREVO_API_KEY && !!Number(process.env.BREVO_LIST_ID)
}

export async function addBrevoContact(input: { email: string; firstName?: string | null; lists?: NewsletterList[] }): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.BREVO_API_KEY
  const lists = input.lists ?? ['krok']
  // zoznam bez ID v env sa preskočí (ostatné sa pošlú) a prihlásenie ostane neodoslané (brevo_error) – doplní sa neskôr
  const listIds = lists.map((l) => Number(process.env[LIST_ENV[l]])).filter(Boolean)
  const missing = lists.filter((l) => !Number(process.env[LIST_ENV[l]])).map((l) => LIST_ENV[l])
  const notConfigured = `Brevo nie je nakonfigurované (${[!apiKey && 'BREVO_API_KEY', ...missing].filter(Boolean).join(' / ')}).`
  if (!apiKey || !listIds.length) return { ok: false, error: notConfigured }

  try {
    const res = await fetch(BREVO_CONTACTS_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        email: input.email,
        attributes: input.firstName ? { FIRSTNAME: input.firstName } : undefined,
        listIds,
        // existujúci kontakt len doplníme do zoznamu (inak Brevo vráti duplicate_parameter)
        updateEnabled: true,
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    })
    if (res.ok) return missing.length ? { ok: false, error: notConfigured } : { ok: true }
    const body = await res.text().catch(() => '')
    return { ok: false, error: `Brevo ${res.status}: ${body.slice(0, 300)}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Brevo: neznáma chyba' }
  }
}
