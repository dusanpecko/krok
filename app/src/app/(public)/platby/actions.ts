'use server'

import { randomUUID } from 'crypto'
import { SequenceType } from '@mollie/api-client'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getSessionUser, requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  formatMollieAmount,
  getBaseUrl,
  getMollieClient,
  getMollieMode,
  getWebhookUrl,
  isMollieConfigured,
} from '@/lib/mollie/client'
import {
  cancelOnlineSubscription,
  isTerminalStatus,
  processMolliePayment,
  subscriptionDescription,
  type PaymentKind,
  type PaymentMetadata,
  type SubscriptionInterval,
} from '@/lib/mollie/process-payment'

/**
 * Verejné server actions pre online dary (Mollie).
 * Zápisy idú cez service_role – tabuľky online_* nemajú pre anon/darcu INSERT.
 */

const MIN_AMOUNT = 1
const MAX_AMOUNT = 10000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function serviceClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export interface StartDonationInput {
  amount: number
  recurring: boolean
  interval?: SubscriptionInterval
  email: string
  name?: string
  projectId?: string | null
  /** Pri pravidelnom dare: id existujúceho pravidelného daru, ktorý sa má po úspešnej platbe zrušiť (zmena výšky). */
  replaceSubscriptionId?: string | null
}

export type StartDonationResult = { success: true; url: string } | { success: false; error: string }

/**
 * Založí platbu u Mollie a vráti URL platobnej brány.
 * Jednorazový dar = bežná platba. Pravidelný dar = zákazník + prvá platba
 * (sequenceType first); Mollie subscription založí až spracovanie po zaplatení.
 */
export async function startOnlineDonation(input: StartDonationInput): Promise<StartDonationResult> {
  if (!isMollieConfigured()) {
    return { success: false, error: 'Online platby zatiaľ nie sú dostupné. Použite prosím bankový prevod.' }
  }

  const { success: allowed } = await checkRateLimit('online-donation', { limit: 10, window: '1 h' })
  if (!allowed) {
    return { success: false, error: 'Príliš veľa pokusov o platbu. Skúste to prosím o chvíľu.' }
  }

  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
    return { success: false, error: `Minimálna suma daru je ${MIN_AMOUNT} €.` }
  }
  if (amount > MAX_AMOUNT) {
    return { success: false, error: `Maximálna suma online daru je ${MAX_AMOUNT.toLocaleString('sk-SK')} €.` }
  }

  const email = (input.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return { success: false, error: 'Zadajte platnú e-mailovú adresu.' }
  }
  const name = (input.name || '').trim().slice(0, 100)
  const interval: SubscriptionInterval = input.interval === 'year' ? 'year' : 'month'
  const projectId = input.projectId && UUID_RE.test(input.projectId) ? input.projectId : null

  // Prihlásený darca → priradíme dar k jeho profilu
  const user = await getSessionUser()
  const admin = serviceClient()
  let donorId: string | null = null
  let donorName = name
  if (user) {
    const { data: donor } = await admin
      .from('donors')
      .select('id, first_name, last_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (donor) {
      donorId = donor.id
      if (!donorName) donorName = `${donor.first_name} ${donor.last_name}`.trim()
    }
  }

  // Výzva na podporu: musí byť zverejnená, aktívna, pred termínom a povoľovať zvolený typ daru
  let projectName: string | null = null
  if (projectId) {
    const { data: project } = await admin
      .from('projects')
      .select('id, name, status, visible_on_web, end_date, allow_one_time, allow_recurring')
      .eq('id', projectId)
      .maybeSingle()
    const expired = !!project?.end_date && new Date(`${project.end_date}T23:59:59`) < new Date()
    if (!project || !project.visible_on_web || project.status !== 'active' || expired) {
      return { success: false, error: 'Táto výzva už nie je otvorená na darovanie.' }
    }
    if (input.recurring && project.allow_recurring === false) {
      return { success: false, error: 'Táto výzva neumožňuje pravidelný dar.' }
    }
    if (!input.recurring && project.allow_one_time === false) {
      return { success: false, error: 'Táto výzva prijíma len pravidelné dary.' }
    }
    projectName = String(project.name).slice(0, 120)
  }

  // Nahradenie existujúceho pravidelného daru – len pre prihláseného vlastníka
  // a len s rovnakým účelom (fond vs. konkrétna výzva), aby zámenou nezanikla iná podpora.
  let replaceSubscriptionId: string | null = null
  if (input.recurring && input.replaceSubscriptionId) {
    if (!user || !UUID_RE.test(input.replaceSubscriptionId)) {
      return { success: false, error: 'Zmena výšky pravidelného daru vyžaduje prihlásenie.' }
    }
    const { data: old } = await admin
      .from('online_subscriptions')
      .select('id, auth_user_id, donor_id, status, project_id')
      .eq('id', input.replaceSubscriptionId)
      .maybeSingle()
    const owns = !!old && (old.auth_user_id === user.id || (!!donorId && old.donor_id === donorId))
    if (!owns || !['active', 'past_due'].includes(old!.status)) {
      return { success: false, error: 'Pravidelný dar, ktorý chcete nahradiť, sa nenašiel.' }
    }
    if ((old!.project_id ?? null) !== projectId) {
      return { success: false, error: 'Nahradiť možno len pravidelný dar s rovnakým účelom.' }
    }
    replaceSubscriptionId = old!.id
  }

  const mollie = getMollieClient()
  const mode = getMollieMode()
  const ref = randomUUID() // id riadku online_payments – aj návratová referencia
  const redirectUrl = `${getBaseUrl()}/dakujeme?ref=${ref}`
  const webhookUrl = getWebhookUrl()
  const value = formatMollieAmount(amount)

  const baseMeta = {
    online_payment_id: ref,
    donor_id: donorId ?? undefined,
    auth_user_id: user?.id ?? undefined,
    email,
    donor_name: donorName || undefined,
    project_id: projectId ?? undefined,
  }

  try {
    let paymentId: string
    let checkoutUrl: string | null
    let kind: PaymentKind
    let description: string
    let customerId: string | null = null
    let subscriptionRowId: string | null = null
    let status: string

    if (!input.recurring) {
      kind = 'one_time'
      description = projectName ? `Dar – KROK – ${projectName}` : 'Dar pre Pastoračný fond KROK'
      const metadata: PaymentMetadata = { kind, ...baseMeta }
      const payment = await mollie.payments.create({
        amount: { currency: 'EUR', value },
        description,
        redirectUrl,
        ...(webhookUrl ? { webhookUrl } : {}),
        metadata,
      })
      paymentId = payment.id
      checkoutUrl = payment.getCheckoutUrl()
      status = String(payment.status)
    } else {
      kind = 'recurring_first'
      description = `${subscriptionDescription(interval, projectName)} (prvá platba)`

      // Existujúci Mollie zákazník toho istého darcu / e-mailu
      let query = admin
        .from('online_subscriptions')
        .select('mollie_customer_id')
        .eq('mode', mode)
        .order('created_at', { ascending: false })
        .limit(1)
      query = user ? query.or(`auth_user_id.eq.${user.id},email.ilike.${email}`) : query.ilike('email', email)
      const { data: prev } = await query.maybeSingle()
      customerId = prev?.mollie_customer_id ?? null

      if (!customerId) {
        const customer = await mollie.customers.create({
          name: donorName || email,
          email,
          metadata: { donor_id: donorId ?? '', auth_user_id: user?.id ?? '' },
        })
        customerId = customer.id
      }

      const { data: subRow, error: subErr } = await admin
        .from('online_subscriptions')
        .insert({
          mode,
          mollie_customer_id: customerId,
          donor_id: donorId,
          auth_user_id: user?.id ?? null,
          email,
          donor_name: donorName || null,
          amount,
          currency: 'EUR',
          interval,
          status: 'pending',
          project_id: projectId,
          metadata: replaceSubscriptionId ? { replace_subscription_id: replaceSubscriptionId } : {},
        })
        .select('id')
        .single()
      if (subErr) throw new Error(`online_subscriptions insert zlyhal: ${subErr.message}`)
      subscriptionRowId = subRow.id

      const metadata: PaymentMetadata = { kind, ...baseMeta, online_subscription_id: subRow.id, interval }
      const payment = await mollie.customerPayments.create({
        customerId,
        sequenceType: SequenceType.first,
        amount: { currency: 'EUR', value },
        description,
        redirectUrl,
        ...(webhookUrl ? { webhookUrl } : {}),
        metadata,
      })
      paymentId = payment.id
      checkoutUrl = payment.getCheckoutUrl()
      status = String(payment.status)
    }

    const { error: payErr } = await admin.from('online_payments').insert({
      id: ref,
      mode,
      mollie_payment_id: paymentId,
      mollie_customer_id: customerId,
      kind,
      status,
      amount,
      currency: 'EUR',
      description,
      donor_id: donorId,
      auth_user_id: user?.id ?? null,
      email,
      donor_name: donorName || null,
      project_id: projectId,
      online_subscription_id: subscriptionRowId,
      metadata: { kind, ...baseMeta, interval: input.recurring ? interval : undefined },
    })
    if (payErr) {
      // Platba u Mollie existuje – webhook ju dorovná (insert podľa metadata.online_payment_id)
      console.error('[mollie] online_payments insert zlyhal:', payErr.message)
    }

    if (!checkoutUrl) {
      return { success: false, error: 'Platobná brána nevrátila adresu platby. Skúste to znova.' }
    }
    return { success: true, url: checkoutUrl }
  } catch (err) {
    console.error('[mollie] startOnlineDonation zlyhal:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Platbu sa nepodarilo založiť. Skúste to prosím neskôr alebo použite bankový prevod.' }
  }
}

export type OnlinePaymentStatus =
  | { found: false }
  | {
      found: true
      status: string
      isPaid: boolean
      isFailed: boolean
      kind: PaymentKind
      amount: number
      interval: SubscriptionInterval | null
      projectName: string | null
      projectSlug: string | null
    }

/**
 * Stav platby pre stránku /dakujeme. Ak platba ešte nie je v koncovom stave
 * (alebo je zaplatená, no dar ešte nie je zapísaný – webhook nedorazil),
 * dosynchronizuje ju z Mollie. Vracia len stav a sumu, žiadne osobné údaje.
 */
export async function getOnlinePaymentStatus(ref: string): Promise<OnlinePaymentStatus> {
  if (!UUID_RE.test(ref)) return { found: false }

  const { success: allowed } = await checkRateLimit('online-payment-status', { limit: 60, window: '10 m' })
  if (!allowed) return { found: false }

  const admin = serviceClient()
  const { data: row } = await admin
    .from('online_payments')
    .select('mollie_payment_id, status, kind, amount, donation_id, online_subscriptions(interval), projects(name, slug)')
    .eq('id', ref)
    .maybeSingle()
  if (!row) return { found: false }

  let status: string = row.status
  let amount = Number(row.amount)
  let kind = row.kind as PaymentKind
  const isPaidNow = status === 'paid'

  if (!isTerminalStatus(status) || (isPaidNow && !row.donation_id)) {
    try {
      const result = await processMolliePayment(row.mollie_payment_id)
      status = result.status
      amount = result.amount
      kind = result.kind
    } catch (err) {
      console.error('[mollie] Synchronizácia stavu platby zlyhala:', err instanceof Error ? err.message : err)
    }
  }

  const subRel = row.online_subscriptions as { interval?: string } | { interval?: string }[] | null
  const subInterval = Array.isArray(subRel) ? subRel[0]?.interval : subRel?.interval
  type ProjectRel = { name?: string; slug?: string }
  const projRel = row.projects as ProjectRel | ProjectRel[] | null
  const proj = Array.isArray(projRel) ? projRel[0] : projRel

  return {
    found: true,
    status,
    isPaid: status === 'paid',
    isFailed: ['failed', 'canceled', 'expired'].includes(status),
    kind,
    amount,
    interval: subInterval === 'year' || subInterval === 'month' ? subInterval : null,
    projectName: proj?.name ?? null,
    projectSlug: proj?.slug ?? null,
  }
}

export interface MyOnlineSubscription {
  id: string
  amount: number
  interval: SubscriptionInterval
  status: string
  started_at: string | null
  next_payment_at: string | null
  created_at: string
  /** Účel: NULL = všeobecná podpora fondu, inak konkrétna výzva */
  project_id: string | null
  project_name: string | null
  project_slug: string | null
}

/** Pravidelné online dary prihláseného darcu (aktívne alebo s neúspešnou platbou). */
export async function getMyOnlineSubscriptions(): Promise<MyOnlineSubscription[]> {
  const user = await getSessionUser()
  if (!user) return []

  const admin = serviceClient()
  const { data: donor } = await admin.from('donors').select('id').eq('auth_user_id', user.id).maybeSingle()
  const ownership = donor ? `auth_user_id.eq.${user.id},donor_id.eq.${donor.id}` : `auth_user_id.eq.${user.id}`

  const { data, error } = await admin
    .from('online_subscriptions')
    .select('id, amount, interval, status, started_at, next_payment_at, created_at, project_id, projects(name, slug)')
    .or(ownership)
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[mollie] getMyOnlineSubscriptions:', error.message)
    return []
  }
  type ProjectRel = { name?: string; slug?: string }
  return (data ?? []).map((s) => {
    const rel = s.projects as ProjectRel | ProjectRel[] | null
    const proj = Array.isArray(rel) ? rel[0] : rel
    return {
      id: s.id,
      amount: Number(s.amount),
      interval: s.interval,
      status: s.status,
      started_at: s.started_at,
      next_payment_at: s.next_payment_at,
      created_at: s.created_at,
      project_id: s.project_id ?? null,
      project_name: proj?.name ?? null,
      project_slug: proj?.slug ?? null,
    } as MyOnlineSubscription
  })
}

/** Darca zruší svoj pravidelný online dar. Vlastníctvo sa overuje zo session. */
export async function cancelMyOnlineSubscription(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!UUID_RE.test(id)) return { success: false, error: 'Neplatný identifikátor.' }

  const admin = serviceClient()
  const { data: sub } = await admin
    .from('online_subscriptions')
    .select('id, mollie_customer_id, mollie_subscription_id, auth_user_id, donor_id, status')
    .eq('id', id)
    .maybeSingle()
  if (!sub) return { success: false, error: 'Pravidelný dar sa nenašiel.' }

  let owns = sub.auth_user_id === user.id
  if (!owns && sub.donor_id) {
    const { data: donor } = await admin.from('donors').select('id').eq('auth_user_id', user.id).maybeSingle()
    owns = !!donor && donor.id === sub.donor_id
  }
  if (!owns) return { success: false, error: 'Tento pravidelný dar vám nepatrí.' }
  if (sub.status === 'cancelled') return { success: true }

  const result = await cancelOnlineSubscription(sub)
  if (result.success) revalidatePath('/profil')
  return result
}
