'use server'

import * as ExcelJS from 'exceljs'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { KROK_ORG } from '@/lib/legal'
import { logParishChange } from '@/lib/parishes/writes'
import { boxDb, getBoxDefaults, getBoxSettings } from '@/lib/parish-box/server'
import { buildSepaXml } from '@/lib/parish-box/sepa'
import { bratislavaMidnightIso, computePayout, isValidMonth, monthLabel, monthRange, normalizeIban, type ParishBoxFees, type ParishBoxSettings } from '@/lib/parish-box/types'

/**
 * E-zvonček farností – diecézna strana (návrh § 12, O31–O38): zapnutie a poplatky farnosti,
 * predvolené poplatky diecézy a mesačné výplaty farnostiam (SEPA XML + Excel).
 */

const PERM = 'manage_parishes'
const FUND_BIC = 'FIOZSKBAXXX'
type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Neznáma chyba'
}

function validFees(f: ParishBoxFees): string | null {
  for (const v of [f.mollie_fee_pct, f.fund_fee_pct]) {
    if (!Number.isFinite(v) || v < 0 || v > 100) return 'Poplatok musí byť od 0 do 100 %.'
  }
  if (f.mollie_fee_pct + f.fund_fee_pct >= 100) return 'Poplatky spolu musia byť menej ako 100 %.'
  return null
}

// ------------------------------------------------------------
// Nastavenie farnosti (detail farnosti → záložka E-zvonček)
// ------------------------------------------------------------

export interface ParishBoxAdminView {
  settings: ParishBoxSettings
  defaults: ParishBoxFees
  iban: string | null
  ibanValid: boolean
  totals: { count: number; gross: number; unpaidCount: number; unpaidGross: number; activeRecurring: number }
  payouts: { id: string; period_month: string; gross_amount: number; net_amount: number; status: string; sent_at: string | null }[]
}

export async function getParishBoxAdmin(parishId: string): Promise<ParishBoxAdminView> {
  await requirePermission(PERM)
  const db = boxDb()
  const [settings, defaults, { data: parish }, { data: gifts }, { data: payouts }, { count: activeRecurring }] = await Promise.all([
    getBoxSettings(parishId),
    getBoxDefaults(),
    db.from('parishes').select('iban').eq('id', parishId).maybeSingle(),
    db.from('parish_box_gifts').select('amount, payout_id').eq('parish_id', parishId),
    db.from('parish_payouts').select('id, period_month, gross_amount, net_amount, status, sent_at').eq('parish_id', parishId).order('period_month', { ascending: false }).limit(24),
    db.from('online_subscriptions').select('id', { count: 'exact', head: true }).eq('purpose', 'parish_box').eq('box_parish_id', parishId).in('status', ['active', 'past_due']),
  ])
  const all = gifts ?? []
  const unpaid = all.filter((g) => !g.payout_id)
  const sum = (rows: { amount: number | string }[]) => Math.round(rows.reduce((a, g) => a + Number(g.amount) * 100, 0)) / 100
  return {
    settings,
    defaults,
    iban: parish?.iban ?? null,
    ibanValid: !!normalizeIban(parish?.iban),
    totals: { count: all.length, gross: sum(all), unpaidCount: unpaid.length, unpaidGross: sum(unpaid), activeRecurring: activeRecurring ?? 0 },
    payouts: (payouts ?? []).map((p) => ({ ...p, gross_amount: Number(p.gross_amount), net_amount: Number(p.net_amount) })),
  }
}

export async function saveParishBox(
  parishId: string,
  input: { enabled: boolean; mollie_fee_pct: number; fund_fee_pct: number; title: string; description: string }
): Promise<Result> {
  try {
    const { user } = await requirePermission(PERM)
    const fees = { mollie_fee_pct: Number(input.mollie_fee_pct), fund_fee_pct: Number(input.fund_fee_pct) }
    const invalid = validFees(fees)
    if (invalid) return { success: false, error: invalid }

    const db = boxDb()
    if (input.enabled) {
      const { data: parish } = await db.from('parishes').select('iban, is_active').eq('id', parishId).maybeSingle()
      if (!parish?.is_active) return { success: false, error: 'Farnosť nie je aktívna.' }
      if (!normalizeIban(parish.iban)) return { success: false, error: 'Farnosť nemá platný IBAN – doplňte ho v Základných údajoch, inak nie je kam posielať vyzbierané peniaze.' }
    }

    const before = await getBoxSettings(parishId)
    const row = {
      parish_id: parishId,
      enabled: !!input.enabled,
      ...fees,
      title: input.title.trim().slice(0, 120) || null,
      description: input.description.trim().slice(0, 600) || null,
      enabled_at: input.enabled ? before.enabled_at ?? new Date().toISOString() : before.enabled_at,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }
    const { error } = await db.from('parish_box_settings').upsert(row)
    if (error) return { success: false, error: 'Nastavenie sa nepodarilo uložiť.' }

    await logParishChange(db, parishId, user.id, 'parish_box', 'update', {
      enabled: [before.enabled, row.enabled],
      mollie_fee_pct: [before.mollie_fee_pct, row.mollie_fee_pct],
      fund_fee_pct: [before.fund_fee_pct, row.fund_fee_pct],
    })
    revalidatePath(`/admin/farnosti/${parishId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

// ------------------------------------------------------------
// Predvolené poplatky diecézy
// ------------------------------------------------------------

export async function saveBoxDefaults(fees: ParishBoxFees): Promise<Result> {
  try {
    const { user } = await requirePermission(PERM)
    const clean = { mollie_fee_pct: Number(fees.mollie_fee_pct), fund_fee_pct: Number(fees.fund_fee_pct) }
    const invalid = validFees(clean)
    if (invalid) return { success: false, error: invalid }
    const { error } = await boxDb().from('parish_box_defaults').upsert({ id: 1, ...clean, updated_at: new Date().toISOString(), updated_by: user.id })
    if (error) return { success: false, error: 'Predvolené poplatky sa nepodarilo uložiť.' }
    revalidatePath('/admin/farnosti/e-zvoncek')
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

// ------------------------------------------------------------
// Mesačné vyúčtovanie
// ------------------------------------------------------------

export interface PayoutRow {
  parish_id: string
  parish_name: string
  parish_slug: string | null
  iban: string | null
  ibanValid: boolean
  gift_count: number
  gross: number
  mollie_fee_pct: number
  fund_fee_pct: number
  mollie_fee: number
  fund_fee: number
  net: number
  /** null = ešte nevytvorená výplata (návrh), inak uložená výplata */
  payout: { id: string; status: 'pending' | 'sent'; sent_at: string | null } | null
}

export interface PayoutOverview {
  month: string
  label: string
  defaults: ParishBoxFees
  enabledCount: number
  rows: PayoutRow[]
}

/**
 * Prehľad za mesiac: uložené výplaty za mesiac + návrh pre farnosti s nevyplatenými darmi
 * zaplatenými do konca mesiaca (aj staršími, ak sa v minulosti nevyplatili).
 */
export async function getPayoutOverview(month: string): Promise<PayoutOverview> {
  await requirePermission(PERM)
  if (!isValidMonth(month)) throw new Error('Neplatný mesiac.')
  const { start, end } = monthRange(month)
  const db = boxDb()

  const [defaults, { data: unpaid }, { data: payouts }, { data: settings }] = await Promise.all([
    getBoxDefaults(),
    db.from('parish_box_gifts').select('parish_id, amount').is('payout_id', null).lt('paid_at', bratislavaMidnightIso(end)),
    db.from('parish_payouts').select('*').eq('period_month', start),
    db.from('parish_box_settings').select('parish_id, enabled, mollie_fee_pct, fund_fee_pct'),
  ])

  const feeOf = new Map((settings ?? []).map((s) => [s.parish_id as string, { mollie_fee_pct: Number(s.mollie_fee_pct), fund_fee_pct: Number(s.fund_fee_pct) }]))
  const draft = new Map<string, { count: number; cents: number }>()
  for (const g of unpaid ?? []) {
    const d = draft.get(g.parish_id) ?? { count: 0, cents: 0 }
    d.count += 1
    d.cents += Math.round(Number(g.amount) * 100)
    draft.set(g.parish_id, d)
  }
  const ids = [...new Set([...draft.keys(), ...(payouts ?? []).map((p) => p.parish_id as string)])]
  const { data: parishes } = ids.length
    ? await db.from('parishes').select('id, name, slug, iban').in('id', ids)
    : { data: [] as { id: string; name: string; slug: string | null; iban: string | null }[] }
  const parishOf = new Map((parishes ?? []).map((p) => [p.id as string, p]))

  const rows: PayoutRow[] = []
  for (const p of payouts ?? []) {
    const parish = parishOf.get(p.parish_id)
    rows.push({
      parish_id: p.parish_id,
      parish_name: parish?.name ?? '—',
      parish_slug: parish?.slug ?? null,
      iban: p.iban,
      ibanValid: !!normalizeIban(p.iban),
      gift_count: p.gift_count,
      gross: Number(p.gross_amount),
      mollie_fee_pct: Number(p.mollie_fee_pct),
      fund_fee_pct: Number(p.fund_fee_pct),
      mollie_fee: Number(p.mollie_fee),
      fund_fee: Number(p.fund_fee),
      net: Number(p.net_amount),
      payout: { id: p.id, status: p.status, sent_at: p.sent_at },
    })
  }
  const hasPayout = new Set((payouts ?? []).map((p) => p.parish_id as string))
  for (const [parishId, d] of draft) {
    if (hasPayout.has(parishId)) continue // nové dary k už uloženej výplate pôjdu v ďalšom mesiaci
    const parish = parishOf.get(parishId)
    const fees = feeOf.get(parishId) ?? defaults
    const calc = computePayout(d.cents / 100, fees)
    rows.push({
      parish_id: parishId,
      parish_name: parish?.name ?? '—',
      parish_slug: parish?.slug ?? null,
      iban: parish?.iban ?? null,
      ibanValid: !!normalizeIban(parish?.iban),
      gift_count: d.count,
      gross: calc.gross,
      ...fees,
      mollie_fee: calc.mollieFee,
      fund_fee: calc.fundFee,
      net: calc.net,
      payout: null,
    })
  }
  rows.sort((a, b) => a.parish_name.localeCompare(b.parish_name, 'sk'))

  return { month, label: monthLabel(month), defaults, enabledCount: (settings ?? []).filter((s) => s.enabled).length, rows }
}

/**
 * Vytvorí výplaty za mesiac pre farnosti s nevyplatenými darmi. Percentá a IBAN sa uložia ako snapshot,
 * dary sa naviažu na výplatu (payout_id) – každý dar sa tak vyplatí práve raz.
 */
export async function createPayouts(month: string): Promise<Result<{ created: number; skipped: string[] }>> {
  try {
    const { user } = await requirePermission(PERM)
    if (!isValidMonth(month)) return { success: false, error: 'Neplatný mesiac.' }
    const overview = await getPayoutOverview(month)
    const db = boxDb()
    const { start, end } = monthRange(month)
    let created = 0
    const skipped: string[] = []

    for (const row of overview.rows.filter((r) => !r.payout)) {
      const iban = normalizeIban(row.iban)
      if (!iban) {
        skipped.push(`${row.parish_name} (chýba platný IBAN)`)
        continue
      }
      // 1. vytvoriť výplatu (UNIQUE parish + mesiac chráni pred dvojitým kliknutím)
      const { data: payout, error } = await db
        .from('parish_payouts')
        .insert({
          parish_id: row.parish_id,
          period_month: start,
          gift_count: row.gift_count,
          gross_amount: row.gross,
          mollie_fee_pct: row.mollie_fee_pct,
          fund_fee_pct: row.fund_fee_pct,
          mollie_fee: row.mollie_fee,
          fund_fee: row.fund_fee,
          net_amount: row.net,
          iban,
          created_by: user.id,
        })
        .select('id')
        .single()
      if (error || !payout) {
        skipped.push(`${row.parish_name} (${error?.code === '23505' ? 'výplata už existuje' : 'chyba pri ukladaní'})`)
        continue
      }
      // 2. naviazať dary; ak sa medzitým niečo zmenilo, sumy prepočítať zo skutočne naviazaných darov
      const { data: linked } = await db
        .from('parish_box_gifts')
        .update({ payout_id: payout.id })
        .eq('parish_id', row.parish_id)
        .is('payout_id', null)
        .lt('paid_at', bratislavaMidnightIso(end))
        .select('amount')
      const cents = (linked ?? []).reduce((a, g) => a + Math.round(Number(g.amount) * 100), 0)
      if (!linked?.length) {
        await db.from('parish_payouts').delete().eq('id', payout.id)
        continue
      }
      if (linked.length !== row.gift_count || cents !== Math.round(row.gross * 100)) {
        const calc = computePayout(cents / 100, row)
        await db
          .from('parish_payouts')
          .update({ gift_count: linked.length, gross_amount: calc.gross, mollie_fee: calc.mollieFee, fund_fee: calc.fundFee, net_amount: calc.net })
          .eq('id', payout.id)
      }
      await logParishChange(db, row.parish_id, user.id, 'parish_payout', 'create', { month, gross: cents / 100 })
      created += 1
    }

    revalidatePath('/admin/farnosti/e-zvoncek')
    return { success: true, created, skipped }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

/** Zruší ešte neodoslanú výplatu – dary sa uvoľnia a pôjdu do ďalšieho vyúčtovania. */
export async function deletePendingPayout(payoutId: string): Promise<Result> {
  try {
    const { user } = await requirePermission(PERM)
    const db = boxDb()
    const { data: p } = await db.from('parish_payouts').select('id, parish_id, status').eq('id', payoutId).maybeSingle()
    if (!p) return { success: false, error: 'Výplata sa nenašla.' }
    if (p.status !== 'pending') return { success: false, error: 'Odoslanú výplatu nemožno zrušiť.' }
    await db.from('parish_box_gifts').update({ payout_id: null }).eq('payout_id', payoutId)
    const { error } = await db.from('parish_payouts').delete().eq('id', payoutId).eq('status', 'pending')
    if (error) return { success: false, error: 'Výplatu sa nepodarilo zrušiť.' }
    await logParishChange(db, p.parish_id, user.id, 'parish_payout', 'delete', { payout_id: payoutId })
    revalidatePath('/admin/farnosti/e-zvoncek')
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

/** Označí všetky neodoslané výplaty mesiaca ako odoslané (po zadaní príkazu v banke). */
export async function markPayoutsSent(month: string): Promise<Result<{ count: number }>> {
  try {
    const { user } = await requirePermission(PERM)
    if (!isValidMonth(month)) return { success: false, error: 'Neplatný mesiac.' }
    const { data, error } = await boxDb()
      .from('parish_payouts')
      .update({ status: 'sent', sent_at: new Date().toISOString(), sent_by: user.id })
      .eq('period_month', monthRange(month).start)
      .eq('status', 'pending')
      .select('id')
    if (error) return { success: false, error: 'Nepodarilo sa uložiť.' }
    revalidatePath('/admin/farnosti/e-zvoncek')
    return { success: true, count: data?.length ?? 0 }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

// ------------------------------------------------------------
// Exporty – len uložené výplaty mesiaca so stavom „čaká na odoslanie“ (XML) / všetky (Excel)
// ------------------------------------------------------------

export async function exportPayoutsXml(month: string): Promise<Result<{ fileName: string; content: string; count: number }>> {
  try {
    await requirePermission(PERM)
    const overview = await getPayoutOverview(month)
    const pending = overview.rows.filter((r) => r.payout?.status === 'pending' && r.net > 0)
    if (!pending.length) return { success: false, error: 'Za tento mesiac nie sú žiadne výplaty čakajúce na odoslanie.' }
    const xml = buildSepaXml({
      messageId: `KROK-EZV-${month}-${Date.now().toString(36).toUpperCase()}`,
      debtorName: 'Pastoracny fond KROK Zilinskej diecezy',
      debtorIban: KROK_ORG.iban.replace(/\s+/g, ''),
      debtorBic: FUND_BIC,
      executionDate: new Date().toISOString().slice(0, 10),
      transfers: pending.map((r) => ({
        endToEndId: `EZV${month.replace('-', '')}${r.payout!.id.slice(0, 8)}`,
        amount: r.net,
        creditorName: r.parish_name,
        creditorIban: normalizeIban(r.iban)!,
        remittance: `E-zvoncek ${overview.label} - dary ${r.gift_count}x, spolu ${r.gross.toFixed(2)} EUR`,
      })),
    })
    return { success: true, fileName: `e-zvoncek-vyplaty-${month}.xml`, content: xml, count: pending.length }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

export async function exportPayoutsXlsx(month: string): Promise<Result<{ fileName: string; base64: string }>> {
  try {
    await requirePermission(PERM)
    const ov = await getPayoutOverview(month)
    const wb = new ExcelJS.Workbook()
    wb.creator = KROK_ORG.name
    const ws = wb.addWorksheet(`E-zvoncek ${month}`, { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.columns = [
      { header: 'Farnosť', key: 'name', width: 40 },
      { header: 'IBAN', key: 'iban', width: 30 },
      { header: 'Počet darov', key: 'count', width: 12 },
      { header: 'Vyzbierané (€)', key: 'gross', width: 15 },
      { header: 'Mollie %', key: 'mp', width: 10 },
      { header: 'Poplatok Mollie (€)', key: 'mf', width: 18 },
      { header: 'Fond %', key: 'fp', width: 10 },
      { header: 'Poplatok fondu (€)', key: 'ff', width: 18 },
      { header: 'Na výplatu (€)', key: 'net', width: 15 },
      { header: 'Stav', key: 'status', width: 16 },
      { header: 'Odoslané', key: 'sent', width: 14 },
    ]
    ws.getRow(1).font = { bold: true }
    for (const r of ov.rows) {
      ws.addRow({
        name: r.parish_name,
        iban: r.iban ?? '',
        count: r.gift_count,
        gross: r.gross,
        mp: r.mollie_fee_pct,
        mf: r.mollie_fee,
        fp: r.fund_fee_pct,
        ff: r.fund_fee,
        net: r.net,
        status: r.payout ? (r.payout.status === 'sent' ? 'odoslané' : 'čaká na odoslanie') : 'návrh (nevytvorené)',
        sent: r.payout?.sent_at ? new Date(r.payout.sent_at).toLocaleDateString('sk-SK') : '',
      })
    }
    const sum = (k: 'gross' | 'mollie_fee' | 'fund_fee' | 'net') => Math.round(ov.rows.reduce((a, r) => a + r[k] * 100, 0)) / 100
    const total = ws.addRow({ name: 'Spolu', count: ov.rows.reduce((a, r) => a + r.gift_count, 0), gross: sum('gross'), mf: sum('mollie_fee'), ff: sum('fund_fee'), net: sum('net') })
    total.font = { bold: true }
    for (const k of ['gross', 'mf', 'ff', 'net']) ws.getColumn(k).numFmt = '#,##0.00'
    const buf = await wb.xlsx.writeBuffer()
    return { success: true, fileName: `e-zvoncek-${month}.xlsx`, base64: Buffer.from(buf).toString('base64') }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}
