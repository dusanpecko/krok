'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, Loader2, RefreshCw, Save, Sparkles, Pencil, X, Check } from 'lucide-react'
import { exportTargets, generateTargets, saveTargetSettings, updateTarget, type TargetRow, type TargetsOverview } from '@/app/admin/farnosti/predpisy/actions'
import { btnPrimary, btnSecondary, cardCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

const eur = (n: number | null) => (n == null ? '—' : n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }))

function Progress({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-gray-300">—</span>
  const w = Math.min(100, pct)
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-400'
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${w}%` }} /></div>
      <span className="font-mono text-xs w-12 text-right">{pct} %</span>
    </div>
  )
}

export default function TargetsView({ overview }: { overview: TargetsOverview }) {
  const router = useRouter()
  const { year, settings, rows } = overview
  const [rate, setRate] = useState(String(settings?.rate_per_catholic ?? 2))
  const [statsYear, setStatsYear] = useState(String(settings?.stats_year ?? 2021))
  const [rounding, setRounding] = useState(String(settings?.rounding ?? 1))
  const [note, setNote] = useState(settings?.note ?? '')
  const [msg, setMsg] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const generated = rows.filter((r) => r.target_id)
  const totals = useMemo(() => ({
    prescribed: generated.reduce((a, r) => a + (r.prescribed_amount ?? 0), 0),
    collected: rows.reduce((a, r) => a + r.collected_amount, 0),
    catholics: rows.reduce((a, r) => a + (r.catholics ?? r.catholics_now ?? 0), 0),
  }), [rows, generated])
  const filtered = rows.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.deanery ?? '').toLowerCase().includes(q.toLowerCase()))

  const run = (fn: () => Promise<void>) => startTransition(fn)

  const saveSettings = () =>
    run(async () => {
      const res = await saveTargetSettings({ year, rate_per_catholic: Number(rate.replace(',', '.')), stats_year: Number(statsYear), rounding: Number(rounding), note: note || null })
      setMsg(res.success ? { kind: 'success', text: `Nastavenie pre rok ${year} bolo uložené.` } : { kind: 'error', text: res.error })
      if (res.success) router.refresh()
    })

  const generate = (mode: 'missing' | 'recalculate') =>
    run(async () => {
      if (mode === 'recalculate' && !confirm(`Prepočítať predpisy ${year} podľa aktuálneho koeficientu a štatistiky? Ručne upravené predpisy (s dôvodom) sa nezmenia.`)) return
      const res = await generateTargets(year, mode)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      setMsg({
        kind: 'success',
        text: `Nových predpisov: ${res.created}${mode === 'recalculate' ? `, prepočítaných: ${res.updated}` : ''}.${res.skipped.length ? ` Bez štatistiky (preskočené): ${res.skipped.join(', ')}.` : ''}`,
      })
      router.refresh()
    })

  const download = () =>
    run(async () => {
      const res = await exportTargets(year)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a')
      a.href = url
      a.download = res.fileName
      a.click()
      URL.revokeObjectURL(url)
    })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {overview.years.map((y) => (
          <Link key={y} href={`/admin/farnosti/predpisy?rok=${y}`} className={`px-4 py-2 rounded-xl text-sm font-bold ${y === year ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}>
            {y}
          </Link>
        ))}
      </div>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className={cardCls}>
        <SectionTitle title={`Nastavenie ${year}`} description="Koeficient platí pre všetky farnosti (O24); štatistika sa mení len pri sčítaní ľudu (O17)." />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <Field label="€ na katolíka"><input value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} inputMode="decimal" /></Field>
          <Field label="Rok štatistiky"><input value={statsYear} onChange={(e) => setStatsYear(e.target.value)} className={inputCls} inputMode="numeric" /></Field>
          <Field label="Zaokrúhliť na €"><input value={rounding} onChange={(e) => setRounding(e.target.value)} className={inputCls} inputMode="numeric" /></Field>
          <Field label="Poznámka" className="md:col-span-2"><input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={saveSettings} disabled={pending} className={btnSecondary}><Save size={14} /> Uložiť nastavenie</button>
          <button onClick={() => generate('missing')} disabled={pending || !settings} className={btnPrimary}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Vygenerovať chýbajúce predpisy
          </button>
          {generated.length > 0 && (
            <button onClick={() => generate('recalculate')} disabled={pending} className={btnSecondary}><RefreshCw size={14} /> Prepočítať neupravené</button>
          )}
          <button onClick={download} disabled={pending} className={btnSecondary}><Download size={14} /> Export XLSX</button>
        </div>
        {!settings && <p className="text-xs text-amber-700 mt-3">Pre rok {year} ešte nie je uložené nastavenie – najprv ho uložte.</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Farností s predpisom" value={`${generated.length} / ${rows.length}`} />
        <Kpi label="Predpis spolu" value={eur(totals.prescribed)} />
        <Kpi label={`Vybrané ${year}`} value={eur(totals.collected)} />
        <Kpi label="Plnenie diecézy" value={totals.prescribed ? `${Math.round((1000 * totals.collected) / totals.prescribed) / 10} %` : '—'} />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="p-4 border-b border-gray-50">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať farnosť alebo dekanát…" className={`${inputCls} max-w-sm`} />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
              <th className="px-5 py-3">Farnosť</th>
              <th className="px-5 py-3">Dekanát</th>
              <th className="px-5 py-3 text-right">Katolíci</th>
              <th className="px-5 py-3 text-right">Predpis</th>
              <th className="px-5 py-3 text-right">Vybrané</th>
              <th className="px-5 py-3 text-right">Darcovia</th>
              <th className="px-5 py-3 text-right">Plnenie</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((r) => (
              <Row key={r.parish_id} r={r} editing={editing !== null && editing === r.target_id} onEdit={() => setEditing(r.target_id)} onDone={() => { setEditing(null); router.refresh() }} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ r, editing, onEdit, onDone }: { r: TargetRow; editing: boolean; onEdit: () => void; onDone: () => void }) {
  const [value, setValue] = useState(String(r.prescribed_amount ?? ''))
  const [reason, setReason] = useState(r.override_reason ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const save = () =>
    startTransition(async () => {
      const res = await updateTarget(r.target_id!, Number(value.replace(',', '.')), reason)
      if (res.success) onDone()
      else setErr(res.error)
    })

  return (
    <tr className="hover:bg-blue-50/20 align-top">
      <td className="px-5 py-3">
        <Link href={`/admin/farnosti/${r.parish_id}`} className="font-bold text-gray-900 hover:text-blue-600">{r.name}</Link>
        {r.override_reason && !editing && <div className="text-[11px] text-amber-700 mt-0.5">upravené: {r.override_reason}</div>}
      </td>
      <td className="px-5 py-3 text-gray-600">{r.deanery ?? '—'}</td>
      <td className="px-5 py-3 text-right font-mono">{(r.catholics ?? r.catholics_now) ? (r.catholics ?? r.catholics_now)!.toLocaleString('sk-SK') : <span className="text-amber-600 font-sans text-xs font-bold">bez štatistiky</span>}</td>
      <td className="px-5 py-3 text-right font-mono">
        {editing ? (
          <div className="space-y-1 min-w-[220px]">
            <input value={value} onChange={(e) => setValue(e.target.value)} className={`${inputCls} py-1.5 text-right`} inputMode="decimal" autoFocus />
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} py-1.5 text-xs font-sans`} placeholder={`Dôvod (výpočet ${eur(r.calculated_amount)})`} />
            {err && <div className="text-[11px] text-red-600 font-sans text-left">{err}</div>}
          </div>
        ) : (
          <>
            {eur(r.prescribed_amount)}
            {r.prescribed_amount != null && r.calculated_amount != null && r.prescribed_amount !== r.calculated_amount && (
              <div className="text-[10px] text-gray-400">výpočet {eur(r.calculated_amount)}</div>
            )}
          </>
        )}
      </td>
      <td className="px-5 py-3 text-right font-mono font-bold text-green-700">{r.collected_amount ? eur(r.collected_amount) : '—'}</td>
      <td className="px-5 py-3 text-right font-mono">{r.donors_count || '—'}</td>
      <td className="px-5 py-3"><Progress pct={r.fulfillment_pct} /></td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        {r.target_id && (editing ? (
          <>
            <button onClick={save} disabled={pending} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Uložiť">{pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
            <button onClick={onDone} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg" title="Zrušiť"><X size={14} /></button>
          </>
        ) : (
          <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Upraviť predpis"><Pencil size={14} /></button>
        ))}
      </td>
    </tr>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</div>
      <div className="text-xl font-black text-gray-900 mt-1">{value}</div>
    </div>
  )
}
