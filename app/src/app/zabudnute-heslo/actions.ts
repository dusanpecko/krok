'use server'

import { checkRateLimit } from '@/lib/rate-limit'
import { generateEmailLink } from '@/lib/auth/email-links'
import { sendTemplateEmail } from '@/lib/email/send'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * „Zabudli ste heslo?“ – pošle náš e-mail (šablóna password_reset) s odkazom na nastavenie hesla.
 * Vždy vráti úspech, aby sa nedalo zistiť, či účet s e-mailom existuje.
 */
export async function requestPasswordReset(emailInput: string): Promise<{ success: true } | { success: false; error: string }> {
  const email = (emailInput || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { success: false, error: 'Zadajte platnú e-mailovú adresu.' }

  const { success: allowed } = await checkRateLimit('password-reset', { limit: 5, window: '1 h' })
  if (!allowed) return { success: false, error: 'Priveľa pokusov. Skúste to prosím neskôr.' }

  // recovery odkaz vznikne len pre existujúci účet; inak potichu nič
  const link = await generateEmailLink(email, 'recovery', '/nastavit-heslo')
  if (link.success) {
    await sendTemplateEmail({ templateKey: 'password_reset', to: email, variables: { email, reset_url: link.url } })
  }
  return { success: true }
}
