import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { MOLLIE_PAYOUT_CATEGORY } from './mollie-payout'
import { ANONYMOUS_DONOR_LEGACY_ID, normalizeVs } from './legacy-project-vs'

/**
 * Po pridelení VS darcovi (nový darca / zmena VS v admine) pripojí jeho doterajšie
 * bankové platby s týmto VS, ktoré sú nespárované alebo na anonymnom darcovi
 * („DARY Donátor“, „Anonymný darca“). Platby iných darcov sa nemenia; výzva daru ostáva.
 *
 * Serverový modul (service role) – volať len z akcií s overeným oprávnením.
 */

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** „DARY Donátor“ zo starého systému */
const LEGACY_ANONYMOUS_DONOR_LEGACY_ID = '11770000'

export async function claimBankPaymentsByVs(donorId: string, variableSymbol: string | null | undefined): Promise<number> {
  const vs = normalizeVs(variableSymbol)
  if (!vs) return 0

  const { data: anon } = await supabaseAdmin
    .from('donors')
    .select('id')
    .in('legacy_id', [ANONYMOUS_DONOR_LEGACY_ID, LEGACY_ANONYMOUS_DONOR_LEGACY_ID])
  const anonIds = new Set((anon ?? []).map((d) => d.id as string))

  // VS môže byť v banke uložený s úvodnými nulami
  const { data: txs, error } = await supabaseAdmin
    .from('bank_transactions')
    .select('id, amount, booking_date, donor_id, matched, variable_symbol')
    .eq('direction', 'credit')
    .neq('category', MOLLIE_PAYOUT_CATEGORY)
    .like('variable_symbol', `%${vs}`)
  if (error) {
    console.error('[bank] claimBankPaymentsByVs:', error.message)
    return 0
  }

  const claim = (txs ?? []).filter(
    (t) => normalizeVs(t.variable_symbol) === vs && (!t.matched || !t.donor_id || anonIds.has(t.donor_id))
  )
  if (claim.length === 0) return 0

  const ids = claim.map((t) => t.id)
  const { error: upErr } = await supabaseAdmin
    .from('bank_transactions')
    .update({ donor_id: donorId, matched: true, category: 'donation' })
    .in('id', ids)
  if (upErr) {
    console.error('[bank] claimBankPaymentsByVs update:', upErr.message)
    return 0
  }

  // Existujúci dar (napr. na anonymnom darcovi) len prepíše darcu – výzva ostáva
  const { error: donErr } = await supabaseAdmin.from('donations').upsert(
    claim.map((t) => ({
      bank_transaction_id: t.id,
      donor_id: donorId,
      amount: t.amount,
      donation_date: t.booking_date,
      payment_method: 'bank_transfer',
      matched: true,
    })),
    { onConflict: 'bank_transaction_id' }
  )
  if (donErr) console.error('[bank] claimBankPaymentsByVs donations:', donErr.message)

  return claim.length
}
