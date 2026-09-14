/**
 * Rozpoznanie výplaty (payout) z Mollie v bankových transakciách.
 *
 * Mollie posiela vyzbierané online dary na účet hromadne – jedna kreditná
 * transakcia za viac darov. Tie dary už máme v `donations` (cez
 * `online_payments`), preto sa payout nesmie párovať na darcu ani vkladať ako
 * dar. Označí sa kategóriou `mollie_payout` a párovanie ho ignoruje.
 *
 * Rozpoznanie: názov protiúčtu / správa pre prijímateľa obsahuje „Mollie“
 * (výplaty chodia od Mollie Payments B.V. / Stichting Mollie Payments), alebo
 * IBAN protiúčtu je v zozname MOLLIE_PAYOUT_IBANS (env, čiarkou oddelené) –
 * doplniť po prvej reálnej výplate, ak by názov chýbal.
 */

export const MOLLIE_PAYOUT_CATEGORY = 'mollie_payout'

const MOLLIE_RE = /\bmollie\b/i

function payoutIbans(): Set<string> {
  return new Set(
    (process.env.MOLLIE_PAYOUT_IBANS || '')
      .split(',')
      .map((s) => s.replace(/\s+/g, '').toUpperCase())
      .filter(Boolean)
  )
}

export function isMolliePayout(tx: {
  direction?: string | null
  counterparty_name?: string | null
  counterparty_iban?: string | null
  remittance_info?: string | null
}): boolean {
  if (tx.direction && tx.direction !== 'credit') return false
  if (tx.counterparty_name && MOLLIE_RE.test(tx.counterparty_name)) return true
  if (tx.remittance_info && MOLLIE_RE.test(tx.remittance_info)) return true
  const iban = tx.counterparty_iban?.replace(/\s+/g, '').toUpperCase()
  if (iban && payoutIbans().has(iban)) return true
  return false
}
