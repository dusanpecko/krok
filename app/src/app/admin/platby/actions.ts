'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { getMollieMode, isMollieConfigured } from '@/lib/mollie/client'
import { cancelOnlineSubscription, processMolliePayment } from '@/lib/mollie/process-payment'

/**
 * Admin – prehľad online platieb (Mollie). Oprávnenie `view_bank`
 * (peniaze patria pod bankový modul).
 */

function serviceClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export interface MollieStatus {
  configured: boolean
  mode: 'test' | 'live'
}

export async function getMollieStatus(): Promise<MollieStatus> {
  await requirePermission('view_bank')
  return { configured: isMollieConfigured(), mode: getMollieMode() }
}

export interface AdminOnlinePayment {
  id: string
  mode: string
  mollie_payment_id: string
  kind: string
  status: string
  amount: number
  method: string | null
  email: string | null
  donor_name: string | null
  donor_id: string | null
  donation_id: string | null
  paid_at: string | null
  created_at: string
  donors: { first_name: string; last_name: string; variable_symbol: string | null } | null
  /** Predplatné, ku ktorému platba patrí (pri recurring_first / recurring). */
  subscription: {
    status: string
    mollie_subscription_id: string | null
    metadata: { last_activation_error?: string; last_activation_at?: string } | null
  } | null
}

export async function getOnlinePaymentsAdmin(limit = 200): Promise<AdminOnlinePayment[]> {
  await requirePermission('view_bank')
  const { data, error } = await serviceClient()
    .from('online_payments')
    .select(
      'id, mode, mollie_payment_id, kind, status, amount, method, email, donor_name, donor_id, donation_id, paid_at, created_at, donors(first_name, last_name, variable_symbol), online_subscriptions(status, mollie_subscription_id, metadata)'
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[admin/platby] getOnlinePaymentsAdmin:', error.message)
    return []
  }
  return (data ?? []).map((p) => {
    const sub = Array.isArray(p.online_subscriptions) ? (p.online_subscriptions[0] ?? null) : p.online_subscriptions
    return {
      ...p,
      amount: Number(p.amount),
      donors: Array.isArray(p.donors) ? (p.donors[0] ?? null) : p.donors,
      subscription: sub,
    }
  }) as AdminOnlinePayment[]
}

export interface AdminOnlineSubscription {
  id: string
  mode: string
  mollie_subscription_id: string | null
  status: string
  amount: number
  interval: string
  email: string | null
  donor_name: string | null
  donor_id: string | null
  started_at: string | null
  next_payment_at: string | null
  cancelled_at: string | null
  created_at: string
  donors: { first_name: string; last_name: string; variable_symbol: string | null } | null
}

export async function getOnlineSubscriptionsAdmin(): Promise<AdminOnlineSubscription[]> {
  await requirePermission('view_bank')
  const { data, error } = await serviceClient()
    .from('online_subscriptions')
    .select(
      'id, mode, mollie_subscription_id, status, amount, interval, email, donor_name, donor_id, started_at, next_payment_at, cancelled_at, created_at, donors(first_name, last_name, variable_symbol)'
    )
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) {
    console.error('[admin/platby] getOnlineSubscriptionsAdmin:', error.message)
    return []
  }
  return (data ?? []).map((s) => ({
    ...s,
    amount: Number(s.amount),
    donors: Array.isArray(s.donors) ? (s.donors[0] ?? null) : s.donors,
  })) as AdminOnlineSubscription[]
}

/** Admin zruší pravidelný dar (u Mollie aj v DB). */
export async function adminCancelOnlineSubscription(id: string): Promise<{ success: boolean; error?: string }> {
  await requirePermission('view_bank')
  const { data: sub } = await serviceClient()
    .from('online_subscriptions')
    .select('id, mollie_customer_id, mollie_subscription_id, status')
    .eq('id', id)
    .maybeSingle()
  if (!sub) return { success: false, error: 'Pravidelný dar sa nenašiel.' }
  if (sub.status === 'cancelled') return { success: true }
  const result = await cancelOnlineSubscription(sub)
  if (result.success) {
    revalidatePath('/admin/platby')
    revalidatePath('/profil')
  }
  return result
}

/** Ručná synchronizácia platby z Mollie (ak webhook nedorazil). */
export async function adminSyncOnlinePayment(molliePaymentId: string): Promise<{ success: boolean; error?: string; status?: string }> {
  await requirePermission('view_bank')
  if (!/^tr_[A-Za-z0-9]+$/.test(molliePaymentId)) return { success: false, error: 'Neplatné ID platby.' }
  try {
    const result = await processMolliePayment(molliePaymentId)
    revalidatePath('/admin/platby')
    return { success: true, status: result.status }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Synchronizácia zlyhala.' }
  }
}
