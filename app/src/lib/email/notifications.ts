import { createClient } from '@supabase/supabase-js'
import { getBaseUrl } from '@/lib/mollie/client'
import { formatEur } from '@/lib/projects/types'
import type { EmailTemplateKey } from './render'
import { sendTemplateEmail } from './send'

/**
 * Automatické e-maily pri udalostiach (registrácia, online dar, newsletter).
 * Volajú sa až po úspešnom zápise do DB a len z miest, ktoré danú udalosť
 * spracujú práve raz – samy idempotenciu neriešia. Nikdy nevyhodia výnimku.
 */

type Admin = ReturnType<typeof serviceClient>

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const DATE_FMT = new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bratislava' })

function formatDate(d: Date | string): string {
  return DATE_FMT.format(typeof d === 'string' ? new Date(d) : d)
}

function intervalText(interval: string | null | undefined): string {
  return interval === 'year' ? 'každý rok' : 'každý mesiac'
}

interface DonorForEmail {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  variable_symbol: string | number | null
  auth_user_id: string | null
}

/** Pri automaticky založenom darcovi (bez mena z formulára) je meno zástupné – v e-maile ho nepoužijeme. */
function donorNameVars(d: DonorForEmail) {
  const placeholder = (d.first_name === 'Darca' && (!d.last_name || d.last_name === 'online')) || !d.first_name
  const first = placeholder ? '' : d.first_name!.trim()
  const last = placeholder ? '' : (d.last_name || '').trim()
  return {
    first_name: first,
    last_name: last,
    full_name: `${first} ${last}`.trim(),
    has_name: !!first,
  }
}

async function loadDonor(admin: Admin, donorId: string): Promise<DonorForEmail | null> {
  const { data } = await admin
    .from('donors')
    .select('id, email, first_name, last_name, variable_symbol, auth_user_id')
    .eq('id', donorId)
    .maybeSingle()
  return (data as DonorForEmail | null) ?? null
}

/** Uvítací e-mail po registrácii (prvé založenie / prepojenie darcu s účtom). */
export async function sendDonorWelcomeEmail(donorId: string): Promise<void> {
  try {
    const admin = serviceClient()
    const donor = await loadDonor(admin, donorId)
    if (!donor?.email) return
    const names = donorNameVars(donor)
    await sendTemplateEmail({
      templateKey: 'donor_welcome',
      to: donor.email,
      toName: names.full_name || null,
      donorId: donor.id,
      variables: {
        ...names,
        first_name: names.first_name || 'priateľ',
        email: donor.email,
        variable_symbol: donor.variable_symbol != null ? String(donor.variable_symbol) : '',
        profile_url: `${getBaseUrl()}/profil`,
      },
    })
  } catch (err) {
    console.error('[email] Uvítací e-mail:', err instanceof Error ? err.message : err)
  }
}

/**
 * Poďakovanie za online dar. Výber šablóny:
 *  dar na výzvu → donation_project; darca bez účtu → donation_anonymous;
 *  inak pravidelný (prvá platba) → donation_recurring, jednorazový → donation_one_time.
 */
export async function sendDonationThankYouEmail(input: {
  donorId: string
  donationId: string
  amount: number
  paidAt: string
  recurring: boolean
  interval?: string | null
  projectId?: string | null
  /** E-mail z platobného formulára – ak darca v profile e-mail nemá */
  fallbackEmail?: string | null
}): Promise<void> {
  try {
    const admin = serviceClient()
    const donor = await loadDonor(admin, input.donorId)
    const to = donor?.email || input.fallbackEmail
    if (!donor || !to) return

    const base = getBaseUrl()
    const isRegistered = !!donor.auth_user_id
    const names = donorNameVars(donor)

    let project: { name: string; slug: string | null } | null = null
    if (input.projectId) {
      const { data } = await admin.from('projects').select('name, slug').eq('id', input.projectId).maybeSingle()
      project = data ?? null
    }

    const paid = new Date(input.paidAt)
    const next = new Date(paid)
    if (input.interval === 'year') next.setFullYear(next.getFullYear() + 1)
    else next.setMonth(next.getMonth() + 1)

    const templateKey: EmailTemplateKey = project
      ? 'donation_project'
      : !isRegistered
        ? 'donation_anonymous'
        : input.recurring
          ? 'donation_recurring'
          : 'donation_one_time'

    await sendTemplateEmail({
      templateKey,
      to,
      toName: names.full_name || null,
      donorId: donor.id,
      donationId: input.donationId,
      variables: {
        ...names,
        // v šablónach pre registrovaných je oslovenie „Milý/á {{first_name}}“
        first_name: names.first_name || (isRegistered ? 'priateľ' : ''),
        email: to,
        variable_symbol: donor.variable_symbol != null ? String(donor.variable_symbol) : '',
        amount: formatEur(input.amount),
        donation_date: formatDate(paid),
        interval: input.recurring ? intervalText(input.interval) : '',
        next_payment_date: input.recurring ? formatDate(next) : '',
        project_name: project?.name ?? '',
        project_url: project?.slug ? `${base}/vyzvy/${project.slug}` : `${base}/vyzvy`,
        profile_url: `${base}/profil`,
        register_url: `${base}/registracia`,
        is_recurring: input.recurring,
        is_registered: isRegistered,
      },
    })
  } catch (err) {
    console.error('[email] Poďakovanie za dar:', err instanceof Error ? err.message : err)
  }
}

/** Potvrdenie prihlásenia na newsletter (len nové prihlásenie). */
export async function sendNewsletterWelcomeEmail(input: { email: string; firstName?: string | null }): Promise<void> {
  const firstName = input.firstName?.trim() || ''
  await sendTemplateEmail({
    templateKey: 'newsletter_welcome',
    to: input.email,
    toName: firstName || null,
    variables: { first_name: firstName, has_name: !!firstName, email: input.email },
  })
}

/** Poďakovanie za dar do e-zvončeka farnosti (jednorazový alebo prvá platba pravidelného). */
export async function sendParishBoxThankYouEmail(input: {
  parishId: string
  donorId: string | null
  amount: number
  paidAt: string
  recurring: boolean
  interval?: string | null
  email: string | null
  donorName: string | null
}): Promise<void> {
  try {
    const admin = serviceClient()
    const [{ data: parish }, donor] = await Promise.all([
      admin.from('parishes').select('name, slug').eq('id', input.parishId).maybeSingle(),
      input.donorId ? loadDonor(admin, input.donorId) : Promise.resolve(null),
    ])
    const to = donor?.email || input.email
    if (!parish || !to) return

    const base = getBaseUrl()
    const names = donor
      ? donorNameVars(donor)
      : (() => {
          const parts = (input.donorName || '').trim().split(/\s+/).filter(Boolean)
          const first = parts[0] || ''
          return { first_name: first, last_name: parts.slice(1).join(' '), full_name: parts.join(' '), has_name: !!first }
        })()

    await sendTemplateEmail({
      templateKey: 'parish_box_gift',
      to,
      toName: names.full_name || null,
      donorId: donor?.id ?? null,
      variables: {
        ...names,
        email: to,
        amount: formatEur(input.amount),
        donation_date: formatDate(input.paidAt),
        interval: input.recurring ? intervalText(input.interval) : '',
        parish_name: parish.name,
        parish_url: parish.slug ? `${base}/farnosti/${parish.slug}` : `${base}/farnosti`,
        profile_url: `${base}/profil`,
        is_recurring: input.recurring,
        is_registered: !!donor?.auth_user_id,
      },
    })
  } catch (err) {
    console.error('[email] Poďakovanie za dar do e-zvončeka:', err instanceof Error ? err.message : err)
  }
}
