'use server'

import * as ExcelJS from 'exceljs'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/auth'
import { isCurrent } from '@/lib/clergy/types'

/** Tlačové zostavy schematizmu kňazov (prezenčné listiny…) – čítanie `view_clergy`. */

const VIEW = 'view_clergy'
type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

const db = () => createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export type AttendanceScope = 'service' | 'living'

export interface AttendancePerson {
  id: string
  salutation: string
  first_name: string
  last_name: string
}

export interface AttendanceGroup {
  deanery_id: string
  deanery: string
  people: AttendancePerson[]
}

export interface AttendanceOptions {
  title1: string
  title2: string
  scope: AttendanceScope
  /** null = všetky dekanáty (každý na samostatnej strane / hárku) */
  deaneryId: string | null
  /** prázdne riadky na dopísanie pod kňazmi dekanátu */
  extraRows: number
  /** riadky v tabuľke Hostia */
  guestRows: number
}

interface AsgRow {
  deanery_id: string | null
  is_primary: boolean
  kind: string
  date_to: string | null
  year_to: number | null
}

/**
 * Kňazi a diakoni podľa dekanátov: dekanát hlavného aktuálneho pôsobenia,
 * ak ho hlavné pôsobenie nemá (napr. kúria), prvé aktuálne pôsobenie s dekanátom.
 */
export async function getAttendanceGroups(scope: AttendanceScope, deaneryId: string | null): Promise<AttendanceGroup[]> {
  await requirePermission(VIEW)
  const client = db()
  const [{ data, error }, { data: deaneries }] = await Promise.all([
    client
      .from('clergy')
      .select('id, first_name, last_name, salutation, clergy_assignments(deanery_id, is_primary, kind, date_to, year_to)')
      .in('status', scope === 'service' ? ['active'] : ['active', 'retired', 'studying'])
      .in('category', ['priest', 'bishop', 'deacon', 'permanent_deacon'])
      .order('last_name')
      .order('first_name'),
    client.from('deaneries').select('id, name').order('name'),
  ])
  if (error) throw new Error(error.message)

  const groups = new Map<string, AttendanceGroup>((deaneries ?? []).map((d) => [d.id, { deanery_id: d.id, deanery: d.name, people: [] }]))
  for (const c of data ?? []) {
    const cur = ((c.clergy_assignments ?? []) as AsgRow[]).filter(isCurrent)
    const primary = cur.find((a) => a.is_primary) ?? cur.find((a) => a.kind === 'parish') ?? cur[0]
    const deanery = primary?.deanery_id ?? cur.find((a) => a.deanery_id)?.deanery_id
    const g = deanery ? groups.get(deanery) : null
    if (g) g.people.push({ id: c.id, salutation: c.salutation ?? '', first_name: c.first_name, last_name: c.last_name })
  }
  const list = [...groups.values()].sort((a, b) => a.deanery.localeCompare(b.deanery, 'sk'))
  for (const g of list) g.people.sort((a, b) => a.last_name.localeCompare(b.last_name, 'sk') || a.first_name.localeCompare(b.first_name, 'sk'))
  return deaneryId ? list.filter((g) => g.deanery_id === deaneryId) : list
}

const clampRows = (n: number, max: number) => Math.max(0, Math.min(max, Math.floor(Number(n) || 0)))

/** Prezenčná listina do Excelu – jeden hárok na dekanát, pripravený na tlač A4. */
export async function exportAttendanceXlsx(opts: AttendanceOptions): Promise<Result<{ fileName: string; base64: string }>> {
  try {
    const groups = await getAttendanceGroups(opts.scope, opts.deaneryId)
    if (!groups.length) return { success: false, error: 'Žiadny dekanát na export.' }
    const extraRows = clampRows(opts.extraRows, 50)
    const guestRows = clampRows(opts.guestRows, 50)

    const wb = new ExcelJS.Workbook()
    wb.creator = 'KROK – schematizmus kňazov'
    const thin = { style: 'thin' as const, color: { argb: 'FF000000' } }
    const border = { top: thin, left: thin, bottom: thin, right: thin }
    const used = new Set<string>()

    for (const g of groups) {
      let name = g.deanery.replace(/[\\/*?:[\]]/g, '').slice(0, 31) || 'Dekanát'
      while (used.has(name)) name = `${name.slice(0, 28)} ${used.size}`
      used.add(name)
      const ws = wb.addWorksheet(name, {
        pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
      })
      ws.columns = [{ width: 5 }, { width: 11 }, { width: 16 }, { width: 20 }, { width: 26 }, { width: 22 }]

      const titleRow = (text: string, size: number) => {
        const r = ws.addRow([text])
        ws.mergeCells(r.number, 1, r.number, 6)
        r.getCell(1).font = { bold: true, size }
        r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        r.height = size * 1.8
      }
      if (opts.title1.trim()) titleRow(opts.title1.trim(), 14)
      if (opts.title2.trim()) titleRow(opts.title2.trim(), 12)
      ws.addRow([])
      titleRow(`Dekanát ${g.deanery}`, 13)
      ws.addRow([])

      const table = (rows: (string | number)[][]) => {
        const head = ws.addRow(['Č.', 'Oslovenie', 'Meno', 'Priezvisko', 'Podpis', 'Poznámka'])
        head.font = { bold: true }
        head.height = 20
        head.eachCell((c) => {
          c.border = border
          c.alignment = { vertical: 'middle' }
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }
        })
        for (const values of rows) {
          const r = ws.addRow(values)
          r.height = 24
          for (let i = 1; i <= 6; i++) {
            r.getCell(i).border = border
            r.getCell(i).alignment = { vertical: 'middle' }
          }
        }
      }

      const blank = (from: number, count: number) => Array.from({ length: count }, (_, i) => [from + i, '', '', '', '', ''])
      table([...g.people.map((p, i) => [i + 1, p.salutation, p.first_name, p.last_name, '', '']), ...blank(g.people.length + 1, extraRows)])

      if (guestRows > 0) {
        ws.addRow([])
        const h = ws.addRow(['Hostia'])
        ws.mergeCells(h.number, 1, h.number, 6)
        h.getCell(1).font = { bold: true, size: 12 }
        h.height = 22
        table(blank(1, guestRows))
      }
    }

    const buf = await wb.xlsx.writeBuffer()
    const date = new Date().toISOString().slice(0, 10)
    const suffix = groups.length === 1 ? `-${groups[0].deanery.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : ''
    return { success: true, fileName: `prezencna-listina${suffix}-${date}.xlsx`, base64: Buffer.from(buf).toString('base64') }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznáma chyba' }
  }
}
