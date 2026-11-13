'use client'

import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { btnPrimary, cardCls } from '@/components/admin/projects/ui'
import type { AttendanceGroup } from '@/app/admin/knazi/zostavy/actions'

/** Prezenčná listina – A4 na výšku, každý dekanát na novej strane; pri tlači sa skryje všetko okrem hárkov. */
export default function AttendanceSheet({ groups, title1, title2, extraRows, guestRows }: { groups: AttendanceGroup[]; title1: string; title2: string; extraRows: number; guestRows: number }) {
  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm 12mm 14mm }
          body * { visibility: hidden !important }
          #attendance, #attendance * { visibility: visible !important }
          #attendance { position: absolute; left: 0; top: 0; width: 100% }
          #attendance .sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; padding: 0 !important; width: auto !important; min-height: 0 !important }
          #attendance .sheet + .sheet { break-before: page }
        }
        #attendance .sheet { font-family: Arial, sans-serif; color: #000; font-size: 10.5pt }
        #attendance .t1 { font-size: 15pt; font-weight: bold; text-align: center; min-height: 9mm }
        #attendance .t2 { font-size: 12.5pt; font-weight: bold; text-align: center; min-height: 8mm; margin-top: 1mm }
        #attendance .blank { border-bottom: 1px dotted #000; margin: 0 25mm }
        #attendance .deanery { font-size: 13pt; font-weight: bold; text-align: center; margin: 6mm 0 4mm }
        #attendance .guests { font-size: 12pt; font-weight: bold; margin: 7mm 0 2.5mm }
        #attendance table { width: 100%; border-collapse: collapse; table-layout: fixed }
        #attendance th, #attendance td { border: 1px solid #000; padding: 0 2mm; height: 8.5mm; text-align: left; vertical-align: middle; overflow: hidden; white-space: nowrap }
        #attendance th { height: 7mm; background: #eee; font-size: 9.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact }
        #attendance tr { break-inside: avoid }
      `}</style>

      <div className={`print:hidden ${cardCls} flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[210mm] mx-auto`}>
        <div>
          <Link href="/admin/knazi/zostavy" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
            <ArrowLeft size={16} /> Zostavy
          </Link>
          <p className="text-sm text-gray-500 mt-2">
            {groups.length === 1 ? `Dekanát ${groups[0].deanery}` : `${groups.length} dekanátov – každý na samostatnej strane`} · {groups.reduce((s, g) => s + g.people.length, 0)} osôb
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className={btnPrimary}>
          <Printer size={16} /> Tlačiť
        </button>
      </div>

      <div id="attendance" className="space-y-6">
        {groups.map((g) => (
          <section key={g.deanery_id} className="sheet bg-white border border-gray-200 shadow-sm mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '12mm' }}>
            <div className={`t1 ${title1 ? '' : 'blank'}`}>{title1}</div>
            <div className={`t2 ${title2 ? '' : 'blank'}`}>{title2}</div>
            <div className="deanery">Dekanát {g.deanery}</div>
            <AttendanceTable
              rows={[...g.people.map((p) => [p.salutation, p.first_name, p.last_name]), ...Array.from({ length: extraRows }, () => ['', '', ''])]}
            />
            {guestRows > 0 && (
              <>
                <div className="guests">Hostia</div>
                <AttendanceTable rows={Array.from({ length: guestRows }, () => ['', '', ''])} />
              </>
            )}
          </section>
        ))}
        {groups.length === 0 && <p className="print:hidden text-center text-gray-500">Žiadny dekanát.</p>}
      </div>
    </div>
  )
}

function AttendanceTable({ rows }: { rows: string[][] }) {
  return (
    <table>
      <colgroup>
        <col style={{ width: '8%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '20%' }} />
        <col style={{ width: '26%' }} />
        <col style={{ width: '18%' }} />
      </colgroup>
      <thead>
        <tr>
          <th>Č.</th>
          <th>Oslovenie</th>
          <th>Meno</th>
          <th>Priezvisko</th>
          <th>Podpis</th>
          <th>Poznámka</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td>{i + 1}.</td>
            <td>{r[0]}</td>
            <td>{r[1]}</td>
            <td>{r[2]}</td>
            <td />
            <td />
          </tr>
        ))}
      </tbody>
    </table>
  )
}
