'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, AlertTriangle, ChevronRight, Loader2, X, Target, Newspaper, BookOpen } from 'lucide-react'
import { createParish } from '@/app/admin/farnosti/actions'
import { KIND_LABEL, type ParishKind, type ParishListItem } from '@/lib/parishes/types'
import { btnPrimary, btnSecondary, inputCls, Field, Notice } from '@/components/admin/projects/ui'

const eur = (n: number) => n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function ParishTable({ parishes, deaneries }: { parishes: ParishListItem[]; deaneries: { id: string; name: string }[] }) {
  const [q, setQ] = useState('')
  const [deanery, setDeanery] = useState('all')
  const [kind, setKind] = useState<'all' | ParishKind>('all')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const fq = fold(q.trim())
    return parishes.filter((p) => {
      if (deanery !== 'all' && (deanery === 'none' ? p.deanery_id : p.deanery_id !== deanery)) return false
      if (kind !== 'all' && p.kind !== kind) return false
      if (onlyMissing && p.missing.length === 0) return false
      if (!fq) return true
      return [p.name, p.official_name, p.city, p.parish_code, p.administrator_name].some((v) => v && fold(v).includes(fq))
    })
  }, [parishes, q, deanery, kind, onlyMissing])

  const totalCatholics = filtered.reduce((a, p) => a + (p.catholics ?? 0), 0)
  const totalDonors = filtered.reduce((a, p) => a + p.donors_count, 0)

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať názov, obec, kód, farára…" className={`${inputCls} pl-10`} />
        </div>
        <select value={deanery} onChange={(e) => setDeanery(e.target.value)} className={`${inputCls} lg:w-56 cursor-pointer`}>
          <option value="all">Všetky dekanáty</option>
          {deaneries.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          <option value="none">Bez dekanátu</option>
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as 'all' | ParishKind)} className={`${inputCls} lg:w-48 cursor-pointer`}>
          <option value="all">Farnosti aj duchovné správy</option>
          <option value="parish">Farnosti</option>
          <option value="chaplaincy">Duchovné správy</option>
        </select>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600 whitespace-nowrap cursor-pointer">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="w-4 h-4 rounded" />
          Len s chýbajúcimi údajmi
        </label>
        <Link href="/admin/farnosti/predpisy" className={btnSecondary}>
          <Target size={14} /> Predpisy
        </Link>
        <Link href="/admin/farnosti/prispevky" className={btnSecondary}>
          <Newspaper size={14} /> Príspevky
        </Link>
        <Link href="/admin/farnosti/sviatosti" className={btnSecondary}>
          <BookOpen size={14} /> Sviatosti
        </Link>
        <button type="button" onClick={() => setCreating(true)} className={btnPrimary}>
          <Plus size={16} /> Nová
        </button>
      </div>

      <p className="text-sm text-gray-500 font-mono px-2">
        Zobrazené: <span className="text-gray-900">{filtered.length}</span> z {parishes.length} · katolíci {totalCatholics.toLocaleString('sk-SK')} · darcovia {totalDonors}
      </p>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-5 py-4">Farnosť</th>
              <th className="px-5 py-4">Dekanát</th>
              <th className="px-5 py-4 text-right">Katolíci</th>
              <th className="px-5 py-4 text-right">Obce</th>
              <th className="px-5 py-4 text-right">Darcovia</th>
              <th className="px-5 py-4 text-right">Vybrané / predpis {new Date().getFullYear()}</th>
              <th className="px-5 py-4">Chýba</th>
              <th className="px-3 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/admin/farnosti/${p.id}`} className="font-bold text-gray-900 hover:text-blue-600">
                    {p.official_name ?? p.name}
                  </Link>
                  <div className="text-xs text-gray-400 flex gap-2 flex-wrap">
                    {p.kind !== 'parish' && <span className="font-bold text-purple-600">{KIND_LABEL[p.kind]}</span>}
                    {p.parish_code && <span className="font-mono">kód {p.parish_code}</span>}
                    {p.administrator_name && <span>{p.administrator_name}</span>}
                    {!p.is_active && <span className="font-bold text-red-500">neaktívna</span>}
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600">{p.deanery_name ?? '—'}</td>
                <td className="px-5 py-3 text-right font-mono">{p.catholics?.toLocaleString('sk-SK') ?? '—'}</td>
                <td className="px-5 py-3 text-right font-mono text-gray-500">{p.villages_count || '—'}</td>
                <td className="px-5 py-3 text-right font-mono">{p.donors_count || '—'}</td>
                <td className="px-5 py-3 text-right font-mono">
                  <span className="font-bold text-green-700">{p.collected_this_year ? eur(p.collected_this_year) : '—'}</span>
                  {p.prescribed_this_year != null && (
                    <div className="text-[10px] text-gray-400">
                      z {eur(p.prescribed_this_year)} · {p.prescribed_this_year ? Math.round((100 * p.collected_this_year) / p.prescribed_this_year) : 0} %
                    </div>
                  )}
                </td>
                <td className="px-5 py-3">
                  {p.missing.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                      <AlertTriangle size={11} /> {p.missing.join(', ')}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Link href={`/admin/farnosti/${p.id}`} className="text-gray-300 hover:text-blue-600"><ChevronRight size={18} /></Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">Nič sa nenašlo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && <CreateParishDialog deaneries={deaneries} onClose={() => setCreating(false)} />}
    </div>
  )
}

function CreateParishDialog({ deaneries, onClose }: { deaneries: { id: string; name: string }[]; onClose: () => void }) {
  const router = useRouter()
  const [name, setName] = useState('Farnosť ')
  const [kind, setKind] = useState<ParishKind>('parish')
  const [deaneryId, setDeaneryId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () =>
    startTransition(async () => {
      const res = await createParish({ name, kind, deanery_id: deaneryId || null })
      if (res.success) router.push(`/admin/farnosti/${res.id}`)
      else setError(res.error)
    })

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-gray-900">Nová farnosť / duchovná správa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="Názov"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus /></Field>
        <Field label="Typ">
          <select value={kind} onChange={(e) => setKind(e.target.value as ParishKind)} className={inputCls}>
            <option value="parish">Farnosť</option>
            <option value="chaplaincy">Duchovná správa</option>
            <option value="other">Iné</option>
          </select>
        </Field>
        <Field label="Dekanát">
          <select value={deaneryId} onChange={(e) => setDeaneryId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {deaneries.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <button onClick={submit} disabled={pending} className={`${btnPrimary} w-full`}>
          {pending && <Loader2 size={16} className="animate-spin" />} Založiť a doplniť údaje
        </button>
      </div>
    </div>
  )
}
