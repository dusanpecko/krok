/**
 * Brevo (ex Sendinblue) – pridanie kontaktu do zoznamu newslettera.
 * Env: BREVO_API_KEY (xkeysib-…), BREVO_LIST_ID (číselné ID zoznamu v Brevo → Contacts → Lists).
 * Serverový modul – kľúč nikdy nesmie ísť na klienta.
 */

const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts'
const BREVO_TIMEOUT_MS = 10_000

export function isBrevoConfigured(): boolean {
  return !!process.env.BREVO_API_KEY && !!Number(process.env.BREVO_LIST_ID)
}

export async function addBrevoContact(input: { email: string; firstName?: string | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.BREVO_API_KEY
  const listId = Number(process.env.BREVO_LIST_ID)
  if (!apiKey || !listId) return { ok: false, error: 'Brevo nie je nakonfigurované (BREVO_API_KEY / BREVO_LIST_ID).' }

  try {
    const res = await fetch(BREVO_CONTACTS_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        email: input.email,
        attributes: input.firstName ? { FIRSTNAME: input.firstName } : undefined,
        listIds: [listId],
        // existujúci kontakt len doplníme do zoznamu (inak Brevo vráti duplicate_parameter)
        updateEnabled: true,
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    })
    if (res.ok) return { ok: true }
    const body = await res.text().catch(() => '')
    return { ok: false, error: `Brevo ${res.status}: ${body.slice(0, 300)}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Brevo: neznáma chyba' }
  }
}
