import { createClient, type User } from '@supabase/supabase-js'
import { getBaseUrl } from '@/lib/mollie/client'

/**
 * Odkazy do e-mailov (pozvánka, obnovenie hesla), ktoré posielame sami cez email_templates
 * namiesto anglických šablón Supabase Auth. Supabase vygeneruje jednorazový token (hashed_token),
 * odkaz vedie na našu /auth/overenie (tlačidlo) → POST /auth/confirm, kde ho server overí (verifyOtp) a nastaví session v cookies.
 * Serverový modul – používa service role.
 */

export type EmailLinkType = 'invite' | 'magiclink' | 'recovery'

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/** Bezpečná interná cesta (len relatívna, nie //host) */
export function safeNext(next: string | null | undefined, fallback = '/auth/post-login'): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}

/**
 * Vygeneruje odkaz pre e-mail. `invite` používateľa založí; pre už existujúci, no ešte neaktivovaný
 * účet treba `magiclink` (opätovná pozvánka). Po overení sa pokračuje na `next`.
 */
export async function generateEmailLink(
  email: string,
  type: EmailLinkType,
  next: string
): Promise<{ success: true; url: string; user: User } | { success: false; error: string }> {
  const { data, error } = await adminClient().auth.admin.generateLink({ type, email })
  const hashed = data?.properties?.hashed_token
  if (error || !hashed || !data.user) return { success: false, error: error?.message ?? 'Odkaz sa nepodarilo vytvoriť.' }
  const url = `${getBaseUrl()}/auth/overenie?token_hash=${encodeURIComponent(hashed)}&type=${type}&next=${encodeURIComponent(safeNext(next))}`
  return { success: true, url, user: data.user }
}
