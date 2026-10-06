import { createClient } from '@supabase/supabase-js'
import { DEFAULT_BOX_TITLE, normalizeIban, type ParishBoxFees, type ParishBoxSettings, type PublicParishBox } from './types'

/** E-zvonček farnosti – načítanie nastavení (service role). Serverový modul. */

export function boxDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function getBoxDefaults(): Promise<ParishBoxFees> {
  const { data } = await boxDb().from('parish_box_defaults').select('mollie_fee_pct, fund_fee_pct').eq('id', 1).maybeSingle()
  return { mollie_fee_pct: Number(data?.mollie_fee_pct ?? 2), fund_fee_pct: Number(data?.fund_fee_pct ?? 0) }
}

/** Nastavenie farnosti; ak ešte neexistuje, vráti predvolené poplatky diecézy (vypnuté). */
export async function getBoxSettings(parishId: string): Promise<ParishBoxSettings> {
  const { data } = await boxDb().from('parish_box_settings').select('*').eq('parish_id', parishId).maybeSingle()
  if (data) {
    return { ...data, mollie_fee_pct: Number(data.mollie_fee_pct), fund_fee_pct: Number(data.fund_fee_pct) } as ParishBoxSettings
  }
  const defaults = await getBoxDefaults()
  return { parish_id: parishId, enabled: false, title: null, description: null, enabled_at: null, updated_at: null, ...defaults }
}

/**
 * E-zvonček je dostupný, ak ho diecéza zapla, farnosť je aktívna a má platný IBAN
 * (bez IBAN-u by sa vyzbierané peniaze nemali kam poslať).
 */
export async function getActiveBox(parishId: string): Promise<(PublicParishBox & { parishName: string; parishSlug: string | null }) | null> {
  const db = boxDb()
  const [{ data: s }, { data: p }] = await Promise.all([
    db.from('parish_box_settings').select('enabled, title, description').eq('parish_id', parishId).maybeSingle(),
    db.from('parishes').select('name, slug, iban, is_active').eq('id', parishId).maybeSingle(),
  ])
  if (!s?.enabled || !p?.is_active || !normalizeIban(p.iban)) return null
  return { title: s.title?.trim() || DEFAULT_BOX_TITLE, description: s.description?.trim() || null, parishName: p.name, parishSlug: p.slug }
}
