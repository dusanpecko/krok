'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Loader2, Plus, Printer, Search, Settings, XCircle } from 'lucide-react'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'
import { issueCelebretsBulk, reviewPhotoRequest, type CelebretOverviewRow } from '@/app/admin/knazi/celebrety/actions'
import type { CelebretSettings } from '@/lib/clergy/celebret'

type Filter = 'all' | 'none' | 'expiring' | 'invalid' | 'valid' | 'nophoto'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Všetci' },
  { key: 'none', label: 'Bez celebretu' },
  { key: 'expiring', label: 'Končí do 30 dní' },
  { key: 'invalid', label: 'Neplatný (vypršal / zrušený)' },
  { key: 'valid', label: 'Platný' },
  { key: 'nophoto', label: 'Bez fotky' },
]
const fmt = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${Number(d)}. ${Number(m)}. ${y}`
}

/** Prehľad celebretov (K6): kto ho má, kto nie, čo končí; hromadné vydanie a tlač kariet; fotky od kňazov. */
export default function CelebretOverview({ rows, pendingPhotos, settings }: { rows: CelebretOverviewRow[]; pendingPhotos: { id: string; clergy_id: string; name: string; photo_url: string; created_at: string }[]; settings: CelebretSettings | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [issuedOn, setIssuedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [msg, setMsg] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null)

  const soon = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  }, [])
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, none: 0, expiring: 0, invalid: 0, valid: 0, nophoto: 0 }
    for (const r of rows) {
      if (!r.latest) c.none++
      else if (r.latest.state !== 'valid') c.invalid++
      else {
        c.valid++
        if (r.latest.valid_until <= soon) c.expiring++
      }
      if (!r.has_photo) c.nophoto++
    }
    return c
  }, [rows, soon])
  const shown = rows.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false
    if (filter === 'none') return !r.latest
    if (filter === 'expiring') return r.latest?.state === 'valid' && r.latest.valid_until <= soon
    if (filter === 'invalid') return !!r.latest && r.latest.state !== 'valid'
    if (filter === 'valid') return r.latest?.state === 'valid'
    if (filter === 'nophoto') return !r.has_photo
    return true
  })
  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.clergy_id))
  const selectedRows = rows.filter((r) => selected.has(r.clergy_id))
  const printable = selectedRows.filter((r) => r.latest?.state === 'valid').map((r) => r.latest!.id)
  const withoutPhoto = selectedRows.filter((r) => !r.has_photo).length

  const issue = () => {
    if (!confirm(`Vydať nový celebret ${selected.size} kňazom s dátumom ${fmt(issuedOn)}? Platnosť bude 1 rok.${withoutPhoto ? ` ${withoutPhoto} z nich nemá fotku – celebret bude bez fotky.` : ''}`)) return
    startTransition(async () => {
      setMsg(null)
      const res = await issueCelebretsBulk([...selected], issuedOn)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      setMsg({ kind: res.skipped ? 'info' : 'success', text: `Vydaných ${res.issued} celebretov${res.skipped ? `, preskočených ${res.skipped} (${res.errors.join(' ')})` : ''}.` })
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Link href="/admin/knazi" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Schematizmus kňazov
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Celebrety</h1>
          <p className="text-sm text-gray-500 mt-1">Digitálne celebrety kňazov – overenie cez QR, platnosť 1 rok od vydania (§ 16.9).</p>
        </div>
        <Link href="/admin/knazi/celebrety/nastavenia" className={btnSecondary}>
          <Settings size={15} /> Logo, pečiatka, podpis
        </Link>
      </div>
      {!settings && <Notice kind="info">Pred prvým vydaním nahrajte logo, pečiatku a podpis v nastaveniach celebretu.</Notice>}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {pendingPhotos.length > 0 && (
        <div className={cardCls}>
          <SectionTitle title={`Fotky od kňazov na schválenie (${pendingPhotos.length})`} description="Schválená fotka sa použije pri ďalšom vydaní celebretu." />
          <div className="mt-4 flex flex-wrap gap-4">
            {pendingPhotos.map((p) => (
              <div key={p.id} className="w-40 text-center rounded-2xl border border-gray-100 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photo_url} alt="" className="w-24 h-24 rounded-full object-cover mx-auto" />
                <Link href={`/admin/knazi/${p.clergy_id}`} className="block mt-2 text-xs font-bold text-gray-800 hover:text-blue-600">{p.name}</Link>
                <div className="flex justify-center gap-2 mt-2">
                  <button type="button" disabled={pending} onClick={() => startTransition(async () => { await reviewPhotoRequest(p.id, true); router.refresh() })} className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer" title="Schváliť"><CheckCircle2 size={18} /></button>
                  <button type="button" disabled={pending} onClick={() => { const r = prompt('Dôvod (uvidí ho kňaz):'); if (r !== null) startTransition(async () => { await reviewPhotoRequest(p.id, false, r); router.refresh() }) }} className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer" title="Zamietnuť"><XCircle size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={cardCls}>
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-xl text-sm font-bold border cursor-pointer ${filter === f.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať meno…" className={`${inputCls} pl-9`} />
          </div>
          <input type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} className={`${inputCls} w-auto`} title="Dátum vydania pri hromadnom vydaní" />
          <button type="button" disabled={pending || selected.size === 0} onClick={issue} className={btnPrimary}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Vydať vybraným ({selected.size})
          </button>
          <a
            href={printable.length ? `/celebret-tlac?ids=${printable.join(',')}` : undefined}
            target="_blank"
            aria-disabled={!printable.length}
            className={`${btnSecondary} ${printable.length ? '' : 'pointer-events-none opacity-40'}`}
          >
            <Printer size={15} /> Tlačiť karty ({printable.length})
          </a>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 w-8">
                <input type="checkbox" checked={allShownSelected} onChange={() => setSelected((s) => { const n = new Set(s); shown.forEach((r) => (allShownSelected ? n.delete(r.clergy_id) : n.add(r.clergy_id))); return n })} className={checkboxCls} />
              </th>
              <th className="py-2">Kňaz</th>
              <th className="py-2">Fotka</th>
              <th className="py-2">Celebret</th>
              <th className="py-2">Platí do</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {shown.map((r) => (
              <tr key={r.clergy_id} className="hover:bg-gray-50/50">
                <td className="py-2"><input type="checkbox" checked={selected.has(r.clergy_id)} onChange={() => toggle(r.clergy_id)} className={checkboxCls} /></td>
                <td className="py-2"><Link href={`/admin/knazi/${r.clergy_id}`} className="font-bold text-gray-900 hover:text-blue-600">{r.name}</Link>{r.status !== 'active' && <span className="ml-2 text-xs text-gray-400">{r.status === 'retired' ? 'na odpočinku' : 'na štúdiu'}</span>}</td>
                <td className="py-2">{r.has_photo ? <span className="text-emerald-600 font-bold">áno</span> : <span className="text-amber-600 font-bold">chýba</span>}</td>
                <td className="py-2">
                  {r.latest ? (
                    <span className={r.latest.state === 'valid' ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                      {r.latest.number} · {r.latest.state === 'valid' ? 'platný' : r.latest.state === 'revoked' ? 'zrušený' : 'vypršal'}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className={`py-2 ${r.latest?.state === 'valid' && r.latest.valid_until <= soon ? 'text-amber-600 font-bold' : 'text-gray-600'}`}>{r.latest ? fmt(r.latest.valid_until) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
