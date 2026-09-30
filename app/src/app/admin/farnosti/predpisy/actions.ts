'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import * as ExcelJS from 'exceljs'
import { requirePermission } from '@/lib/auth'

/**
 * Predpis farností na rok (návrh farností § 3.4, fáza F3).
 * Predpis = katolíci (štatistika stats_year) × koeficient, zaokrúhlené; dá sa ručne prepísať s dôvodom.
 * Vygenerovaný rok sa automaticky neprepočítava – katolíci aj sadzba sú uložené ako snapshot (O4).
 * Duchovné správy predpis nemajú (O10).
 */

const PERM = 'manage_parishes'

function db() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

export interface TargetSettings {
  year: number
  rate_per_catholic: number
  stats_year: number
  rounding: number
  note: string | null
}

export interface TargetRow {
  parish_id: string
  name: string
  deanery: string | null
  /** katolíci podľa aktuálnej štatistiky (stats_year) */
  catholics_now: number | null
  target_id: string | null
  /** snapshot pri generovaní */
  catholics: number | null
  calculated_amount: number | null
  prescribed_amount: number | null
  override_reason: string | null
  collected_amount: number
  donors_count: number
  fulfillment_pct: number | null
}

export interface TargetsOverview {
  year: number
  settings: TargetSettings | null
  rows: TargetRow[]
  years: number[]
}

const round = (value: number, step: number) => Math.round(value / (step || 1)) * (step || 1)

export async function getTargetsOverview(year: number): Promise<TargetsOverview> {
  await requirePermission(PERM)
  const admin = db()
  const [{ data: settings }, { data: allSettings }, { data: parishes }, { data: deaneries }] = await Promise.all([
    admin.from('parish_target_settings').select('*').eq('year', year).maybeSingle(),
    admin.from('parish_target_settings').select('year'),
    admin.from('parishes').select('id, name, official_name, deanery_id').eq('kind', 'parish').eq('is_active', true),
    admin.from('deaneries').select('id, name'),
  ])
  const statsYear = (settings?.stats_year as number | undefined) ?? 2021

  const [{ data: population }, { data: targets }, { data: summary }] = await Promise.all([
    admin.from('v_parish_population').select('parish_id, catholics').eq('year', statsYear),
    admin.from('parish_year_targets').select('*').eq('year', year),
    admin.from('v_parish_year_summary').select('parish_id, collected_amount, donors_count').eq('year', year),
  ])

  const deaneryName = new Map((deaneries ?? []).map((d) => [d.id as string, d.name as string]))
  const catholics = new Map((population ?? []).map((p) => [p.parish_id as string, Number(p.catholics)]))
  const target = new Map((targets ?? []).map((t) => [t.parish_id as string, t]))
  const sum = new Map((summary ?? []).map((s) => [s.parish_id as string, s]))

  const rows: TargetRow[] = (parishes ?? []).map((p) => {
    const t = target.get(p.id)
    const s = sum.get(p.id)
    const collected = Number(s?.collected_amount ?? 0)
    const prescribed = t ? Number(t.prescribed_amount) : null
    return {
      parish_id: p.id,
      name: p.official_name ?? p.name,
      deanery: p.deanery_id ? deaneryName.get(p.deanery_id) ?? null : null,
      catholics_now: catholics.get(p.id) ?? null,
      target_id: t?.id ?? null,
      catholics: t?.catholics ?? null,
      calculated_amount: t?.calculated_amount != null ? Number(t.calculated_amount) : null,
      prescribed_amount: prescribed,
      override_reason: t?.override_reason ?? null,
      collected_amount: collected,
      donors_count: Number(s?.donors_count ?? 0),
      fulfillment_pct: prescribed ? Math.round((1000 * collected) / prescribed) / 10 : null,
    }
  })
  rows.sort((a, b) => a.name.localeCompare(b.name, 'sk'))

  const currentYear = new Date().getFullYear()
  const years = [...new Set([currentYear, currentYear + 1, ...(allSettings ?? []).map((s) => s.year as number)])].sort((a, b) => b - a)

  return {
    year,
    settings: settings
      ? { year: settings.year, rate_per_catholic: Number(settings.rate_per_catholic), stats_year: settings.stats_year, rounding: settings.rounding, note: settings.note }
      : null,
    rows,
    years,
  }
}

export async function saveTargetSettings(input: TargetSettings): Promise<Result> {
  await requirePermission(PERM)
  const rate = Number(input.rate_per_catholic)
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1000) return { success: false, error: 'Koeficient musí byť kladné číslo.' }
  if (!Number.isInteger(input.year) || input.year < 2019 || input.year > 2100) return { success: false, error: 'Neplatný rok.' }
  const { error } = await db()
    .from('parish_target_settings')
    .upsert(
      { year: input.year, rate_per_catholic: rate, stats_year: input.stats_year || 2021, rounding: Math.max(1, Math.round(input.rounding || 1)), note: input.note || null },
      { onConflict: 'year' }
    )
  if (error) return { success: false, error: 'Uloženie nastavenia zlyhalo.' }
  revalidatePath('/admin/farnosti/predpisy')
  return { success: true }
}

/**
 * Vygeneruje predpisy na rok. mode = 'missing' → len farnosti bez predpisu;
 * 'recalculate' → aj existujúce, ale NIE ručne upravené (s dôvodom).
 */
export async function generateTargets(year: number, mode: 'missing' | 'recalculate' = 'missing'): Promise<Result<{ created: number; updated: number; skipped: string[] }>> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const { data: settings } = await admin.from('parish_target_settings').select('*').eq('year', year).maybeSingle()
  if (!settings) return { success: false, error: `Pre rok ${year} nie je nastavený koeficient.` }

  const rate = Number(settings.rate_per_catholic)
  const [{ data: parishes }, { data: population }, { data: existing }] = await Promise.all([
    admin.from('parishes').select('id, name').eq('kind', 'parish').eq('is_active', true),
    admin.from('v_parish_population').select('parish_id, catholics').eq('year', settings.stats_year),
    admin.from('parish_year_targets').select('id, parish_id, override_reason').eq('year', year),
  ])
  const catholics = new Map((population ?? []).map((p) => [p.parish_id as string, Number(p.catholics)]))
  const existingBy = new Map((existing ?? []).map((t) => [t.parish_id as string, t]))

  let created = 0
  let updated = 0
  const skipped: string[] = []
  for (const p of parishes ?? []) {
    const c = catholics.get(p.id)
    if (!c) {
      skipped.push(p.name)
      continue
    }
    const amount = round(c * rate, settings.rounding)
    const ex = existingBy.get(p.id)
    if (!ex) {
      const { error } = await admin.from('parish_year_targets').insert({
        parish_id: p.id, year, catholics: c, rate_per_catholic: rate, calculated_amount: amount, prescribed_amount: amount, created_by: user.id,
      })
      if (!error) created++
    } else if (mode === 'recalculate' && !ex.override_reason) {
      const { error } = await admin
        .from('parish_year_targets')
        .update({ catholics: c, rate_per_catholic: rate, calculated_amount: amount, prescribed_amount: amount, updated_at: new Date().toISOString() })
        .eq('id', ex.id)
      if (!error) updated++
    }
  }
  revalidatePath('/admin/farnosti/predpisy')
  revalidatePath('/admin/farnosti')
  return { success: true, created, updated, skipped }
}

/** Ručná úprava predpisu farnosti – dôvod je povinný, ak sa líši od výpočtu. */
export async function updateTarget(targetId: string, prescribed: number, reason: string | null): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const value = Math.round(Number(prescribed) * 100) / 100
  if (!Number.isFinite(value) || value < 0) return { success: false, error: 'Neplatná suma.' }
  const { data: t } = await admin.from('parish_year_targets').select('*').eq('id', targetId).maybeSingle()
  if (!t) return { success: false, error: 'Predpis sa nenašiel.' }
  const differs = Number(t.calculated_amount ?? 0) !== value
  const cleanReason = reason?.trim() || null
  if (differs && !cleanReason) return { success: false, error: 'Uveďte dôvod, prečo sa predpis líši od výpočtu.' }

  const { error } = await admin
    .from('parish_year_targets')
    .update({ prescribed_amount: value, override_reason: differs ? cleanReason : null, updated_at: new Date().toISOString() })
    .eq('id', targetId)
  if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  await admin.from('parish_change_log').insert({
    parish_id: t.parish_id,
    user_id: user.id,
    entity: 'target',
    action: 'admin_update',
    changes: { year: t.year, prescribed_amount: [Number(t.prescribed_amount), value], override_reason: cleanReason },
  })
  revalidatePath('/admin/farnosti/predpisy')
  revalidatePath(`/admin/farnosti/${t.parish_id}`)
  return { success: true }
}

export async function exportTargets(year: number): Promise<Result<{ fileName: string; base64: string }>> {
  const ov = await getTargetsOverview(year)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'KROK – Pastoračný fond Žilinskej diecézy'
  const ws = wb.addWorksheet(`Predpis ${year}`, { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = [
    { header: 'Farnosť', key: 'name', width: 34 },
    { header: 'Dekanát', key: 'deanery', width: 20 },
    { header: 'Katolíci', key: 'catholics', width: 11 },
    { header: 'Výpočet €', key: 'calculated', width: 12 },
    { header: 'Predpis €', key: 'prescribed', width: 12 },
    { header: 'Dôvod úpravy', key: 'reason', width: 30 },
    { header: `Vybrané ${year} €`, key: 'collected', width: 14 },
    { header: 'Darcovia', key: 'donors', width: 10 },
    { header: 'Plnenie %', key: 'pct', width: 11 },
  ]
  for (const r of ov.rows) {
    ws.addRow({
      name: r.name, deanery: r.deanery, catholics: r.catholics ?? r.catholics_now, calculated: r.calculated_amount, prescribed: r.prescribed_amount,
      reason: r.override_reason, collected: r.collected_amount, donors: r.donors_count, pct: r.fulfillment_pct,
    })
  }
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFFB' } }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 9 } }
  for (const k of ['calculated', 'prescribed', 'collected']) ws.getColumn(k).numFmt = '#,##0.00 "€"'
  const buf = await wb.xlsx.writeBuffer()
  return { success: true, fileName: `predpis-farnosti-${year}.xlsx`, base64: Buffer.from(buf).toString('base64') }
}
