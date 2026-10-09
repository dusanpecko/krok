'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Loader2, Plus, Save, Star, Trash2, UserCog, X } from 'lucide-react'
import { btnIcon, btnIconDanger, btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'
import {
  addAssignment,
  deleteAssignment,
  endAssignment,
  promoteClergy,
  setPrimaryAssignment,
  updateClergy,
  type AssignmentInput,
  type ClergyDetail,
} from '@/app/admin/knazi/actions'
import {
  CATEGORY_LABEL,
  KIND_LABEL,
  ROLE_SUGGESTIONS,
  STATUS_LABEL,
  TONE_CLASS,
  assignmentPeriod,
  clergyDisplayName,
  clergyTone,
  isCurrent,
  seminaryYear,
  seminaryYearLabel,
  type AssignmentKind,
  type ClergyCategory,
  type ClergyEditField,
  type ClergyStatus,
} from '@/lib/clergy/types'

type Lookups = ClergyDetail['lookups']
type FieldDef = {
  key: ClergyEditField
  label: string
  type?: 'text' | 'date' | 'number' | 'textarea' | 'list' | 'select'
  options?: (l: Lookups) => { value: string; label: string }[]
  hint?: string
  wide?: boolean
}

const opt = <T extends string>(labels: Record<T, string>) => () => (Object.keys(labels) as T[]).map((k) => ({ value: k, label: labels[k] }))

const SECTIONS: Record<string, { title: string; description?: string; fields: FieldDef[] }[]> = {
  basic: [
    {
      title: 'Meno a tituly',
      fields: [
        { key: 'first_name', label: 'Meno' },
        { key: 'last_name', label: 'Priezvisko' },
        { key: 'title_before', label: 'Tituly pred menom', hint: 'Mgr., ThLic., ICDr.…' },
        { key: 'title_after', label: 'Tituly za menom', hint: 'PhD.…' },
        { key: 'ecclesiastical_titles', label: 'Cirkevné tituly', type: 'list', hint: 'Oddeľte čiarkou: Mons., honorárny dekan…' },
        { key: 'salutation', label: 'Oslovenie', type: 'select', options: () => ['Dp.', 'Vdp.', 'Vsdp.', 'Mons.'].map((v) => ({ value: v, label: v })) },
      ],
    },
    {
      title: 'Zaradenie',
      fields: [
        { key: 'category', label: 'Kategória', type: 'select', options: opt(CATEGORY_LABEL) },
        { key: 'status', label: 'Stav', type: 'select', options: opt(STATUS_LABEL) },
        { key: 'personal_number', label: 'Osobné číslo', hint: 'Prideľuje diecéza (O50)' },
        { key: 'religious_order_id', label: 'Rehoľa', type: 'select', options: (l) => l.orders.map((o) => ({ value: o.id, label: o.code })) },
        { key: 'origin', label: 'Pochádza', hint: 'Verejný údaj (schematizmus)' },
        { key: 'name_day', label: 'Meniny', hint: 'MM-DD, napr. 11-11' },
        { key: 'slug', label: 'Verejná adresa (schematizmus)', hint: 'priezvisko-meno-funkcia', wide: true },
        { key: 'note', label: 'Interná poznámka kúrie', type: 'textarea', wide: true },
      ],
    },
    {
      title: 'Bohoslovec',
      description: 'Ročník sa zvyšuje sám k 1. 9. Korekcia = opakovanie (−1) alebo rok praxe navyše (+1).',
      fields: [
        { key: 'seminary_entry_year', label: 'Rok nástupu (akademický)', type: 'number' },
        { key: 'seminary_year_offset', label: 'Korekcia ročníka', type: 'number' },
        { key: 'seminary', label: 'Seminár', hint: 'NR, Redemptoris Mater, Rím…' },
      ],
    },
  ],
  contacts: [
    {
      title: 'Kontakty (interné)',
      description: 'Kontakty kňaza sa verejne nezobrazujú (O47).',
      fields: [
        { key: 'work_email', label: 'Pracovný e-mail' },
        { key: 'private_email', label: 'Súkromný e-mail' },
        { key: 'phones', label: 'Telefóny', type: 'list', hint: 'Viac čísel oddeľte čiarkou' },
        { key: 'permanent_address', label: 'Trvalý pobyt', wide: true },
      ],
    },
  ],
  personal: [
    {
      title: 'Osobné údaje',
      fields: [
        { key: 'birth_date', label: 'Dátum narodenia', type: 'date' },
        { key: 'birth_place', label: 'Miesto narodenia' },
        { key: 'nationality', label: 'Národnosť' },
        { key: 'citizenship', label: 'Štátna príslušnosť', hint: 'SK, PL, CZ…' },
      ],
    },
    {
      title: 'Krst a birmovka',
      fields: [
        { key: 'baptism_date', label: 'Krst – dátum', type: 'date' },
        { key: 'baptism_place', label: 'Krst – miesto' },
        { key: 'confirmation_date', label: 'Birmovka – dátum', type: 'date' },
        { key: 'confirmation_place', label: 'Birmovka – miesto' },
      ],
    },
    {
      title: 'Vzdelanie',
      fields: [
        { key: 'education_secondary', label: 'Stredná škola' },
        { key: 'education_university', label: 'Vysoká škola' },
        { key: 'theology_from', label: 'Teológia od (rok)', type: 'number' },
        { key: 'theology_to', label: 'Teológia do (rok)', type: 'number' },
        { key: 'theology_place', label: 'Miesto štúdia teológie' },
        { key: 'postgraduate', label: 'Postgraduálne štúdium' },
        { key: 'education_other', label: 'Iné vzdelanie' },
        { key: 'languages', label: 'Jazyky', type: 'list', hint: 'en, de, it, pl…' },
      ],
    },
  ],
  ordination: [
    {
      title: 'Diakonát',
      fields: [
        { key: 'diaconate_date', label: 'Dátum', type: 'date' },
        { key: 'diaconate_place', label: 'Miesto' },
        { key: 'diaconate_ordainer_id', label: 'Svätiteľ', type: 'select', options: (l) => l.ordainers.map((o) => ({ value: o.id, label: o.name })) },
      ],
    },
    {
      title: 'Kňazská vysviacka (presbyterát)',
      fields: [
        { key: 'ordination_date', label: 'Dátum', type: 'date' },
        { key: 'ordination_place', label: 'Miesto' },
        { key: 'ordination_ordainer_id', label: 'Svätiteľ', type: 'select', options: (l) => l.ordainers.map((o) => ({ value: o.id, label: o.name })) },
      ],
    },
    {
      title: 'Žilinská diecéza a úmrtie',
      fields: [
        { key: 'in_diocese_from', label: 'V ŽD od', type: 'date' },
        { key: 'in_diocese_to', label: 'V ŽD do', type: 'date' },
        { key: 'death_date', label: 'Dátum úmrtia', type: 'date' },
        { key: 'death_place', label: 'Miesto úmrtia' },
      ],
    },
  ],
}

type TabKey = 'basic' | 'contacts' | 'assignments' | 'personal' | 'ordination' | 'log'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: 'Základné' },
  { key: 'assignments', label: 'Pôsobenie' },
  { key: 'contacts', label: 'Kontakty' },
  { key: 'personal', label: 'Osobné a vzdelanie' },
  { key: 'ordination', label: 'Svätenia a ŽD' },
  { key: 'log', label: 'História zmien' },
]

const valueToInput = (v: unknown) => (Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v))

export default function ClergyDetailView({ detail }: { detail: ClergyDetail }) {
  const { person, assignments, lookups } = detail
  const [tab, setTab] = useState<TabKey>('basic')
  const [promoting, setPromoting] = useState(false)
  const primary = assignments.find((a) => isCurrent(a) && a.is_primary) ?? assignments.find((a) => isCurrent(a) && a.kind === 'parish') ?? null
  const tone = clergyTone({ category: person.category as ClergyCategory, status: person.status as ClergyStatus, primary_role: primary?.role })
  const year = person.category === 'seminarian' ? seminaryYearLabel(seminaryYear(person.seminary_entry_year, person.seminary_year_offset ?? 0)) : null

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Link href="/admin/knazi" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Schematizmus kňazov
      </Link>

      <div className={`${cardCls} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${TONE_CLASS[tone].badge}`}>
              {CATEGORY_LABEL[person.category as ClergyCategory]} · {STATUS_LABEL[person.status as ClergyStatus]}
            </span>
            {year && <span className="text-xs font-bold text-violet-700">{year}</span>}
            {person.personal_number && <span className="text-xs font-mono text-gray-400">č. {person.personal_number}</span>}
          </div>
          <h1 className="text-2xl font-black text-gray-900">{clergyDisplayName({ ...person, first_name: person.first_name ?? '', last_name: person.last_name ?? '' })}</h1>
          <p className="text-sm text-gray-500">
            {primary ? `${primary.role} – ${primary.parish_name ?? primary.organization ?? primary.deanery_name ?? ''}` : 'bez aktuálneho pôsobenia'}
            {person.salutation ? ` · ${person.salutation}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {person.schematizmus_slug && (
            <a href={`https://dcza.sk/sk/schematizmus/knazi/${person.schematizmus_slug}`} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
              <ExternalLink size={14} /> dcza.sk
            </a>
          )}
          <button type="button" onClick={() => setPromoting(true)} className={btnPrimary}>
            <UserCog size={16} /> Zmeniť stav
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto bg-white border border-gray-100 rounded-2xl p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${tab === t.key ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'basic' || tab === 'contacts' || tab === 'personal' || tab === 'ordination') &&
        SECTIONS[tab]
          .filter((s) => s.title !== 'Bohoslovec' || person.category === 'seminarian' || person.seminary_entry_year != null)
          .map((s) => <FieldSection key={`${person.id}-${s.title}`} personId={person.id} section={s} person={person} lookups={lookups} />)}

      {tab === 'assignments' && <AssignmentsTab detail={detail} />}

      {tab === 'log' && (
        <div className={cardCls}>
          <SectionTitle title="História zmien" description="Každá úprava v registri – kto, kedy a čo zmenil." />
          {detail.log.length === 0 ? (
            <p className="text-sm text-gray-400">Zatiaľ bez zmien (údaje pochádzajú z importu).</p>
          ) : (
            <ul className="divide-y divide-gray-50 text-sm">
              {detail.log.map((l) => (
                <li key={l.id} className="py-2.5">
                  <div className="flex justify-between gap-3">
                    <span className="font-bold text-gray-900">
                      {l.entity === 'assignment' ? 'Pôsobenie' : 'Údaje'} – {l.action}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(l.created_at).toLocaleString('sk-SK')} · {l.user_email ?? 'systém'}
                    </span>
                  </div>
                  <pre className="text-[11px] text-gray-500 whitespace-pre-wrap mt-1">
                    {Object.entries(l.changes)
                      .map(([k, v]) => (Array.isArray(v) && v.length === 2 ? `${k}: ${JSON.stringify(v[0])} → ${JSON.stringify(v[1])}` : `${k}: ${JSON.stringify(v)}`))
                      .join('\n')}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {promoting && <PromoteDialog detail={detail} onClose={() => setPromoting(false)} />}
    </div>
  )
}

function FieldSection({ personId, section, person, lookups }: { personId: string; section: { title: string; description?: string; fields: FieldDef[] }; person: ClergyDetail['person']; lookups: Lookups }) {
  const router = useRouter()
  const initial = Object.fromEntries(section.fields.map((f) => [f.key, valueToInput(person[f.key])]))
  const [form, setForm] = useState<Record<string, string>>(initial)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const dirty = section.fields.some((f) => form[f.key] !== initial[f.key])

  const save = () =>
    startTransition(async () => {
      const patch = Object.fromEntries(section.fields.filter((f) => form[f.key] !== initial[f.key]).map((f) => [f.key, form[f.key]]))
      const res = await updateClergy(personId, patch)
      setMsg(res.success ? { kind: 'success', text: 'Uložené.' } : { kind: 'error', text: res.error })
      if (res.success) router.refresh()
    })

  return (
    <div className={cardCls}>
      <SectionTitle title={section.title} description={section.description} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {section.fields.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint} className={f.wide || f.type === 'textarea' ? 'md:col-span-2' : ''}>
            {f.type === 'select' ? (
              <select value={form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} className={inputCls}>
                <option value="">—</option>
                {f.options!(lookups).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea rows={4} value={form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} className={inputCls} />
            ) : (
              <input
                type={f.type === 'date' ? 'date' : 'text'}
                inputMode={f.type === 'number' ? 'numeric' : undefined}
                value={form[f.key]}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                className={inputCls}
              />
            )}
          </Field>
        ))}
      </div>
      {msg && <div className="mt-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={save} disabled={pending || !dirty} className={btnPrimary}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť
        </button>
      </div>
    </div>
  )
}

function AssignmentsTab({ detail }: { detail: ClergyDetail }) {
  const router = useRouter()
  const { person, assignments, lookups } = detail
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<AssignmentInput & { endPrevious: boolean }>({ kind: 'parish', role: 'farár', parish_id: '', deanery_id: '', organization: '', body_id: '', date_from: today, is_primary: true, note: '', endPrevious: true })

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) =>
    startTransition(async () => {
      setMsg(null)
      const res = await fn()
      setMsg(res.success ? { kind: 'success', text: ok } : { kind: 'error', text: res.error ?? 'Chyba' })
      if (res.success) router.refresh()
    })

  const current = assignments.filter(isCurrent)
  const history = assignments.filter((a) => !isCurrent(a))

  const row = (a: ClergyDetail['assignments'][number], cur: boolean) => (
    <tr key={a.id} className={a.is_primary ? 'bg-blue-50/40' : ''}>
      <td className="py-2 px-2">
        <span className="font-bold text-gray-900">{a.role}</span>
        {a.is_primary && <span className="ml-2 text-[10px] font-black uppercase text-blue-700">hlavné</span>}
        {a.note && <div className="text-[11px] text-gray-400">{a.note}</div>}
      </td>
      <td className="py-2 px-2 text-gray-700">
        {a.parish_id ? <Link href={`/admin/farnosti/${a.parish_id}`} className="hover:text-blue-600">{a.parish_name}</Link> : a.organization ?? a.deanery_name ?? '—'}
      </td>
      <td className="py-2 px-2 text-gray-500 text-xs">{KIND_LABEL[a.kind]}</td>
      <td className="py-2 px-2 text-gray-500 text-xs whitespace-nowrap">{assignmentPeriod(a)}</td>
      <td className="py-2 px-2 text-[10px] text-gray-400">{a.source === 'schematizmus' ? 'dcza.sk' : a.source === 'excel' ? 'Excel' : a.source === 'admin' ? 'admin' : ''}</td>
      <td className="py-2 px-2 text-right whitespace-nowrap">
        {cur && !a.is_primary && (
          <button type="button" title="Označiť ako hlavné" onClick={() => run(() => setPrimaryAssignment(person.id, a.id), 'Hlavné pôsobenie zmenené.')} className={btnIcon}>
            <Star size={14} />
          </button>
        )}
        {cur && (
          <button
            type="button"
            title="Ukončiť"
            onClick={() => {
              const d = prompt('Dátum ukončenia (RRRR-MM-DD):', today)
              if (d) run(() => endAssignment(person.id, a.id, d), 'Pôsobenie ukončené.')
            }}
            className={btnIcon}
          >
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          title="Zmazať (len pri chybnom zázname)"
          onClick={() => confirm('Zmazať záznam o pôsobení? Použite len pri chybe – inak pôsobenie ukončite.') && run(() => deleteAssignment(person.id, a.id), 'Záznam zmazaný.')}
          className={btnIconDanger}
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )

  const table = (list: typeof assignments, cur: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
            <th className="py-2 px-2">Funkcia</th><th className="py-2 px-2">Miesto</th><th className="py-2 px-2">Druh</th><th className="py-2 px-2">Obdobie</th><th className="py-2 px-2">Zdroj</th><th />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {list.map((a) => row(a, cur))}
          {list.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Žiadne záznamy.</td></tr>}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-6">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className={cardCls}>
        <SectionTitle title="Aktuálne pôsobenie a funkcie" description="Register je zdroj pravdy (O49) – zmena tu sa prejaví v zozname kňazov farnosti." />
        {table(current, true)}
      </div>

      <div className={cardCls}>
        <SectionTitle title="Nové menovanie" description="Pridá nové pôsobenie; doterajšie hlavné pôsobenie sa môže ukončiť ku dňu pred nástupom." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Druh">
            <select
              value={form.kind}
              onChange={(e) => {
                const kind = e.target.value as AssignmentKind
                // diecézna funkcia (rada, komisia…) býva popri farnosti – nemá ukončiť hlavné pôsobenie
                setForm((f) => ({ ...f, kind, ...(kind === 'diocese' ? { is_primary: false, endPrevious: false } : {}) }))
              }}
              className={inputCls}
            >
              {(Object.keys(KIND_LABEL) as AssignmentKind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </Field>
          <Field label="Funkcia">
            <input list="clergy-roles" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={inputCls} />
            <datalist id="clergy-roles">{ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}</datalist>
          </Field>
          {form.kind === 'parish' ? (
            <Field label="Farnosť">
              <select value={form.parish_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, parish_id: e.target.value }))} className={inputCls}>
                <option value="">— vyberte —</option>
                {lookups.parishes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          ) : form.kind === 'deanery' ? (
            <Field label="Dekanát">
              <select value={form.deanery_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, deanery_id: e.target.value }))} className={inputCls}>
                <option value="">— vyberte —</option>
                {lookups.deaneries.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          ) : form.kind === 'diocese' && lookups.bodies.length > 0 && form.body_id ? (
            <Field label="Rada, komisia, úrad" hint="funkcia v orgáne: člen, predseda, tajomník…">
              <select value={form.body_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, body_id: e.target.value }))} className={inputCls}>
                <option value="">— iná funkcia (zadať organizáciu) —</option>
                {lookups.bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Organizácia / miesto">
              <input value={form.organization ?? ''} onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))} placeholder="Biskupský úrad, nemocnica…" className={inputCls} />
            </Field>
          )}
          {form.kind === 'diocese' && lookups.bodies.length > 0 && !form.body_id && (
            <Field label="Člen rady, komisie, úradu?">
              <select
                value=""
                onChange={(e) => e.target.value && setForm((f) => ({ ...f, body_id: e.target.value, role: f.role && f.role !== 'farár' ? f.role : 'člen' }))}
                className={inputCls}
              >
                <option value="">— vybrať orgán —</option>
                {lookups.bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Od">
            <input type="date" value={form.date_from ?? ''} onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Poznámka" className="md:col-span-2">
            <input value={form.note ?? ''} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="napr. číslo dekrétu" className={inputCls} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-5 mt-4">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
            <input type="checkbox" className={checkboxCls} checked={!!form.is_primary} onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))} /> Hlavné pôsobenie
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
            <input type="checkbox" className={checkboxCls} checked={form.endPrevious} onChange={(e) => setForm((f) => ({ ...f, endPrevious: e.target.checked }))} /> Ukončiť doterajšie hlavné (a farské) pôsobenie
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => addAssignment(person.id, form, form.endPrevious), 'Menovanie zapísané.')}
            className={`${btnPrimary} ml-auto`}
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Zapísať menovanie
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <SectionTitle title="História pôsobenia" description="Z Excelu kúrie a zo schematizmu dcza.sk; ďalšie pribúdajú ukončením pôsobenia." />
        {table(history, false)}
      </div>
    </div>
  )
}

function PromoteDialog({ detail, onClose }: { detail: ClergyDetail; onClose: () => void }) {
  const router = useRouter()
  const { person, lookups } = detail
  const next: ClergyCategory = person.category === 'seminarian' ? 'deacon' : person.category === 'deacon' ? 'priest' : (person.category as ClergyCategory)
  const [category, setCategory] = useState<ClergyCategory>(next)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [place, setPlace] = useState('')
  const [ordainer, setOrdainer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const ordination = category === 'deacon' || category === 'permanent_deacon' || category === 'priest'

  const submit = () =>
    startTransition(async () => {
      const res = await promoteClergy(person.id, ordination ? { category, date, place, ordainer_id: ordainer || null } : { category })
      if (res.success) {
        router.refresh()
        onClose()
      } else setError(res.error)
    })

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${cardCls} w-full max-w-md space-y-4`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Zmeniť stav</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 cursor-pointer"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500">
          Teraz: <strong>{CATEGORY_LABEL[person.category as ClergyCategory]}</strong>. Pri svätení sa zapíše dátum, miesto a svätiteľ. Archív (odchod, úmrtie) nastavíte v záložke Základné → Stav.
        </p>
        <Field label="Nová kategória">
          <select value={category} onChange={(e) => setCategory(e.target.value as ClergyCategory)} className={inputCls}>
            {(Object.keys(CATEGORY_LABEL) as ClergyCategory[]).map((k) => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}
          </select>
        </Field>
        {ordination && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label={category === 'priest' ? 'Dátum vysviacky' : 'Dátum diakonátu'}>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Miesto">
                <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Žilina" className={inputCls} />
              </Field>
            </div>
            <Field label="Svätiteľ">
              <select value={ordainer} onChange={(e) => setOrdainer(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {lookups.ordainers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
          </>
        )}
        {error && <Notice kind="error">{error}</Notice>}
        <button type="button" onClick={submit} disabled={pending} className={`${btnPrimary} w-full`}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť zmenu
        </button>
      </div>
    </div>
  )
}
