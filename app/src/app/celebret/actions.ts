'use server'

import { timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { checkRateLimit } from '@/lib/rate-limit'
import { celebretCookieName, celebretUnlockValue, getCelebretByToken } from '@/lib/clergy/celebret'

/**
 * Odomknutie údajov celebretu heslom z karty (061). Limit pokusov na celebret aj IP – 4 číslice
 * sa inak dajú vyskúšať. Po úspechu cookie na 30 dní (len pre tento celebret).
 */
export async function unlockCelebret(token: string, code: string): Promise<{ success: boolean; error?: string }> {
  const clean = code.replace(/\D/g, '')
  const [byToken, byIp] = await Promise.all([
    checkRateLimit('celebret-unlock-token', { limit: 10, window: '1 h', identifier: token }),
    checkRateLimit('celebret-unlock-ip', { limit: 30, window: '1 h' }),
  ])
  if (!byToken.success || !byIp.success) return { success: false, error: 'Príliš veľa pokusov. Skúste to o hodinu. / Too many attempts, try again in an hour.' }
  const celebret = await getCelebretByToken(token)
  if (!celebret || clean.length !== 4) return { success: false, error: 'Nesprávne heslo. / Wrong password.' }
  const ok = timingSafeEqual(Buffer.from(clean), Buffer.from(celebret.access_code))
  if (!ok) return { success: false, error: 'Nesprávne heslo. / Wrong password.' }
  ;(await cookies()).set(celebretCookieName(token), celebretUnlockValue(token, celebret.access_code), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return { success: true }
}
