'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, FileSpreadsheet, Loader2, Printer, X } from 'lucide-react'
import { btnPrimary, btnSecondary, cardCls, Field, inputCls, Notice } from '@/components/admin/projects/ui'
import { exportAttendanceXlsx, exportDeaneryOverviewXlsx, type AttendanceScope } from '@/app/admin/knazi/zostavy/actions'

/** Tlačové zostavy schematizmu – zoznam zostáv, nastavenia v okne, tlač alebo export do Excelu. */

interface ReportDef {
  key: 'prezencna-listina' | 'dekanaty'
  title: string
  text: string
}

const REPORTS: ReportDef[] = [
  {
    key: 'prezencna-listina',
    title: 'Prezenčná listina podľa dekanátov',
    text: 'Nadpis, dekanát, tabuľka kňazov (oslovenie, meno, priezvisko, podpis, poznámka) s riadkami na dopísanie a tabuľka hostí.',
  },
  {
    key: 'dekanaty',
    title: 'Dekanáty a farnosti – prehľad',
    text: 'Pre biskupa: dekanát a jeho dekan, farnosti a kňazi v nich – funkcia, od ktorého roku sú vo farnosti, fotka.',
  },
]

function download(fileName: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsView({ deaneries }: { deaneries: { id: string; name: string }[] }) {
  const [open, setOpen] = useState<ReportDef | null>(null)
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/admin/knazi" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Schematizmus kňazov
      </Link>
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <ClipboardList className="text-blue-600" /> Zostavy
        </h1>
        <p className="text-gray-500 mt-1">Tlačové zostavy zo schematizmu – na tlač alebo do Excelu.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <button key={r.key} type="button" onClick={() => setOpen(r)} className={`${cardCls} text-left hover:border-blue-300 hover:shadow-md transition-all cursor-pointer`}>
            <p className="font-black text-gray-900">{r.title}</p>
            <p className="text-sm text-gray-500 mt-1">{r.text}</p>
          </button>
        ))}
      </div>
      {open?.key === 'prezencna-listina' && <AttendanceDialog deaneries={deaneries} onClose={() => setOpen(null)} />}
      {open?.key === 'dekanaty' && <OverviewDialog deaneries={deaneries} onClose={() => setOpen(null)} />}
    </div>
  )
}

function AttendanceDialog({ deaneries, onClose }: { deaneries: { id: string; name: string }[]; onClose: () => void }) {
  const [title1, setTitle1] = useState('')
  const [title2, setTitle2] = useState('')
  const [deaneryId, setDeaneryId] = useState('')
  const [scope, setScope] = useState<AttendanceScope>('service')
  const [extraRows, setExtraRows] = useState(3)
  const [guestRows, setGuestRows] = useState(5)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const printUrl = () => {
    const q = new URLSearchParams({ n1: title1, n2: title2, rozsah: scope === 'living' ? 'vsetci' : '', dekanat: deaneryId, riadky: String(extraRows), hostia: String(guestRows) })
    return `/admin/knazi/zostavy/prezencna-listina?${q}`
  }

  const onExport = () => {
    setMsg(null)
    startTransition(async () => {
      const res = await exportAttendanceXlsx({ title1, title2, scope, deaneryId: deaneryId || null, extraRows, guestRows })
      if (res.success) download(res.fileName, res.base64)
      else setMsg(res.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${cardCls} w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Prezenčná listina podľa dekanátov</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 cursor-pointer"><X size={18} /></button>
        </div>
        <Field label="Nadpis – 1. riadok" hint="Napr. Kňazská rekolekcia. Prázdny nadpis = linka na dopísanie rukou.">
          <input value={title1} onChange={(e) => setTitle1(e.target.value)} className={inputCls} autoFocus />
        </Field>
        <Field label="Nadpis – 2. riadok" hint="Napr. dátum a miesto.">
          <input value={title2} onChange={(e) => setTitle2(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dekanát" hint="Všetky = každý dekanát na samostatnej strane.">
            <select value={deaneryId} onChange={(e) => setDeaneryId(e.target.value)} className={inputCls}>
              <option value="">Všetky dekanáty</option>
              {deaneries.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Kňazi">
            <select value={scope} onChange={(e) => setScope(e.target.value as AttendanceScope)} className={inputCls}>
              <option value="service">V službe</option>
              <option value="living">Aj na odpočinku a štúdiách</option>
            </select>
          </Field>
          <Field label="Prázdne riadky pod kňazmi">
            <input type="number" min={0} max={50} value={extraRows} onChange={(e) => setExtraRows(Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Riadky pre hostí" hint="0 = bez tabuľky Hostia.">
            <input type="number" min={0} max={50} value={guestRows} onChange={(e) => setGuestRows(Number(e.target.value))} className={inputCls} />
          </Field>
        </div>
        {msg && <Notice kind="error">{msg}</Notice>}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" onClick={onExport} disabled={pending} className={btnSecondary}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Export do Excelu
          </button>
          <a href={printUrl()} target="_blank" rel="noopener" className={btnPrimary}>
            <Printer size={16} /> Náhľad a tlač
          </a>
        </div>
      </div>
    </div>
  )
}

function OverviewDialog({ deaneries, onClose }: { deaneries: { id: string; name: string }[]; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [deaneryId, setDeaneryId] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const printUrl = `/admin/knazi/zostavy/dekanaty?${new URLSearchParams({ n: title, dekanat: deaneryId })}`

  const onExport = () => {
    setMsg(null)
    startTransition(async () => {
      const res = await exportDeaneryOverviewXlsx(deaneryId || null)
      if (res.success) download(res.fileName, res.base64)
      else setMsg(res.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${cardCls} w-full max-w-lg space-y-4`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Dekanáty a farnosti – prehľad</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 cursor-pointer"><X size={18} /></button>
        </div>
        <Field label="Dekanát" hint="Všetky = každý dekanát na samostatnej strane.">
          <select value={deaneryId} onChange={(e) => setDeaneryId(e.target.value)} className={inputCls}>
            <option value="">Všetky dekanáty</option>
            {deaneries.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Nadpis nad dekanátom (nepovinný)" hint="Malým písmom nad názvom dekanátu, napr. Žilinská diecéza – stav k 13. 11. 2026.">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </Field>
        {msg && <Notice kind="error">{msg}</Notice>}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" onClick={onExport} disabled={pending} className={btnSecondary}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Export do Excelu
          </button>
          <a href={printUrl} target="_blank" rel="noopener" className={btnPrimary}>
            <Printer size={16} /> Náhľad a tlač
          </a>
        </div>
      </div>
    </div>
  )
}
