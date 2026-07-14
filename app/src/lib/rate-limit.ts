import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { headers } from 'next/headers'

/**
 * Rate-limiting pre verejné server actions (registrácia, kontakt, ...).
 *
 * Backend: Upstash Redis (serverless, funguje naprieč Vercel inštanciami).
 * Vyžaduje env premenné UPSTASH_REDIS_REST_URL a UPSTASH_REDIS_REST_TOKEN.
 *
 * Ak Upstash nie je nakonfigurovaný, limiter je NO-OP (fail-open) — appka
 * funguje ďalej, len bez ochrany. V produkcii to zaloguje varovanie.
 */

type Duration = Parameters<typeof Ratelimit.slidingWindow>[1]

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

const redis = hasUpstash ? Redis.fromEnv() : null
const limiters = new Map<string, Ratelimit>()
let warned = false

function getLimiter(name: string, limit: number, window: Duration): Ratelimit | null {
  if (!redis) return null
  const cacheKey = `${name}:${limit}:${window}`
  let limiter = limiters.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `krok:rl:${name}`,
      analytics: false,
    })
    limiters.set(cacheKey, limiter)
  }
  return limiter
}

/** Zistí IP klienta z hlavičiek (za Vercel proxy). */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return h.get('x-real-ip') ?? 'unknown'
}

export interface RateLimitOptions {
  /** Počet povolených požiadaviek za okno. */
  limit: number
  /** Časové okno, napr. '1 h', '10 m', '30 s'. */
  window: Duration
  /** Vlastný identifikátor (default: IP klienta). */
  identifier?: string
}

/**
 * Skontroluje limit. Vráti `{ success: false }` ak je prekročený.
 * Pri nenakonfigurovanom Upstash vracia vždy success (fail-open).
 */
export async function checkRateLimit(
  name: string,
  opts: RateLimitOptions
): Promise<{ success: boolean }> {
  const limiter = getLimiter(name, opts.limit, opts.window)
  if (!limiter) {
    if (process.env.NODE_ENV === 'production' && !warned) {
      warned = true
      console.warn(
        '[rate-limit] Upstash nie je nakonfigurovaný (UPSTASH_REDIS_REST_URL/TOKEN) – limitovanie je vypnuté.'
      )
    }
    return { success: true }
  }
  const identifier = opts.identifier ?? (await getClientIp())
  const { success } = await limiter.limit(identifier)
  return { success }
}
