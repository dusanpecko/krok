'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Variabilný symbol prihláseného darcu (pre platobné údaje v modáli na domovskej
 * stránke). Číta sa cookie klientom – RLS pustí len vlastný riadok darcu.
 * Vracia null pre neprihláseného alebo darcu bez prepojeného profilu.
 */
export async function getMyDonorVariableSymbol(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('donors')
    .select('variable_symbol')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return data?.variable_symbol ?? null
}

export interface PaymentQrResult {
  /** PNG data URL s PAY by square QR kódom */
  dataUrl: string
  /** VS prihláseného darcu (null = neprihlásený / bez profilu) */
  variableSymbol: string | null
  iban: string
  recurring: boolean
  specificSymbol: string | null
}

/**
 * PAY by square QR kód pre bankový prevod (jednorazový príkaz alebo mesačný
 * trvalý príkaz). VS sa doplní z profilu prihláseného darcu.
 */
export async function getPaymentQrCode(input: {
  amount: number
  recurring?: boolean
  /** ŠS výzvy – dar prevodom sa priradí k výzve */
  specificSymbol?: string | null
  note?: string
}): Promise<PaymentQrResult | null> {
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) return null

  const { buildPayBySquareQrDataUrl, KROK_IBAN } = await import('@/lib/bank/pay-by-square')
  const variableSymbol = await getMyDonorVariableSymbol()
  const recurring = !!input.recurring
  const specificSymbol = input.specificSymbol?.replace(/\D/g, '').slice(0, 10) || null
  const note = input.note ? input.note.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 60) : undefined

  try {
    const dataUrl = await buildPayBySquareQrDataUrl({ amount, recurring, variableSymbol, specificSymbol, note })
    return { dataUrl, variableSymbol, iban: KROK_IBAN, recurring, specificSymbol }
  } catch (err) {
    console.error('[pay-by-square] Generovanie QR zlyhalo:', err instanceof Error ? err.message : err)
    return null
  }
}

// Privileged admin client to fetch statistics safely, bypassing public RLS restrictions
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface PublicStats {
  donorsCount: number
  totalAmount: number
  projectsCount: number
}

/**
 * Fetches dynamic statistics for the current year
 */
export async function getPublicStats(): Promise<PublicStats> {
  try {
    // Agregácia prebieha v DB (RPC), aby nebola obmedzená 1000-riadkovým
    // limitom PostgREST. Vracia iba súhrnné čísla za aktuálny rok.
    const { data, error } = await supabaseAdmin.rpc('get_public_stats').single()

    if (error) {
      console.error('Error fetching public stats:', error.message)
      return { donorsCount: 0, totalAmount: 0, projectsCount: 0 }
    }

    const stats = data as { donors_count: number; total_amount: number; projects_count: number }
    return {
      donorsCount: stats.donors_count || 0,
      totalAmount: Math.round(Number(stats.total_amount || 0)),
      projectsCount: stats.projects_count || 0,
    }
  } catch (error) {
    console.error('Unexpected error fetching public stats:', error)
    return {
      donorsCount: 0,
      totalAmount: 0,
      projectsCount: 0
    }
  }
}

/** Zvýraznené výzvy na podporu pre domovskú stránku (featured, aktívne). */
export async function getFeaturedProjects() {
  const { getFeaturedPublicProjects } = await import('@/lib/projects/public')
  return getFeaturedPublicProjects(3)
}

/** Zverejnení sponzori pre pás „Podporili nás“ (aktívni, v období zverejnenia). Suma len ak je verejná. */
export async function getPublicSponsors(): Promise<import('@/lib/sponsors/types').PublicSponsor[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabaseAdmin
    .from('sponsors')
    .select('id, name, description, logo_url, logo_dark_url, website_url, amount, amount_public')
    .eq('is_active', true)
    .or(`publish_from.is.null,publish_from.lte.${today}`)
    .or(`publish_until.is.null,publish_until.gte.${today}`)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) {
    console.error('[sponzori] getPublicSponsors:', error.message)
    return []
  }
  return (data ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    description: (s.description as string | null) ?? null,
    logo_url: (s.logo_url as string | null) ?? null,
    logo_dark_url: (s.logo_dark_url as string | null) ?? null,
    website_url: (s.website_url as string | null) ?? null,
    amount: s.amount_public && s.amount != null ? Number(s.amount) : null,
  }))
}
