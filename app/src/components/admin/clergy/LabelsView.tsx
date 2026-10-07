'use client'

import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { btnPrimary, btnSecondary, cardCls, inputCls } from '@/components/admin/projects/ui'
import type { ClergyLabel } from '@/app/admin/knazi/actions'

/** Hárok štítkov 3 × 8 (A4, 70 × 37 mm) – pri tlači sa skryje všetko okrem štítkov. */
export default function LabelsView({ labels, deaneries, scope, deaneryId }: { labels: ClergyLabel[]; deaneries: { id: string; name: string }[]; scope: 'service' | 'living'; deaneryId: string | null }) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <style>{`
        @media print {
          @page { size: A4; margin: 0 }
          body * { visibility: hidden !important }
          #labels-sheet, #labels-sheet * { visibility: visible !important }
          #labels-sheet { position: absolute; left: 0; top: 0; width: 210mm; padding: 0 !important; border: 0 !important; box-shadow: none !important }
        }
        #labels-sheet .label { width: 70mm; height: 37.125mm; padding: 4mm 5mm; box-sizing: border-box; overflow: hidden; font-size: 9.5pt; line-height: 1.3; font-family: Arial, sans-serif; color: #000 }
      `}</style>

      <div className="print:hidden space-y-6">
        <Link href="/admin/knazi" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
          <ArrowLeft size={16} /> Schematizmus kňazov
        </Link>
        <div className={`${cardCls} flex flex-col md:flex-row md:items-end justify-between gap-4`}>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Adresné štítky</h1>
            <p className="text-sm text-gray-500 mt-1">
              {labels.length} štítkov · hárok 3 × 8 (70 × 37 mm). Adresa = farský úrad hlavného pôsobenia, pri kúrii biskupský úrad, inak trvalý pobyt. Pri tlači nastavte mierku 100 % a bez okrajov.
            </p>
          </div>
          <form className="flex flex-wrap items-end gap-2">
            <select name="rozsah" defaultValue={scope === 'living' ? 'vsetci' : ''} className={`${inputCls} w-52`}>
              <option value="">V službe</option>
              <option value="vsetci">Aj na odpočinku a štúdiách</option>
            </select>
            <select name="dekanat" defaultValue={deaneryId ?? ''} className={`${inputCls} w-52`}>
              <option value="">Všetky dekanáty</option>
              {deaneries.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button type="submit" className={btnSecondary}>Zobraziť</button>
            <button type="button" onClick={() => window.print()} className={btnPrimary}>
              <Printer size={16} /> Tlačiť
            </button>
          </form>
        </div>
      </div>

      <div id="labels-sheet" className="bg-white border border-gray-200 shadow-sm mx-auto" style={{ width: '210mm' }}>
        <div className="grid grid-cols-3">
          {labels.map((l) => (
            <div key={l.id} className="label">
              {l.lines.map((line, i) => (
                <div key={i} className={i === 0 ? 'font-bold' : ''}>{line}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
