'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import * as ExcelJS from 'exceljs'
import { fetchDonorList, parseDonorListParams, type DonorListRow } from './donor-query'

/**
 * Generates the next Variable Symbol based on the highest existing VS.
 * Format: Increment from 11771451
 */
export async function generateNextVS() {
  await requirePermission('view_donors')
  const supabase = await createClient()
  
  // Find the highest numeric VS
  const { data, error } = await supabase
    .from('donors')
    .select('variable_symbol')
    .not('variable_symbol', 'is', null)

  if (error) {
    console.error('Error fetching VS:', error)
    return '11771452' // Fallback
  }

  const maxVS = data.reduce((max, d) => {
    const num = parseInt(d.variable_symbol || '0')
    return num > max ? num : max
  }, 11771451)

  return (maxVS + 1).toString()
}

export async function updateDonor(id: string, data: any) {
  await requirePermission('view_donors')
  const supabase = await createClient()
  
  // 1. Update basic fields
  const { error: updateError } = await supabase
    .from('donors')
    .update({
      title_before: data.title_before || null,
      first_name: data.first_name,
      last_name: data.last_name,
      title_after: data.title_after || null,
      formal_addressing: data.formal_addressing || null,
      email: data.email || null,
      phone: data.phone || null,
      street: data.street || null,
      city: data.city || null,
      postal_code: data.postal_code || null,
      iban: data.iban || null,
      variable_symbol: data.variable_symbol, // Read-only in UI, but kept in payload
      parish_id: data.parish_id || null,
      donor_type: data.donor_type,
      status: data.status,
      notes: data.notes || null,
      newsletter_opt_in: data.newsletter_opt_in || false,
      confirmation_method: data.confirmation_method || null,
      company_name: data.company_name || null,
      ico: data.ico || null,
      dic: data.dic || null,
      website: data.website || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (updateError) {
    console.error('Update error:', updateError)
    return { success: false, error: 'Nepodarilo sa uložiť zmeny.' }
  }

  // 2. Update donor_projects (sync)
  if (data.project_ids) {
    // Delete old
    await supabase.from('donor_projects').delete().eq('donor_id', id)
    // Insert new
    if (data.project_ids.length > 0) {
      const pData = data.project_ids.map((pId: string) => ({
        donor_id: id,
        project_id: pId
      }))
      await supabase.from('donor_projects').insert(pData)
    }
  }

  revalidatePath('/admin/darcovia')
  revalidatePath(`/admin/darcovia/${id}`)

  return { success: true }
}

export async function createDonor(data: any) {
  await requirePermission('view_donors')
  const supabase = await createClient()
  
  // Generate VS if not provided
  const vs = data.variable_symbol || await generateNextVS()

  // Vyberieme project_ids pred insertom — nie je stĺpec v tabuľke donors
  const { project_ids, ...donorData } = data

  const { data: newDonor, error } = await supabase
    .from('donors')
    .insert([{
      ...donorData,
      variable_symbol: vs,
      status: donorData.status || 'active'
    }])
    .select()
    .single()

  if (error) {
    console.error('Create error:', error)
    return { success: false, error: error.message }
  }

  // Handle projects for new donor (cez vzťahovú tabuľku donor_projects)
  if (project_ids && project_ids.length > 0) {
    const pData = project_ids.map((pId: string) => ({
      donor_id: newDonor.id,
      project_id: pId
    }))
    await supabase.from('donor_projects').insert(pData)
  }

  revalidatePath('/admin/darcovia')
  return { success: true, id: newDonor.id }
}

export async function toggleDonorStatus(id: string, currentStatus: string) {
  await requirePermission('view_donors')
  const supabase = await createClient()
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  
  const { error } = await supabase
    .from('donors')
    .update({ 
      status: newStatus, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)

  if (error) {
    console.error('Toggle status error:', error)
    return { success: false, error: 'Nepodarilo sa zmeniť stav.' }
  }

  revalidatePath('/admin/darcovia')
  revalidatePath(`/admin/darcovia/${id}`)
  
  return { success: true, newStatus }
}

// ------------------------------------------------------------
// Export zoznamu darcov (CSV / XLSX) podľa aktuálnych filtrov a radenia
// ------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = { active: 'Aktívny', inactive: 'Neaktívny', suspended: 'Pozastavený' }

const EXPORT_COLUMNS: { header: string; key: keyof ExportRow; width: number; type?: 'money' | 'date' | 'int' }[] = [
  { header: 'VS', key: 'vs', width: 12 },
  { header: 'Priezvisko', key: 'last_name', width: 20 },
  { header: 'Meno', key: 'first_name', width: 16 },
  { header: 'E-mail', key: 'email', width: 28 },
  { header: 'Telefón', key: 'phone', width: 16 },
  { header: 'Mesto', key: 'city', width: 18 },
  { header: 'Farnosť', key: 'parish', width: 22 },
  { header: 'Stav', key: 'status', width: 12 },
  { header: 'Dary spolu (€)', key: 'total', width: 16, type: 'money' },
  { header: 'Počet darov', key: 'count', width: 12, type: 'int' },
  { header: 'Posledný dar – dátum', key: 'last_date', width: 20, type: 'date' },
  { header: 'Posledný dar – suma (€)', key: 'last_amount', width: 22, type: 'money' },
  { header: 'Pôvodné ID', key: 'legacy_id', width: 12 },
]

interface ExportRow {
  vs: string
  last_name: string
  first_name: string
  email: string
  phone: string
  city: string
  parish: string
  status: string
  total: number
  count: number
  last_date: Date | null
  last_amount: number | null
  legacy_id: string
}

function toExportRow(d: DonorListRow): ExportRow {
  return {
    vs: d.variable_symbol ?? '',
    last_name: d.last_name,
    first_name: d.first_name,
    email: d.email ?? '',
    phone: d.phone ?? '',
    city: d.city ?? '',
    parish: d.parishes?.name ?? '',
    status: STATUS_LABEL[d.status] ?? d.status,
    total: d.total_donated,
    count: d.donations_count,
    last_date: d.last_donation_date ? new Date(d.last_donation_date) : null,
    last_amount: d.last_donation_amount,
    legacy_id: d.legacy_id ?? '',
  }
}

function csvCell(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function buildCsv(rows: ExportRow[]): string {
  const money = (n: number | null) => (n == null ? '' : n.toFixed(2).replace('.', ','))
  const date = (d: Date | null) => (d ? d.toLocaleDateString('sk-SK') : '')
  const lines = [EXPORT_COLUMNS.map((c) => csvCell(c.header)).join(';')]
  for (const r of rows) {
    lines.push(
      EXPORT_COLUMNS.map((c) => {
        const v = r[c.key]
        if (c.type === 'money') return money(v as number | null)
        if (c.type === 'date') return date(v as Date | null)
        return csvCell(v == null ? '' : String(v))
      }).join(';')
    )
  }
  // BOM, aby Excel správne otvoril diakritiku
  return '﻿' + lines.join('\r\n')
}

async function buildXlsx(rows: ExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'KROK – Pastoračný fond Žilinskej diecézy'
  const ws = wb.addWorksheet('Darcovia', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }))
  for (const r of rows) ws.addRow(r)

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFFB' } }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EXPORT_COLUMNS.length } }
  EXPORT_COLUMNS.forEach((c, i) => {
    const col = ws.getColumn(i + 1)
    if (c.type === 'money') col.numFmt = '#,##0.00 "€"'
    if (c.type === 'date') col.numFmt = 'dd.mm.yyyy'
    if (c.type === 'int') col.numFmt = '0'
  })

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

export type ExportDonorsResult =
  | { success: true; fileName: string; mime: string; base64: string }
  | { success: false; error: string }

/**
 * Export darcov podľa filtrov a radenia z URL (rovnaké ako na stránke), všetky strany.
 */
export async function exportDonors(rawParams: Record<string, string | undefined>, format: 'csv' | 'xlsx'): Promise<ExportDonorsResult> {
  await requirePermission('view_donors')
  try {
    const params = parseDonorListParams(rawParams)
    const { donors } = await fetchDonorList(params, { all: true })
    const rows = donors.map(toExportRow)
    const stamp = new Date().toISOString().slice(0, 10)

    if (format === 'csv') {
      const csv = buildCsv(rows)
      return { success: true, fileName: `darcovia-${stamp}.csv`, mime: 'text/csv;charset=utf-8', base64: Buffer.from(csv, 'utf-8').toString('base64') }
    }
    const xlsx = await buildXlsx(rows)
    return {
      success: true,
      fileName: `darcovia-${stamp}.xlsx`,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: xlsx.toString('base64'),
    }
  } catch (err) {
    console.error('[darcovia] exportDonors:', err)
    return { success: false, error: 'Export sa nepodaril.' }
  }
}
