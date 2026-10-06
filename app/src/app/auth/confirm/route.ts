import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/auth/email-links'

const TYPES: EmailOtpType[] = ['invite', 'magiclink', 'recovery', 'email', 'signup']

/**
 * Overenie odkazu z našich e-mailov (pozvánka do zóny farnosti, obnovenie hesla) – lib/auth/email-links.
 * Len POST z tlačidla na /auth/overenie: e-mailové filtre (Outlook Safe Links…) odkazy vopred otvárajú
 * cez GET a jednorazový token by inak minuli. Session sa uloží do cookies, potom pokračujeme na `next`.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const form = await request.formData()
  const tokenHash = String(form.get('token_hash') ?? '')
  const type = String(form.get('type') ?? '') as EmailOtpType
  const next = safeNext(String(form.get('next') ?? ''))

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    // 303 → prehliadač po POST načíta cieľ cez GET
    if (!error) return NextResponse.redirect(`${origin}${next}`, 303)
  }

  return NextResponse.redirect(`${origin}/prihlasenie?error=link`, 303)
}
