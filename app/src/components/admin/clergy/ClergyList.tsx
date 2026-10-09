'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarHeart, FileSpreadsheet, Loader2, Plus, Landmark, Search, Tags, Users, X } from 'lucide-react'
import { btnPrimary, btnSecondary, cardCls, Field, inputCls, Notice } from '@/components/admin/projects/ui'
import { createClergy, exportClergyXlsx } from '@/app/admin/knazi/actions'
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
  TONE_CLASS,
  clergyDisplayName,
  clergyTone,
  currentAcademicYear,
  seminaryYear,
  seminaryYearLabel,
  type ClergyCategory,
  type ClergyListItem,
  type Tone,
} from '@/lib/clergy/types'

const fold = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type Scope = 'service' | 'all' | 'archive'

function download(fileName: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export default function ClergyList({ clergy }: { clergy: ClergyListItem[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<Scope>('service')
  const [tone, setTone] = useState<Tone | 'all'>('all')
  const [deanery, setDeanery] = useState('all')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const rows = useMemo(() => clergy.map((c) => ({ ...c, tone: clergyTone(c) })), [clergy])
  const deaneries = useMemo(
    () => [...new Map(rows.filter((r) => r.deanery_id).map((r) => [r.deanery_id!, r.deanery_name ?? ''])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'sk')),
    [rows]
  )

  const filtered = useMemo(() => {
    const fq = fold(q.trim())
    return rows.filter((r) => {
      const archived = r.status === 'left' || r.status === 'deceased'
      if (scope === 'service' && archived) return false
      if (scope === 'archive' && !archived) return false
      if (tone !== 'all' && r.tone !== tone) return false
      if (deanery !== 'all' && r.deanery_id !== deanery) return false
      if (!fq) return true
      return [r.first_name, r.last_name, r.primary_place, r.primary_role, r.personal_number, r.religious_order].some((v) => fold(v).includes(fq))
    })
  }, [rows, q, scope, tone, deanery])

  const counts = useMemo(() => {
    const c: Partial<Record<Tone, number>> = {}
    rows.forEach((r) => (c[r.tone] = (c[r.tone] ?? 0) + 1))
    return c
  }, [rows])

  const onExport = (s: 'active' | 'all') =>
    startTransition(async () => {
      const res = await exportClergyXlsx(s)
      if (res.success) download(res.fileName, res.base64)
      else setMsg(res.error)
    })

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Users className="text-blue-600" /> Schematizmus kňazov
          </h1>
          <p className="text-gray-500 mt-1">
            Register kňazov, diakonov a bohoslovcov Žilinskej diecézy – zdroj pravdy o pôsobení. Akademický rok {currentAcademicYear()}/{currentAcademicYear() + 1}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/knazi/vyrocia" className={btnSecondary}>
            <CalendarHeart size={14} /> Výročia a meniny
          </Link>
          <Link href="/admin/knazi/kuria" className={btnSecondary}>
            <Landmark size={14} /> Kúria, rady a komisie
          </Link>
          <Link href="/admin/knazi/stitky" className={btnSecondary}>
            <Tags size={14} /> Adresné štítky
          </Link>
          <button type="button" onClick={() => onExport('active')} disabled={pending} className={btnSecondary}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Export – v službe
          </button>
          <button type="button" onClick={() => onExport('all')} disabled={pending} className={btnSecondary}>
            <FileSpreadsheet size={14} /> Export – všetci
          </button>
          <button type="button" onClick={() => setCreating(true)} className={btnPrimary}>
            <Plus size={16} /> Nová osoba
          </button>
        </div>
      </div>

      {msg && <Notice kind="error">{msg}</Notice>}

      {/* legenda farieb = filter */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTone('all')} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${tone === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600'}`}>
          Všetky farby
        </button>
        {(Object.keys(TONE_CLASS) as Tone[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTone(tone === t ? 'all' : t)}
            className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${TONE_CLASS[t].badge} ${tone === t ? 'ring-2 ring-offset-1 ring-gray-900' : ''}`}
          >
            {TONE_CLASS[t].label} · {counts[t] ?? 0}
          </button>
        ))}
      </div>

      <div className={`${cardCls} space-y-4`}>
        <div className="flex flex-col md:flex-row gap-3">
          <label className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Meno, farnosť, funkcia, osobné číslo…" className={`${inputCls} pl-11`} />
          </label>
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className={`${inputCls} md:w-56`}>
            <option value="service">V službe (bez archívu)</option>
            <option value="archive">Archív – odišli, zomrelí</option>
            <option value="all">Všetci</option>
          </select>
          <select value={deanery} onChange={(e) => setDeanery(e.target.value)} className={`${inputCls} md:w-56`}>
            <option value="all">Všetky dekanáty</option>
            {deaneries.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-gray-500 font-mono">Zobrazené: {filtered.length} z {rows.length}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="py-3 px-2">Meno</th>
                <th className="py-3 px-2">Stav</th>
                <th className="py-3 px-2">Funkcia</th>
                <th className="py-3 px-2">Miesto</th>
                <th className="py-3 px-2">Dekanát</th>
                <th className="py-3 px-2">Kontakt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => {
                const t = TONE_CLASS[r.tone]
                const year = r.category === 'seminarian' ? seminaryYearLabel(seminaryYear(r.seminary_entry_year, r.seminary_year_offset)) : null
                return (
                  <tr key={r.id} className={`${t.row} hover:bg-blue-50/50 transition-colors`}>
                    <td className="py-2.5 px-2">
                      <Link href={`/admin/knazi/${r.id}`} className="font-bold text-gray-900 hover:text-blue-600">
                        {r.last_name} {r.first_name}
                      </Link>
                      <div className="text-[11px] text-gray-500">
                        {clergyDisplayName(r)}
                        {r.religious_order ? ` · ${r.religious_order}` : ''}
                        {r.personal_number ? ` · č. ${r.personal_number}` : ''}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-bold ${t.badge}`}>
                        {r.status === 'active' ? CATEGORY_LABEL[r.category] : STATUS_LABEL[r.status]}
                      </span>
                      {year && <div className="text-[11px] text-violet-700 font-bold mt-0.5">{year}</div>}
                    </td>
                    <td className="py-2.5 px-2 text-gray-700">{r.primary_role ?? '—'}</td>
                    <td className="py-2.5 px-2 text-gray-700">{r.primary_place ?? '—'}</td>
                    <td className="py-2.5 px-2 text-gray-500">{r.deanery_name ?? '—'}</td>
                    <td className="py-2.5 px-2 text-[11px] text-gray-500">
                      {r.work_email && <div>{r.work_email}</div>}
                      {r.phones[0] && <div>{r.phones[0]}</div>}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">Nič sa nenašlo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {creating && <CreateDialog onClose={() => setCreating(false)} onCreated={(id) => router.push(`/admin/knazi/${id}`)} />}
    </div>
  )
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [category, setCategory] = useState<ClergyCategory>('seminarian')
  const [entry, setEntry] = useState(String(currentAcademicYear()))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () =>
    startTransition(async () => {
      const res = await createClergy({ first_name: first, last_name: last, category, seminary_entry_year: category === 'seminarian' ? Number(entry) || null : null })
      if (res.success) onCreated(res.id)
      else setError(res.error)
    })

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${cardCls} w-full max-w-md space-y-4`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Nová osoba</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Meno"><input value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} /></Field>
          <Field label="Priezvisko"><input value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Kategória">
          <select value={category} onChange={(e) => setCategory(e.target.value as ClergyCategory)} className={inputCls}>
            {(Object.keys(CATEGORY_LABEL) as ClergyCategory[]).map((k) => (
              <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
            ))}
          </select>
        </Field>
        {category === 'seminarian' && (
          <Field label="Rok nástupu (akademický rok)" hint={`${entry}/${Number(entry) + 1} = 1. (propedeutický) ročník; ďalej sa ročník zvyšuje sám k 1. 9.`}>
            <input value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
        )}
        {error && <Notice kind="error">{error}</Notice>}
        <button type="button" onClick={submit} disabled={pending} className={`${btnPrimary} w-full`}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Založiť a doplniť údaje
        </button>
      </div>
    </div>
  )
}
