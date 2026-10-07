'use client'

import { useState, useTransition } from 'react'
import ParishBoxZoneTab from './ParishBoxZoneTab'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Church, Loader2, Save, Send, Clock, CheckCircle2, XCircle, Info, Eye, ArrowLeft, Globe, Upload, X } from 'lucide-react'
import {
  saveMySchedule,
  submitParishChange,
  submitPopulationChange,
  updateMyPresentation,
  type MyParishView,
} from '@/app/moja-farnost/actions'
import ParishScheduleTab from '@/components/admin/parishes/ParishScheduleTab'
import ParishPostsTab from '@/components/parish-zone/ParishPostsTab'
import ParishSacramentsTab from '@/components/parish-zone/ParishSacramentsTab'
import { getMyParishTraffic, deleteMyPost, setMyWebVisibility, saveMyPost, saveMySacrament, saveMySocialLinks, uploadMyEditorImage, uploadMyParishFile } from '@/app/moja-farnost/web-actions'
import SocialLinksEditor from '@/components/parishes/SocialLinksEditor'
import ParishTrafficCard from '@/components/parishes/ParishTrafficCard'
import { FIELD_LABEL, PROTECTED_PARISH_FIELDS } from '@/lib/parishes/fields'
import type { VillageWithStats } from '@/lib/parishes/types'
import type { ParishClergyEntry } from '@/lib/parishes/parish-clergy'
import { clergyName } from '@/lib/parishes/format'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

type TabKey = 'overview' | 'traffic' | 'official' | 'presentation' | 'schedule' | 'posts' | 'sacraments' | 'population' | 'clergy'

const POST_ACTIONS = { save: saveMyPost, remove: deleteMyPost, upload: uploadMyParishFile, uploadEditorImage: uploadMyEditorImage }

const eur = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }))
type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null

export default function ParishZoneView({ view }: { view: MyParishView }) {
  const isAdmin = view.role === 'admin'
  const tabs: { key: TabKey; label: string }[] = [
    ...(isAdmin ? [{ key: 'overview' as const, label: 'Prehľad a e-zvonček' }] : []),
    { key: 'traffic', label: 'Návštevnosť' },
    { key: 'schedule', label: 'Bohoslužby a úradné hodiny' },
    { key: 'posts', label: 'Oznamy a aktuality' },
    { key: 'presentation', label: 'Prezentácia' },
    { key: 'sacraments', label: 'Sviatosti' },
    { key: 'official', label: 'Úradné údaje' },
    { key: 'population', label: 'Obce a štatistika' },
    { key: 'clergy', label: 'Kňazi' },
  ]
  const [tab, setTab] = useState<TabKey>(tabs[0].key)
  const p = view.parish
  const pending = view.requests.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-6">
      {view.impersonating && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm">
          <span className="flex items-center gap-2 font-bold">
            <Eye size={16} /> Ste prihlásený ako farnosť (náhľad biskupského úradu). Zmeny sa uložia naostro a v histórii budú pod vaším menom.
          </span>
          <Link href={`/admin/farnosti/${p.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 font-black hover:bg-amber-100">
            <ArrowLeft size={14} /> Späť do adminu
          </Link>
        </div>
      )}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Church className="w-7 h-7 text-blue-600" /> {p.official_name ?? p.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {view.deaneryName ? `Dekanát ${view.deaneryName}` : ''}
            {pending > 0 && <span className="ml-3 font-bold text-amber-600">{pending} návrh(y) čaká na schválenie</span>}
          </p>
        </div>
        {p.slug && (
          <a href={`/farnosti/${p.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:border-blue-300 hover:bg-blue-50">
            <Globe size={14} /> {p.visible_on_web ? 'Stránka farnosti' : 'Náhľad stránky (zatiaľ nezverejnená)'}
          </a>
        )}
      </div>

      <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap cursor-pointer ${tab === t.key ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-10">
          <OverviewTab view={view} />
          <ParishBoxZoneTab parishId={p.id} parishSlug={p.slug} />
        </div>
      )}
      {tab === 'schedule' && <ParishScheduleTab parishId={p.id} schedules={view.schedules} villages={view.villages} save={saveMySchedule} />}
      {tab === 'traffic' && <ParishTrafficCard parishId={p.id} load={getMyParishTraffic} />}
      {tab === 'posts' && <ParishPostsTab parishId={p.id} parishSlug={p.slug} posts={view.posts} actions={POST_ACTIONS} />}
      {tab === 'sacraments' && <ParishSacramentsTab parishId={p.id} rows={view.sacraments} save={saveMySacrament} />}
      {tab === 'presentation' && (
        <div className="space-y-6">
          <WebVisibilityCard view={view} />
          <PresentationTab view={view} />
          <SocialLinksEditor parishId={p.id} initial={p.social_links ?? []} save={saveMySocialLinks} />
        </div>
      )}
      {tab === 'official' && <OfficialTab view={view} />}
      {tab === 'population' && <PopulationTab view={view} />}
      {tab === 'clergy' && <ClergyTab clergy={view.clergy} />}
    </div>
  )
}

// ------------------------------------------------------------ Prehľad

function OverviewTab({ view }: { view: MyParishView }) {
  const year = new Date().getFullYear()
  const now = view.summary.find((s) => s.year === year)
  const pct = now?.prescribed_amount ? Math.round((1000 * now.collected_amount) / now.prescribed_amount) / 10 : null
  const history = view.summary.filter((s) => s.donations_count > 0 || s.prescribed_amount != null)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label={`Predpis ${year}`} value={eur(now?.prescribed_amount)} />
        <Kpi label={`Vybrané ${year}`} value={eur(now?.collected_amount ?? 0)} />
        <Kpi label="Plnenie" value={pct != null ? `${pct} %` : '—'} />
        <Kpi label="Darcovia z farnosti" value={String(view.donorsCount)} />
      </div>
      {pct != null && (
        <div className={cardCls}>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">Predpis = počet katolíkov vo farnosti × koeficient diecézy. Započítavajú sa dary darcov, ktorí si zvolili vašu farnosť.</p>
        </div>
      )}
      <div className={cardCls}>
        <SectionTitle title="Prínos farnosti po rokoch" description="Len súhrnné čísla – mená ani sumy jednotlivých darcov sa nezobrazujú." />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
              <th className="py-2">Rok</th><th className="py-2 text-right">Darcovia</th><th className="py-2 text-right">Vybrané</th><th className="py-2 text-right">Predpis</th><th className="py-2 text-right">Plnenie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {history.map((s) => (
              <tr key={s.year}>
                <td className="py-2 font-bold">{s.year}</td>
                <td className="py-2 text-right font-mono">{s.donors_count}</td>
                <td className="py-2 text-right font-mono font-bold text-green-700">{eur(s.collected_amount)}</td>
                <td className="py-2 text-right font-mono">{eur(s.prescribed_amount)}</td>
                <td className="py-2 text-right font-mono">{s.fulfillment_pct != null ? `${s.fulfillment_pct} %` : '—'}</td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Zatiaľ bez darov.</td></tr>}
          </tbody>
        </table>
      </div>
      <RequestsList view={view} />
    </div>
  )
}

function RequestsList({ view }: { view: MyParishView }) {
  if (!view.requests.length) return null
  const icon = { pending: <Clock size={14} className="text-amber-500" />, approved: <CheckCircle2 size={14} className="text-emerald-600" />, rejected: <XCircle size={14} className="text-red-500" /> }
  const label = { pending: 'Čaká na schválenie', approved: 'Schválené', rejected: 'Zamietnuté' }
  return (
    <div className={cardCls}>
      <SectionTitle title="Vaše návrhy zmien" />
      <ul className="divide-y divide-gray-50 text-sm">
        {view.requests.map((r) => (
          <li key={r.id} className="py-3">
            <div className="flex items-center gap-2 font-bold">{icon[r.status]} {label[r.status]} <span className="text-xs font-mono text-gray-400 font-normal">{new Date(r.submitted_at).toLocaleDateString('sk-SK')}</span></div>
            <div className="text-xs text-gray-600 mt-1">
              {r.entity === 'population'
                ? 'Oprava štatistiky veriacich'
                : Object.keys(r.payload).filter((k) => k !== '_note').map((k) => `${FIELD_LABEL[k] ?? k}: ${String(r.payload[k] ?? '—')}`).join(' · ')}
            </div>
            {r.review_note && <div className="text-xs text-red-600 mt-1">Dôvod: {r.review_note}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ------------------------------------------------------------ Úradné údaje (len návrh)

function OfficialTab({ view }: { view: MyParishView }) {
  const router = useRouter()
  const p = view.parish as unknown as Record<string, unknown>
  const fields = PROTECTED_PARISH_FIELDS.filter((f) => f !== 'deanery_id')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f, p[f] == null ? '' : String(p[f])])))
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, startTransition] = useTransition()

  const submit = () =>
    startTransition(async () => {
      const res = await submitParishChange(view.parish.id, form, note)
      if (res.success) {
        setMsg({ kind: 'success', text: 'Návrh bol odoslaný na schválenie biskupskému úradu.' })
        setEditing(false)
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })

  return (
    <div className={`${cardCls} space-y-4`}>
      <SectionTitle title="Úradné údaje farnosti" description="Register biskupského úradu. Zmenu môžete navrhnúť – po schválení sa premietne." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Dekanát"><div className={`${inputCls} bg-gray-100`}>{view.deaneryName ?? '—'}</div></Field>
        {fields.map((f) => (
          <Field key={f} label={FIELD_LABEL[f] ?? f}>
            {editing ? (
              <input value={form[f]} onChange={(e) => setForm((x) => ({ ...x, [f]: e.target.value }))} className={inputCls} />
            ) : (
              <div className={`${inputCls} bg-gray-100 min-h-[46px]`}>{form[f] || <span className="text-gray-400">—</span>}</div>
            )}
          </Field>
        ))}
      </div>
      {view.role !== 'admin' ? (
        <p className="text-xs text-gray-500 flex items-center gap-1"><Info size={12} /> Zmenu úradných údajov navrhuje správca účtu farnosti.</p>
      ) : editing ? (
        <div className="space-y-3">
          <Field label="Poznámka pre biskupský úrad (nepovinné)"><input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} /></Field>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className={btnSecondary}>Zrušiť</button>
            <button onClick={submit} disabled={pending} className={btnPrimary}>{pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Odoslať na schválenie</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end"><button onClick={() => setEditing(true)} className={btnSecondary}>Požiadať o zmenu</button></div>
      )}
    </div>
  )
}

// ------------------------------------------------------------ Prezentácia (hneď)

/** Verejná stránka zapnutá / len základná stránka – mení správca farnosti. */
function WebVisibilityCard({ view }: { view: MyParishView }) {
  const router = useRouter()
  const p = view.parish
  const canEdit = view.role === 'admin'
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, startTransition] = useTransition()
  const toggle = (visible: boolean) =>
    startTransition(async () => {
      const res = await setMyWebVisibility(p.id, visible)
      if (res.success) {
        setMsg({ kind: 'success', text: visible ? 'Stránka farnosti je zverejnená.' : 'Verejne sa zobrazuje len základná stránka.' })
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })
  return (
    <div className={`${cardCls} space-y-4`}>
      <SectionTitle
        title="Verejná stránka farnosti"
        description="Kým stránka nie je zapnutá, návštevníci vidia základnú stránku: kontakt na farský úrad, kňazov, obce, vyplnené bohoslužby a tlačidlo na podporu. Oznamy, aktuality a sviatosti sa zobrazia až po zapnutí – dovtedy ich vidíte v náhľade len vy a biskupský úrad."
      />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <label className={`flex items-center gap-2 text-sm font-bold text-gray-700 ${canEdit ? 'cursor-pointer' : 'opacity-60'}`}>
        <input type="checkbox" checked={p.visible_on_web} disabled={pending || !canEdit} onChange={(e) => toggle(e.target.checked)} className={checkboxCls} />
        Verejná stránka farnosti zapnutá
        {pending && <Loader2 size={14} className="animate-spin" />}
      </label>
      {!canEdit && <p className="text-xs text-gray-500">Zapnúť ju môže správca farnosti.</p>}
    </div>
  )
}

function PresentationTab({ view }: { view: MyParishView }) {
  const router = useRouter()
  const p = view.parish
  const [form, setForm] = useState({
    intro: p.intro ?? '', feast_day: p.feast_day ?? '', feast_day_note: p.feast_day_note ?? '',
    adoration_date: p.adoration_date ?? '', adoration_note: p.adoration_note ?? '',
    latitude: p.latitude != null ? String(p.latitude) : '', longitude: p.longitude != null ? String(p.longitude) : '',
    image_url: p.image_url ?? '', logo_url: p.logo_url ?? '',
  })
  const [uploading, setUploading] = useState<'image_url' | 'logo_url' | null>(null)
  const uploadPhoto = async (file: File, field: 'image_url' | 'logo_url' = 'image_url') => {
    setUploading(field)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadMyParishFile(p.id, fd)
    setUploading(null)
    if (res.url && !file.type.includes('pdf')) set(field, res.url)
    else setMsg({ kind: 'error', text: res.error ?? 'Nahrajte obrázok (JPG, PNG, WebP).' })
  }
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, startTransition] = useTransition()
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const save = () =>
    startTransition(async () => {
      const res = await updateMyPresentation(p.id, form)
      if (res.success) {
        setMsg({ kind: 'success', text: 'Uložené.' })
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })
  return (
    <div className={`${cardCls} space-y-4`}>
      <SectionTitle title="Prezentácia farnosti" description="Text a sviatky pre verejnú stránku farnosti – ukladajú sa hneď." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Field label="Krátky text o farnosti"><textarea value={form.intro} onChange={(e) => set('intro', e.target.value)} rows={4} className={inputCls} /></Field>
      <Field label="Titulná fotka (farský kostol)" hint="Zobrazí sa v hlavičke stránky farnosti. Ideálne na šírku, aspoň 1600 px.">
        {form.image_url ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.image_url} alt="" className="h-16 w-28 object-cover rounded-lg border" />
            <button type="button" onClick={() => set('image_url', '')} className={btnSecondary}><X size={14} /> Odstrániť</button>
          </div>
        ) : (
          <label className={`${btnSecondary} w-fit`}>
            {uploading === 'image_url' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Nahrať fotku
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
          </label>
        )}
      </Field>
      <Field label="Erb alebo logo farnosti" hint="Zobrazí sa v hlavičke stránky namiesto titulnej fotky. Najlepšie PNG s priehľadným pozadím, štvorcové, aspoň 400 px.">
        {form.logo_url ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.logo_url} alt="" className="h-16 w-16 object-contain rounded-lg border bg-gray-50 p-1" />
            <button type="button" onClick={() => set('logo_url', '')} className={btnSecondary}><X size={14} /> Odstrániť</button>
          </div>
        ) : (
          <label className={`${btnSecondary} w-fit`}>
            {uploading === 'logo_url' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Nahrať erb / logo
            <input type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], 'logo_url')} />
          </label>
        )}
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Hody (dátum)"><input type="date" value={form.feast_day} onChange={(e) => set('feast_day', e.target.value)} className={inputCls} /></Field>
        <Field label="Hody – poznámka" hint="Ak je sviatok pohyblivý."><input value={form.feast_day_note} onChange={(e) => set('feast_day_note', e.target.value)} className={inputCls} /></Field>
        <Field label="Výročná celodenná poklona (dátum)"><input type="date" value={form.adoration_date} onChange={(e) => set('adoration_date', e.target.value)} className={inputCls} /></Field>
        <Field label="Výročná poklona – poznámka"><input value={form.adoration_note} onChange={(e) => set('adoration_note', e.target.value)} className={inputCls} placeholder="1. septembrová nedeľa" /></Field>
        <Field label="GPS šírka (farský kostol)"><input value={form.latitude} onChange={(e) => set('latitude', e.target.value)} className={inputCls} inputMode="decimal" /></Field>
        <Field label="GPS dĺžka"><input value={form.longitude} onChange={(e) => set('longitude', e.target.value)} className={inputCls} inputMode="decimal" /></Field>
      </div>
      <div className="flex justify-end"><button onClick={save} disabled={pending || uploading !== null} className={btnPrimary}>{pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť</button></div>
    </div>
  )
}

// ------------------------------------------------------------ Obce a štatistika (len návrh)

function PopulationTab({ view }: { view: MyParishView }) {
  const router = useRouter()
  const [rows, setRows] = useState<VillageWithStats[]>(view.villages)
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, startTransition] = useTransition()
  const num = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v.replace(/\s/g, ''))) || 0))
  const update = (i: number, patch: Partial<VillageWithStats>) => setRows((r) => r.map((v, j) => (j === i ? { ...v, ...patch } : v)))
  const catholics = rows.reduce((a, v) => a + (v.catholics ?? 0), 0)
  const population = rows.reduce((a, v) => a + (v.population ?? 0), 0)

  const submit = () =>
    startTransition(async () => {
      const res = await submitPopulationChange(view.parish.id, rows, note)
      if (res.success) {
        setMsg({ kind: 'success', text: 'Návrh opravy štatistiky bol odoslaný na schválenie.' })
        setEditing(false)
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })

  return (
    <div className={`${cardCls} space-y-4`}>
      <SectionTitle title="Obce a štatistika veriacich" description="Podľa sčítania SODB 2021 – základ predpisu. Opravu môžete navrhnúť, mení ju biskupský úrad." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
            <th className="py-2">Obec</th><th className="py-2 text-right w-32">Obyvatelia</th><th className="py-2 text-right w-32">Katolíci</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((v, i) => (
            <tr key={v.id ?? i}>
              <td className="py-2">{editing ? <input value={v.name} onChange={(e) => update(i, { name: e.target.value })} className={`${inputCls} py-1.5`} /> : v.name}</td>
              <td className="py-2 text-right font-mono">{editing ? <input value={v.population ?? ''} onChange={(e) => update(i, { population: num(e.target.value) })} className={`${inputCls} py-1.5 text-right`} /> : v.population?.toLocaleString('sk-SK') ?? '—'}</td>
              <td className="py-2 text-right font-mono">{editing ? <input value={v.catholics ?? ''} onChange={(e) => update(i, { catholics: num(e.target.value) })} className={`${inputCls} py-1.5 text-right`} /> : v.catholics?.toLocaleString('sk-SK') ?? '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-100 font-black"><td className="py-3">Spolu</td><td className="py-3 text-right font-mono">{population.toLocaleString('sk-SK')}</td><td className="py-3 text-right font-mono">{catholics.toLocaleString('sk-SK')}</td></tr>
        </tfoot>
      </table>
      {view.role === 'admin' && (editing ? (
        <div className="space-y-3">
          <button onClick={() => setRows((r) => [...r, { name: '', is_seat: false, district: null, church_name: null, has_church: true, population: null, catholics: null, source: null }])} className={btnSecondary}>Pridať obec</button>
          <Field label="Zdôvodnenie / zdroj údajov"><input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} /></Field>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setRows(view.villages); setEditing(false) }} className={btnSecondary}>Zrušiť</button>
            <button onClick={submit} disabled={pending} className={btnPrimary}>{pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Odoslať na schválenie</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end"><button onClick={() => setEditing(true)} className={btnSecondary}>Navrhnúť opravu</button></div>
      ))}
    </div>
  )
}

// ------------------------------------------------------------ Kňazi (z registra kňazov – len na čítanie, O48)

function ClergyTab({ clergy }: { clergy: ParishClergyEntry[] }) {
  return (
    <div className={`${cardCls} space-y-4`}>
      <SectionTitle
        title="Kňazi vo farnosti"
        description="Zoznam vedie biskupský úrad v registri kňazov. Na stránke farnosti sa zobrazí meno, tituly a funkcia. Ak niečo nesedí, napíšte na mojkrok@dcza.sk."
      />
      <div className="divide-y divide-gray-50">
        {clergy.map((c) => (
          <div key={c.clergy_id} className="py-3 flex items-center justify-between gap-3">
            <div className="font-bold text-gray-900">{clergyName(c)}</div>
            <div className={`text-sm ${c.is_head ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{c.position}</div>
          </div>
        ))}
        {clergy.length === 0 && <p className="py-6 text-center text-gray-400 text-sm">Bez záznamu.</p>}
      </div>
    </div>
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
