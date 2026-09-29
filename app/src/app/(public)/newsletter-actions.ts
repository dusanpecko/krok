'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'
import { addBrevoContact } from '@/lib/newsletter/brevo'
import { NEWSLETTER_CONSENT_TEXT } from '@/lib/newsletter/consent'

// Service-role klient – tabuľka newsletter_subscribers nemá verejné politiky
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Prihlásenie na newsletter z webu: uloží súhlas u nás (záloha) a pošle kontakt do Brevo.
 * Ak Brevo zlyhá, prihlásenie sa aj tak uloží (brevo_error) – dá sa doposlať neskôr.
 */
export async function subscribeNewsletter(input: {
  email: string
  firstName?: string
  consent: boolean
  source?: string
  /** Honeypot – skryté pole, vyplnia ho len boty */
  website?: string
}): Promise<{ success: true; alreadySubscribed?: boolean } | { success: false; error: string }> {
  if (input.website) return { success: true } // bot – tváríme sa úspešne

  const { success: withinLimit } = await checkRateLimit('newsletter', { limit: 5, window: '1 h' })
  if (!withinLimit) return { success: false, error: 'Priveľa pokusov. Skúste to prosím neskôr.' }

  const email = (input.email || '').trim().toLowerCase()
  const firstName = (input.firstName || '').trim().slice(0, 80) || null
  if (!EMAIL_RE.test(email) || email.length > 254) return { success: false, error: 'Zadajte platnú e-mailovú adresu.' }
  if (!input.consent) return { success: false, error: 'Pre prihlásenie je potrebný súhlas so zasielaním newslettera.' }

  const { data: existing } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('id, status, brevo_synced_at')
    .ilike('email', email)
    .maybeSingle()
  const alreadySubscribed = existing?.status === 'subscribed' && !!existing.brevo_synced_at

  // Darca s rovnakým e-mailom → prepojiť a zaškrtnúť newsletter aj v jeho profile
  const { data: donor } = await supabaseAdmin
    .from('donors')
    .select('id')
    .ilike('email', email)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (donor) await supabaseAdmin.from('donors').update({ newsletter_opt_in: true }).eq('id', donor.id)

  const brevo = await addBrevoContact({ email, firstName })
  const row = {
    email,
    first_name: firstName,
    status: 'subscribed',
    source: (input.source || 'web').slice(0, 40),
    consent_text: NEWSLETTER_CONSENT_TEXT,
    consent_at: new Date().toISOString(),
    donor_id: donor?.id ?? null,
    brevo_synced_at: brevo.ok ? new Date().toISOString() : existing?.brevo_synced_at ?? null,
    brevo_error: brevo.ok ? null : brevo.error,
    updated_at: new Date().toISOString(),
  }

  const { error } = existing
    ? await supabaseAdmin.from('newsletter_subscribers').update(row).eq('id', existing.id)
    : await supabaseAdmin.from('newsletter_subscribers').insert(row)
  if (error) {
    console.error('[newsletter] Uloženie prihlásenia zlyhalo:', error.message)
    return { success: false, error: 'Prihlásenie sa nepodarilo. Skúste to prosím neskôr.' }
  }
  if (!brevo.ok) console.error('[newsletter] Brevo:', brevo.error)

  return { success: true, alreadySubscribed }
}
