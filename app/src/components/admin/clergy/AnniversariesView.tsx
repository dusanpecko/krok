'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarHeart, FileSpreadsheet, Loader2 } from 'lucide-react'
import { btnSecondary, cardCls, inputCls, Notice } from '@/components/admin/projects/ui'
import { exportAnniversariesXlsx } from '@/app/admin/knazi/actions'
import { KIND_LABEL, MONTHS, computeAnniversaries, dayLabel, type AnniversaryKind, type AnniversaryPerson } from '@/lib/clergy/anniversaries'

const KIND_CLASS: Record<AnniversaryKind, string> = {
  ordination: 'bg-blue-100 text-blue-800 border-blue-200',
  birth: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  death: 'bg-gray-100 text-gray-600 border-gray-200',
  name_day: 'bg-amber-100 text-amber-800 border-amber-200',
}

export default function AnniversariesView({ people }: { people: AnniversaryPerson[] }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number | 0>(now.getMonth() + 1)
  const [kinds, setKinds] = useState<Set<AnniversaryKind>>(new Set(['ordination', 'birth', 'death', 'name_day']))
  const [majorOnly, setMajorOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const list = useMemo(
    () =>
      computeAnniversaries(people, year).filter(
        (a) => kinds.has(a.kind) && (!month || Number(a.day.slice(0, 2)) === month) && (!majorOnly || a.major || a.kind === 'name_day')
      ),
    [people, year, month, kinds, majorOnly]
  )

  const toggle = (k: AnniversaryKind) =>
    setKinds((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  const onExport = () =>
    startTransition(async () => {
      const res = await exportAnniversariesXlsx(year, month || null)
      if (!res.success) return setError(res.error)
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes]))
      const a = document.createElement('a')
      a.href = url
      a.download = res.fileName
      a.click()
      URL.revokeObjectURL(url)
    })

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Link href="/admin/knazi" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Schematizmus kňazov
      </Link>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <CalendarHeart className="text-blue-600" /> Výročia a meniny
          </h1>
          <p className="text-gray-500 mt-1">
            Počíta sa z dátumov v registri: jubileá kňazstva každých 5 rokov od 10., životné jubileá od 40. rokov, výročia úmrtia (1. a každých 5 rokov), meniny. Tučne = výrazné jubileum.
          </p>
        </div>
        <button type="button" onClick={onExport} disabled={pending} className={btnSecondary}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Export pre Katolícke noviny / obežník
        </button>
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      <div className={`${cardCls} space-y-4`}>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inputCls} w-32`}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${inputCls} w-44`}>
            <option value={0}>celý rok</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          {(Object.keys(KIND_LABEL) as AnniversaryKind[]).map((k) => (
            <button key={k} type="button" onClick={() => toggle(k)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${kinds.has(k) ? KIND_CLASS[k] : 'bg-white border-gray-200 text-gray-400'}`}>
              {KIND_LABEL[k]}
            </button>
          ))}
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
            <input type="checkbox" checked={majorOnly} onChange={(e) => setMajorOnly(e.target.checked)} /> len výrazné jubileá
          </label>
        </div>

        <p className="text-xs text-gray-500 font-mono">{list.length} záznamov</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="py-2 px-2">Dátum</th><th className="py-2 px-2">Druh</th><th className="py-2 px-2">Rokov</th><th className="py-2 px-2">Meno</th><th className="py-2 px-2">Pôsobenie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((a) => (
                <tr key={`${a.kind}-${a.person.id}`} className={a.major ? 'font-bold' : ''}>
                  <td className="py-2 px-2 font-mono text-xs whitespace-nowrap">{dayLabel(a.day)}</td>
                  <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${KIND_CLASS[a.kind]}`}>{KIND_LABEL[a.kind]}</span></td>
                  <td className="py-2 px-2">{a.years ?? ''}</td>
                  <td className="py-2 px-2"><Link href={`/admin/knazi/${a.person.id}`} className="hover:text-blue-600">{a.person.name}</Link></td>
                  <td className="py-2 px-2 text-gray-500 font-normal">{[a.person.role, a.person.place].filter(Boolean).join(' – ') || '—'}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400">V tomto období nie sú žiadne výročia.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
