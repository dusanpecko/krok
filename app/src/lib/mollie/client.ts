import createMollieClient, { type MollieClient } from '@mollie/api-client'

/**
 * Mollie klient pre online dary (jednorazové aj pravidelné).
 *
 * Režim sa prepína env premennou MOLLIE_MODE ('test' | 'live', default 'test').
 * Kľúče: MOLLIE_API_KEY_TEST (test_...) a MOLLIE_API_KEY_LIVE (live_...).
 * Ako záloha sa akceptuje aj jediný MOLLIE_API_KEY (režim sa odvodí z prefixu).
 *
 * Klient sa vytvára lenivo, aby chýbajúci kľúč nezhodil build ani stránky,
 * ktoré Mollie nepotrebujú.
 */

export type MollieMode = 'test' | 'live'

let cached: { mode: MollieMode; client: MollieClient } | null = null

function resolveApiKey(): { mode: MollieMode; apiKey: string } | null {
  const requested = (process.env.MOLLIE_MODE || '').toLowerCase()
  const single = process.env.MOLLIE_API_KEY?.trim()

  if (requested === 'live') {
    const key = process.env.MOLLIE_API_KEY_LIVE?.trim() || (single?.startsWith('live_') ? single : '')
    return key ? { mode: 'live', apiKey: key } : null
  }
  if (requested === 'test') {
    const key = process.env.MOLLIE_API_KEY_TEST?.trim() || (single?.startsWith('test_') ? single : '')
    return key ? { mode: 'test', apiKey: key } : null
  }

  // MOLLIE_MODE nenastavený → preferuj test, potom odvoď z prefixu kľúča
  const test = process.env.MOLLIE_API_KEY_TEST?.trim()
  if (test) return { mode: 'test', apiKey: test }
  const live = process.env.MOLLIE_API_KEY_LIVE?.trim()
  if (live) return { mode: 'live', apiKey: live }
  if (single) return { mode: single.startsWith('live_') ? 'live' : 'test', apiKey: single }
  return null
}

/** Je Mollie nakonfigurované (existuje použiteľný API kľúč)? */
export function isMollieConfigured(): boolean {
  return resolveApiKey() !== null
}

/** Aktuálny režim ('test' | 'live'). Pri nenakonfigurovanom Mollie vracia 'test'. */
export function getMollieMode(): MollieMode {
  return resolveApiKey()?.mode ?? 'test'
}

/** Vráti Mollie klienta. Vyhodí chybu, ak nie je nastavený API kľúč. */
export function getMollieClient(): MollieClient {
  const resolved = resolveApiKey()
  if (!resolved) {
    throw new Error(
      'Mollie nie je nakonfigurované – nastavte MOLLIE_API_KEY_TEST / MOLLIE_API_KEY_LIVE (a MOLLIE_MODE).'
    )
  }
  if (cached && cached.mode === resolved.mode) return cached.client
  cached = { mode: resolved.mode, client: createMollieClient({ apiKey: resolved.apiKey }) }
  return cached.client
}

/**
 * Verejná adresa webu (pre redirectUrl a webhookUrl).
 * NEXT_PUBLIC_BASE_URL, inak Vercel URL, inak localhost.
 */
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/**
 * Webhook URL pre Mollie. Mollie odmieta lokálne adresy (localhost), preto
 * na localhoste vracia undefined – stav platby sa vtedy dosynchronizuje pri
 * návrate darcu na /dakujeme. Pre lokálne testovanie webhooku sa dá nastaviť
 * MOLLIE_WEBHOOK_URL (napr. ngrok tunel).
 */
export function getWebhookUrl(): string | undefined {
  const override = process.env.MOLLIE_WEBHOOK_URL?.trim()
  if (override) return override
  const base = getBaseUrl()
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(base)) return undefined
  return `${base}/api/mollie/webhook`
}

/** Suma vo formáte, ktorý Mollie očakáva ("12.50"). */
export function formatMollieAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2)
}
