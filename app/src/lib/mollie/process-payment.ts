import { createClient } from '@supabase/supabase-js'
import type { Payment } from '@mollie/api-client'
import { formatMollieAmount, getMollieClient, getMollieMode, getWebhookUrl } from './client'

/**
 * Spracovanie Mollie platby – JEDINÉ miesto, ktoré mení stav v DB.
 *
 * Volá sa z webhooku (/api/mollie/webhook) aj pri návrate darcu na /dakujeme,
 * preto musí byť IDEMPOTENTNÉ: opakované volanie s tou istou platbou nesmie
 * vytvoriť druhý dar ani druhé Mollie predplatné.
 *
 *  - stav platby sa vždy sťahuje z Mollie API (telu webhooku sa nedôveruje),
 *  - dar do `donations` sa vkladá len raz (UNIQUE donations.online_payment_id),
 *  - Mollie subscription sa zakladá cez DB zámok (status pending → activating).
 */

export type PaymentKind = 'one_time' | 'recurring_first' | 'recurring'
export type SubscriptionInterval = 'month' | 'year'

/** Metadata, ktoré posielame do Mollie pri zakladaní platby / predplatného. */
export interface PaymentMetadata {
  kind: PaymentKind
  online_payment_id?: string
  online_subscription_id?: string
  donor_id?: string
  auth_user_id?: string
  email?: string
  donor_name?: string
  project_id?: string
  interval?: SubscriptionInterval
}

export interface ProcessResult {
  status: string
  isPaid: boolean
  kind: PaymentKind
  amount: number
  paymentRowId: string | null
  subscriptionRowId: string | null
}

interface PaymentRow {
  id: string
  donor_id: string | null
  auth_user_id: string | null
  email: string | null
  donor_name: string | null
  project_id: string | null
  online_subscription_id: string | null
  donation_id: string | null
}

export interface SubscriptionRow {
  id: string
  mollie_customer_id: string
  mollie_subscription_id: string | null
  donor_id: string | null
  auth_user_id: string | null
  email: string | null
  donor_name: string | null
  project_id: string | null
  amount: number
  currency: string
  interval: SubscriptionInterval
  status: string
  metadata: { replace_subscription_id?: string; last_activation_error?: string; last_activation_at?: string } | null
}

const PAID = new Set(['paid'])
const FAILED = new Set(['failed', 'canceled', 'expired'])

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export function isTerminalStatus(status: string): boolean {
  return PAID.has(status) || FAILED.has(status)
}

function addInterval(date: Date, interval: SubscriptionInterval): Date {
  const d = new Date(date)
  if (interval === 'year') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function intervalLabel(interval: SubscriptionInterval): string {
  return interval === 'year' ? 'ročný' : 'mesačný'
}

export function subscriptionDescription(interval: SubscriptionInterval, projectName?: string | null): string {
  const base = `Pravidelný ${intervalLabel(interval)} dar – Pastoračný fond KROK`
  return projectName ? `${base} – ${projectName.slice(0, 100)}` : base
}

/**
 * Nájde alebo založí darcu, ku ktorému sa dar priradí.
 * Poradie: donor_id → auth_user_id → e-mail → nový darca.
 * Nový darca dostane variabilný symbol rovnako ako pri registrácii (max + 1),
 * aby sa dal neskôr prepojiť s účtom (getCurrentDonor páruje podľa e-mailu).
 */
async function ensureDonor(
  admin: ReturnType<typeof serviceClient>,
  ident: { donor_id?: string | null; auth_user_id?: string | null; email?: string | null; donor_name?: string | null }
): Promise<string | null> {
  if (ident.donor_id) {
    const { data } = await admin.from('donors').select('id').eq('id', ident.donor_id).maybeSingle()
    if (data) return data.id
  }
  if (ident.auth_user_id) {
    const { data } = await admin.from('donors').select('id').eq('auth_user_id', ident.auth_user_id).maybeSingle()
    if (data) return data.id
  }
  const email = ident.email?.trim().toLowerCase() || null
  if (email) {
    const { data } = await admin
      .from('donors')
      .select('id')
      .ilike('email', email)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (data) return data.id
  }

  // Nový darca (bez účtu) – meno z formulára, inak „Darca online"
  const nameParts = (ident.donor_name || '').trim().split(/\s+/).filter(Boolean)
  const firstName = nameParts[0] || 'Darca'
  const lastName = nameParts.slice(1).join(' ') || (nameParts[0] ? '' : 'online') || 'online'

  const { data: vsData } = await admin.from('donors').select('variable_symbol').not('variable_symbol', 'is', null)
  const maxVS = (vsData || []).reduce((max: number, d: { variable_symbol: string | null }) => {
    const num = parseInt(d.variable_symbol || '0', 10)
    return num > max ? num : max
  }, 11771451)

  const { data: created, error } = await admin
    .from('donors')
    .insert({
      auth_user_id: ident.auth_user_id || null,
      email,
      first_name: firstName,
      last_name: lastName,
      variable_symbol: String(maxVS + 1),
      donor_type: 'individual',
      status: 'active',
      notes: 'Vytvorený automaticky z online platby (Mollie).',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[mollie] Nepodarilo sa založiť darcu pre online platbu:', error.message)
    return null
  }
  return created.id
}

async function loadSubscription(
  admin: ReturnType<typeof serviceClient>,
  ids: { rowId?: string | null; mollieSubscriptionId?: string | null }
): Promise<SubscriptionRow | null> {
  if (ids.rowId) {
    const { data } = await admin.from('online_subscriptions').select('*').eq('id', ids.rowId).maybeSingle()
    if (data) return data as SubscriptionRow
  }
  if (ids.mollieSubscriptionId) {
    const { data } = await admin
      .from('online_subscriptions')
      .select('*')
      .eq('mollie_subscription_id', ids.mollieSubscriptionId)
      .maybeSingle()
    if (data) return data as SubscriptionRow
  }
  return null
}

/**
 * Po zaplatení prvej platby založí Mollie subscription. Zámok cez DB:
 * len volanie, ktoré prepne pending → activating, predplatné skutočne vytvorí.
 */
async function activateSubscription(
  admin: ReturnType<typeof serviceClient>,
  sub: SubscriptionRow,
  payment: Payment,
  donorId: string | null
): Promise<void> {
  if (sub.mollie_subscription_id || sub.status !== 'pending') return

  const { data: locked } = await admin
    .from('online_subscriptions')
    .update({ status: 'activating' })
    .eq('id', sub.id)
    .eq('status', 'pending')
    .is('mollie_subscription_id', null)
    .select('id')
    .maybeSingle()
  if (!locked) return // iné volanie už predplatné zakladá

  const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date()
  const startDate = addInterval(paidAt, sub.interval)

  try {
    const mollie = getMollieClient()

    // Názov výzvy do popisu predplatného (darca ho vidí na výpise z karty)
    let projectName: string | null = null
    if (sub.project_id) {
      const { data: project } = await admin.from('projects').select('name').eq('id', sub.project_id).maybeSingle()
      projectName = project?.name ?? null
    }

    const metadata: PaymentMetadata = {
      kind: 'recurring',
      online_subscription_id: sub.id,
      donor_id: donorId || sub.donor_id || undefined,
      auth_user_id: sub.auth_user_id || undefined,
      email: sub.email || undefined,
      donor_name: sub.donor_name || undefined,
      project_id: sub.project_id || undefined,
      interval: sub.interval,
    }
    const created = await mollie.customerSubscriptions.create({
      customerId: sub.mollie_customer_id,
      amount: { currency: sub.currency || 'EUR', value: formatMollieAmount(Number(sub.amount)) },
      interval: sub.interval === 'year' ? '12 months' : '1 month',
      startDate: toDateString(startDate),
      // Mollie vyžaduje JEDINEČNÝ popis medzi predplatnými jedného zákazníka
      // (422 pri zmene výšky alebo druhom pravidelnom dare) → suma + skrátené id.
      description: `${subscriptionDescription(sub.interval, projectName)} – ${formatMollieAmount(Number(sub.amount))} € (${sub.id.slice(0, 8)})`,
      ...(payment.mandateId ? { mandateId: payment.mandateId } : {}),
      ...(getWebhookUrl() ? { webhookUrl: getWebhookUrl() } : {}),
      metadata,
    })

    const { error } = await admin
      .from('online_subscriptions')
      .update({
        mollie_subscription_id: created.id,
        status: 'active',
        started_at: paidAt.toISOString(),
        next_payment_at: toDateString(startDate),
        donor_id: donorId || sub.donor_id,
      })
      .eq('id', sub.id)
    if (error) {
      console.error(`[mollie] Predplatné ${created.id} beží u Mollie, ale zápis do DB zlyhal:`, error.message)
    } else {
      console.log(`[mollie] Predplatné ${created.id} založené (${sub.interval}, ${sub.amount} €), prvá opakovaná platba ${toDateString(startDate)}`)
    }

    // Zmena výšky: darca zvolil „nahradiť" → starý pravidelný dar zrušíme až
    // TERAZ, po úspešnej platbe nového (pri zlyhaní by ostal bez oboch).
    await replacePreviousSubscription(admin, sub)
  } catch (err) {
    // Zámok uvoľníme – ďalší webhook / návrat / admin Sync to skúsi znova.
    // Dôvod uložíme k predplatnému, aby ho admin videl v /admin/platby.
    const message = err instanceof Error ? err.message : String(err)
    await admin
      .from('online_subscriptions')
      .update({
        status: 'pending',
        metadata: { ...(sub.metadata ?? {}), last_activation_error: message, last_activation_at: new Date().toISOString() },
      })
      .eq('id', sub.id)
    console.error('[mollie] Založenie Mollie predplatného zlyhalo:', message)
  }
}

/**
 * Ak nové predplatné nahrádza staré (metadata.replace_subscription_id), staré
 * zruší – len ak patrí tomu istému darcovi/účtu a ešte beží.
 */
async function replacePreviousSubscription(
  admin: ReturnType<typeof serviceClient>,
  sub: SubscriptionRow
): Promise<void> {
  const replaceId = sub.metadata?.replace_subscription_id
  if (!replaceId || replaceId === sub.id) return

  const { data: old } = await admin
    .from('online_subscriptions')
    .select('id, mollie_customer_id, mollie_subscription_id, status, donor_id, auth_user_id')
    .eq('id', replaceId)
    .maybeSingle()
  if (!old || !['active', 'past_due'].includes(old.status)) return

  const sameOwner =
    (sub.auth_user_id && old.auth_user_id === sub.auth_user_id) ||
    (sub.donor_id && old.donor_id === sub.donor_id)
  if (!sameOwner) {
    console.warn(`[mollie] Nahradenie predplatného ${replaceId} odmietnuté – iný vlastník`)
    return
  }

  const res = await cancelOnlineSubscription(old)
  if (res.success) {
    console.log(`[mollie] Staré predplatné ${old.mollie_subscription_id ?? old.id} zrušené (nahradené ${sub.id})`)
  }
}

/**
 * Stiahne platbu z Mollie a premietne ju do DB (online_payments, donations,
 * online_subscriptions). Idempotentné.
 */
export async function processMolliePayment(molliePaymentId: string): Promise<ProcessResult> {
  const mollie = getMollieClient()
  const admin = serviceClient()
  const mode = getMollieMode()

  const payment = await mollie.payments.get(molliePaymentId)
  const status = String(payment.status)
  const isPaid = PAID.has(status)
  const amount = parseFloat(payment.amount.value)
  const meta = ((payment.metadata as Partial<PaymentMetadata> | null) ?? {}) as Partial<PaymentMetadata>

  // Existujúci riadok platby + predplatné, ku ktorému patrí
  const { data: existingRaw } = await admin
    .from('online_payments')
    .select('id, donor_id, auth_user_id, email, donor_name, project_id, online_subscription_id, donation_id')
    .eq('mollie_payment_id', payment.id)
    .maybeSingle()
  const existing = (existingRaw as PaymentRow | null) ?? null

  const sub = await loadSubscription(admin, {
    rowId: meta.online_subscription_id ?? existing?.online_subscription_id ?? null,
    mollieSubscriptionId: payment.subscriptionId ?? null,
  })

  const kind: PaymentKind =
    meta.kind ??
    (payment.subscriptionId ? 'recurring' : String(payment.sequenceType) === 'first' ? 'recurring_first' : 'one_time')

  const identity = {
    donor_id: existing?.donor_id ?? meta.donor_id ?? sub?.donor_id ?? null,
    auth_user_id: existing?.auth_user_id ?? meta.auth_user_id ?? sub?.auth_user_id ?? null,
    email: existing?.email ?? meta.email ?? sub?.email ?? null,
    donor_name: existing?.donor_name ?? meta.donor_name ?? sub?.donor_name ?? null,
    project_id: existing?.project_id ?? meta.project_id ?? sub?.project_id ?? null,
  }

  const paidAtIso = payment.paidAt ? new Date(payment.paidAt).toISOString() : isPaid ? new Date().toISOString() : null

  const rowValues = {
    mollie_payment_id: payment.id,
    mode,
    kind,
    status,
    amount,
    currency: payment.amount.currency,
    method: payment.method ? String(payment.method) : null,
    description: payment.description,
    mollie_customer_id: payment.customerId ?? sub?.mollie_customer_id ?? null,
    mollie_subscription_id: payment.subscriptionId ?? null,
    online_subscription_id: sub?.id ?? existing?.online_subscription_id ?? null,
    paid_at: paidAtIso,
    metadata: meta,
    ...identity,
  }

  let paymentRow: PaymentRow
  if (existing) {
    const { data, error } = await admin
      .from('online_payments')
      .update(rowValues)
      .eq('id', existing.id)
      .select('id, donor_id, auth_user_id, email, donor_name, project_id, online_subscription_id, donation_id')
      .single()
    if (error) throw new Error(`online_payments update zlyhal: ${error.message}`)
    paymentRow = data as PaymentRow
  } else {
    const { data, error } = await admin
      .from('online_payments')
      .insert({ ...rowValues, ...(meta.online_payment_id ? { id: meta.online_payment_id } : {}) })
      .select('id, donor_id, auth_user_id, email, donor_name, project_id, online_subscription_id, donation_id')
      .single()
    if (error) throw new Error(`online_payments insert zlyhal: ${error.message}`)
    paymentRow = data as PaymentRow
  }

  let donorId: string | null = paymentRow.donor_id

  // === ZAPLATENÉ → dar do donations (raz) ===
  if (isPaid && !paymentRow.donation_id) {
    donorId = await ensureDonor(admin, identity)
    if (donorId) {
      const donationDate = (paidAtIso ?? new Date().toISOString()).slice(0, 10)
      const { data: donation, error } = await admin
        .from('donations')
        .insert({
          donor_id: donorId,
          project_id: identity.project_id,
          amount,
          donation_date: donationDate,
          payment_method: 'card_online',
          matched: true,
          matched_at: new Date().toISOString(),
          online_payment_id: paymentRow.id,
          notes: `Online platba Mollie ${payment.id}${kind === 'recurring' ? ' (pravidelný dar)' : ''}`,
        })
        .select('id')
        .single()

      if (error) {
        // 23505 = UNIQUE(online_payment_id): súbežné volanie dar už vložilo
        if (error.code === '23505') {
          const { data: dup } = await admin
            .from('donations')
            .select('id')
            .eq('online_payment_id', paymentRow.id)
            .maybeSingle()
          if (dup) {
            await admin.from('online_payments').update({ donation_id: dup.id, donor_id: donorId }).eq('id', paymentRow.id)
          }
        } else {
          console.error('[mollie] Vloženie daru zlyhalo:', error.message)
        }
      } else {
        await admin
          .from('online_payments')
          .update({ donation_id: donation.id, donor_id: donorId })
          .eq('id', paymentRow.id)
        console.log(`[mollie] Dar ${amount} € zaznamenaný (platba ${payment.id}, darca ${donorId})`)
      }
    }
  }

  // === PREDPLATNÉ ===
  if (sub) {
    if (kind === 'recurring_first') {
      if (isPaid) {
        await activateSubscription(admin, sub, payment, donorId)
      } else if (FAILED.has(status) && sub.status === 'pending') {
        await admin
          .from('online_subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', sub.id)
      }
    } else if (kind === 'recurring') {
      if (isPaid) {
        const paidAt = paidAtIso ? new Date(paidAtIso) : new Date()
        const update: Record<string, unknown> = {
          next_payment_at: toDateString(addInterval(paidAt, sub.interval)),
        }
        // Zrušené predplatné neoživujeme – Mollie môže ešte doručiť poslednú platbu
        if (sub.status !== 'cancelled') update.status = 'active'
        if (!sub.donor_id && donorId) update.donor_id = donorId
        await admin.from('online_subscriptions').update(update).eq('id', sub.id)
      } else if (FAILED.has(status) && sub.status === 'active') {
        await admin.from('online_subscriptions').update({ status: 'past_due' }).eq('id', sub.id)
      }
    }
  }

  return {
    status,
    isPaid,
    kind,
    amount,
    paymentRowId: paymentRow.id,
    subscriptionRowId: sub?.id ?? null,
  }
}

// Mollie stavové kódy „predplatné už neexistuje / je zrušené" – nie je to chyba.
const MOLLIE_ALREADY_GONE = new Set([404, 410, 422])

/**
 * Zruší pravidelný dar u Mollie aj v DB. Idempotentné – už zrušené predplatné
 * u Mollie nezhodí volanie.
 */
export async function cancelOnlineSubscription(sub: {
  id: string
  mollie_customer_id: string
  mollie_subscription_id: string | null
}): Promise<{ success: boolean; error?: string }> {
  const admin = serviceClient()

  if (sub.mollie_subscription_id) {
    try {
      await getMollieClient().customerSubscriptions.cancel(sub.mollie_subscription_id, {
        customerId: sub.mollie_customer_id,
      })
    } catch (err) {
      const code = (err as { statusCode?: number })?.statusCode
      if (!code || !MOLLIE_ALREADY_GONE.has(code)) {
        console.error('[mollie] Zrušenie predplatného zlyhalo:', err instanceof Error ? err.message : err)
        return { success: false, error: 'Predplatné sa nepodarilo zrušiť u poskytovateľa platieb.' }
      }
    }
  }

  const { error } = await admin
    .from('online_subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', sub.id)
  if (error) return { success: false, error: 'Zrušenie sa nepodarilo uložiť.' }
  return { success: true }
}
