import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'
import { addBrevoContact } from './brevo'
import { sendNewsletterWelcomeEmail } from '@/lib/email/notifications'
import { NEWSLETTER_LIST_CONSENT, NEWSLETTER_LISTS, type NewsletterList } from './consent'

/**
 * Prihlásenie na newsletter (pätička mojkrok.sk / dcza.sk, stránka „Pripravujeme nový web“):
 * uloží súhlas u nás (záloha); pri newsletteri KROK pošle kontakt aj do Brevo.
 * Ak Brevo zlyhá, prihlásenie sa aj tak uloží (brevo_error) – dá sa doposlať neskôr. Serverový modul.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export type SubscribeResult = { success: true; alreadySubscribed?: boolean } | { success: false; error: string }

export async function subscribeToNewsletter(input: {
  email: string
  firstName?: string
  lists: NewsletterList[]
  source?: string
  /** Honeypot – skryté pole, vyplnia ho len boty */
  website?: string
}): Promise<SubscribeResult> {
  if (input.website) return { success: true } // bot – tváríme sa úspešne

  const { success: withinLimit } = await checkRateLimit('newsletter', { limit: 5, window: '1 h' })
  if (!withinLimit) return { success: false, error: 'Priveľa pokusov. Skúste to prosím neskôr.' }

  const email = (input.email || '').trim().toLowerCase()
  const firstName = (input.firstName || '').trim().slice(0, 80) || null
  const lists = NEWSLETTER_LISTS.filter((l) => input.lists.includes(l))
  if (!EMAIL_RE.test(email) || email.length > 254) return { success: false, error: 'Zadajte platnú e-mailovú adresu.' }
  if (!lists.length) return { success: false, error: 'Vyberte, čo vám máme posielať.' }

  // Service-role klient – tabuľka newsletter_subscribers nemá verejné politiky
  const supabaseAdmin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: existing } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('id, status, lists, consent_text, brevo_synced_at, brevo_error')
    .ilike('email', email)
    .maybeSingle()
  const before: NewsletterList[] = existing?.status === 'subscribed' ? existing.lists ?? [] : []
  const added = lists.filter((l) => !before.includes(l))
  const toBrevo = lists.includes('krok')
  const alreadySubscribed = !added.length && (!toBrevo || !!existing?.brevo_synced_at)

  // Darca s rovnakým e-mailom → prepojiť a pri newsletteri KROK zaškrtnúť newsletter aj v jeho profile
  const { data: donor } = await supabaseAdmin
    .from('donors')
    .select('id')
    .ilike('email', email)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (donor && toBrevo) await supabaseAdmin.from('donors').update({ newsletter_opt_in: true }).eq('id', donor.id)

  // upozornenie na spustenie webu ostáva len u nás – do Brevo ide iba newsletter KROK
  const brevo = toBrevo ? await addBrevoContact({ email, firstName }) : null
  // súhlasy k skôr odoberaným zoznamom ostávajú v evidencii, nové sa pripíšu
  const consents = added.map((l) => NEWSLETTER_LIST_CONSENT[l])
  const row = {
    email,
    first_name: firstName,
    status: 'subscribed',
    lists: NEWSLETTER_LISTS.filter((l) => before.includes(l) || lists.includes(l)),
    source: (input.source || 'web').slice(0, 40),
    consent_text: before.length && existing?.consent_text
      ? [existing.consent_text, ...consents].join('\n')
      : lists.map((l) => NEWSLETTER_LIST_CONSENT[l]).join('\n'),
    consent_at: new Date().toISOString(),
    donor_id: donor?.id ?? null,
    brevo_synced_at: brevo?.ok ? new Date().toISOString() : existing?.brevo_synced_at ?? null,
    brevo_error: !brevo || brevo.ok ? existing?.brevo_error ?? null : brevo.error,
    updated_at: new Date().toISOString(),
  }

  const { error } = existing
    ? await supabaseAdmin.from('newsletter_subscribers').update(row).eq('id', existing.id)
    : await supabaseAdmin.from('newsletter_subscribers').insert(row)
  if (error) {
    console.error('[newsletter] Uloženie prihlásenia zlyhalo:', error.message)
    return { success: false, error: 'Prihlásenie sa nepodarilo. Skúste to prosím neskôr.' }
  }
  if (brevo && !brevo.ok) console.error('[newsletter] Brevo:', brevo.error)
  // Potvrdenie (šablóna KROK) len pri novom prihlásení na newsletter KROK – opakované odoslanie e-mail nepošle
  if (added.includes('krok')) await sendNewsletterWelcomeEmail({ email, firstName })

  return { success: true, alreadySubscribed }
}
