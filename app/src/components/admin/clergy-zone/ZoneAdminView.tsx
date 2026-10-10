'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, ArrowDown, ArrowUp, Archive, Eye, EyeOff, FileText, Loader2, Mail, MailCheck, Pencil, Plus, Save, Search, ShieldAlert, Trash2, UserCheck, Users, X,
} from 'lucide-react'
import {
  deleteZoneCategory, getZoneMembers, inviteZoneMember, moveZoneCategory, saveZoneCategory, type ZoneAdminOverview,
} from '@/app/admin/knazska-zona/actions'
import type { ZoneMember } from '@/lib/clergy-zone/notify'
import { fmtDate } from '@/lib/clergy-zone/types'
import { CATEGORY_LABEL, type ClergyCategory } from '@/lib/clergy/types'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

type Tab = 'docs' | 'categories' | 'members'
type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null

export default function ZoneAdminView({ overview }: { overview: ZoneAdminOverview }) {
  const [tab, setTab] = useState<Tab>('docs')
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Kňazská zóna</h1>
          <p className="text-sm text-gray-500 mt-1">Neverejné dokumenty kúrie pre kňazov a diakonov – obežníky, smernice, formuláre.</p>
        </div>
        <div className="flex gap-2">
          <a href="/knazska-zona" target="_blank" rel="noopener noreferrer" className={btnSecondary}>
            <Eye size={14} /> Zobraziť zónu
          </a>
          <Link href="/admin/knazska-zona/novy" className={btnPrimary}>
            <Plus size={16} /> Nový dokument
          </Link>
        </div>
      </div>
      {!overview.privateStorage && (
        <Notice kind="error">
          <span className="inline-flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            Súbory sa zatiaľ ukladajú do spoločného úložiska webu (s náhodnými adresami). Pred nahraním citlivých dokumentov treba nastaviť súkromné úložisko
            (premenná B2_PRIVATE_BUCKET).
          </span>
        </Notice>
      )}
      <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        {(
          [
            ['docs', `Dokumenty (${overview.docs.length})`],
            ['categories', 'Kategórie'],
            ['members', 'Kňazi a prístupy'],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer ${tab === k ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === 'docs' && <DocsTab overview={overview} />}
      {tab === 'categories' && <CategoriesTab overview={overview} />}
      {tab === 'members' && <MembersTab />}
    </div>
  )
}

// ------------------------------------------------------------ dokumenty

function DocsTab({ overview }: { overview: ZoneAdminOverview }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [state, setState] = useState<'all' | 'draft' | 'current' | 'archived'>('all')
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return overview.docs.filter((d) => {
      if (cat !== 'all' && d.category_id !== cat) return false
      if (state === 'draft' && d.published) return false
      if (state === 'current' && (!d.published || d.status !== 'current')) return false
      if (state === 'archived' && d.status !== 'archived') return false
      return !needle || `${d.title} ${d.doc_number ?? ''}`.toLowerCase().includes(needle)
    })
  }, [overview.docs, q, cat, state])

  return (
    <div className={`${cardCls} space-y-4`}>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať podľa názvu alebo čísla" className={`${inputCls} !pl-9`} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${inputCls} !w-auto`}>
          <option value="all">Všetky kategórie</option>
          {overview.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={state} onChange={(e) => setState(e.target.value as typeof state)} className={`${inputCls} !w-auto`}>
          <option value="all">Všetky stavy</option>
          <option value="draft">Koncepty</option>
          <option value="current">Zverejnené – aktuálne</option>
          <option value="archived">Archív</option>
        </select>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">{overview.docs.length ? 'Nič nevyhovuje filtru.' : 'Zatiaľ žiadne dokumenty. Začnite tlačidlom „Nový dokument“.'}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {list.map((d) => (
            <li key={d.id}>
              <Link href={`/admin/knazska-zona/${d.id}`} className="py-3 px-2 -mx-2 rounded-xl flex flex-wrap items-center gap-3 hover:bg-gray-50">
                <FileText size={18} className="text-gray-300 shrink-0" />
                <div className="flex-1 min-w-[220px]">
                  <p className="font-bold text-gray-900">
                    {d.title}
                    {d.doc_number && <span className="text-gray-400 font-medium"> · {d.doc_number}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {d.category_name}
                    {d.issued_on && ` · vydané ${fmtDate(d.issued_on)}`} · {d.files.length} súbor(y)
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  {!d.published ? (
                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500">Koncept</span>
                  ) : d.status === 'archived' ? (
                    <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 inline-flex items-center gap-1">
                      <Archive size={12} /> Archív
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">Zverejnené</span>
                  )}
                  {d.notified_at && (
                    <span title={`E-mail ${fmtDate(d.notified_at)} – ${d.notified_count ?? 0} príjemcov`} className="text-blue-600 inline-flex items-center gap-1">
                      <MailCheck size={14} /> {d.notified_count ?? 0}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ------------------------------------------------------------ kategórie

function CategoriesTab({ overview }: { overview: ZoneAdminOverview }) {
  const router = useRouter()
  const [editing, setEditing] = useState<{ id?: string; name: string; description: string; is_visible: boolean } | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok?: string) =>
    start(async () => {
      const res = await fn()
      setMsg(res.success ? (ok ? { kind: 'success', text: ok } : null) : { kind: 'error', text: res.error ?? 'Chyba' })
      if (res.success) router.refresh()
    })

  return (
    <div className={`${cardCls} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle title="Kategórie" description="Poradie a názvy, ako ich vidia kňazi v bočnom menu zóny. Skrytá kategória sa v zóne nezobrazí (ani jej dokumenty)." />
        <button type="button" onClick={() => setEditing({ name: '', description: '', is_visible: true })} className={btnPrimary}>
          <Plus size={16} /> Nová kategória
        </button>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {editing && (
        <form
          className="flex flex-wrap items-end gap-2 p-4 rounded-2xl bg-gray-50"
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              const res = await saveZoneCategory(editing)
              if (res.success) setEditing(null)
              return res
            }, 'Uložené.')
          }}
        >
          <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Názov" className={`${inputCls} !w-64`} />
          <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Krátky popis (nepovinné)" className={`${inputCls} flex-1 min-w-[220px]`} />
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 pb-3">
            <input type="checkbox" checked={editing.is_visible} onChange={(e) => setEditing({ ...editing, is_visible: e.target.checked })} className={checkboxCls} /> Viditeľná
          </label>
          <button type="submit" disabled={pending} className={btnPrimary}>
            <Save size={14} /> Uložiť
          </button>
          <button type="button" onClick={() => setEditing(null)} className={btnSecondary}>
            <X size={14} />
          </button>
        </form>
      )}
      <ul className="divide-y divide-gray-100">
        {overview.categories.map((c, i) => (
          <li key={c.id} className="py-2.5 flex items-center gap-3">
            <div className="flex flex-col">
              <button type="button" disabled={pending || i === 0} onClick={() => run(() => moveZoneCategory(c.id, -1))} className="text-gray-300 hover:text-blue-600 disabled:opacity-30 cursor-pointer">
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                disabled={pending || i === overview.categories.length - 1}
                onClick={() => run(() => moveZoneCategory(c.id, 1))}
                className="text-gray-300 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
              >
                <ArrowDown size={14} />
              </button>
            </div>
            <div className="flex-1">
              <p className={`font-bold ${c.is_visible ? 'text-gray-900' : 'text-gray-400'}`}>
                {c.name} {!c.is_visible && <EyeOff size={13} className="inline ml-1" />}
              </p>
              {c.description && <p className="text-xs text-gray-400">{c.description}</p>}
            </div>
            <span className="text-xs text-gray-400">{c.doc_count} dok.</span>
            <button type="button" onClick={() => setEditing({ id: c.id, name: c.name, description: c.description ?? '', is_visible: c.is_visible })} className={btnSecondary}>
              <Pencil size={14} />
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => confirm(`Zmazať kategóriu „${c.name}“?`) && run(() => deleteZoneCategory(c.id), 'Zmazané.')}
              className={`${btnSecondary} hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700`}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ------------------------------------------------------------ kňazi a prístupy

type MemberState = 'active' | 'invited' | 'none' | 'no_email'
const memberState = (m: ZoneMember): MemberState => (m.account_active ? 'active' : m.invited_at ? 'invited' : m.email ? 'none' : 'no_email')
const STATE_LABEL: Record<MemberState, string> = { active: 'Aktívny účet', invited: 'Pozvaný', none: 'Nepozvaný', no_email: 'Bez e-mailu' }
const STATE_CLS: Record<MemberState, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  invited: 'bg-blue-50 text-blue-700',
  none: 'bg-gray-100 text-gray-600',
  no_email: 'bg-amber-50 text-amber-700',
}

function MembersTab() {
  const [members, setMembers] = useState<ZoneMember[] | null>(null)
  const [filter, setFilter] = useState<'all' | MemberState>('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [emailFor, setEmailFor] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg>(null)

  const load = () => getZoneMembers().then(setMembers, () => setMsg({ kind: 'error', text: 'Zoznam sa nepodarilo načítať.' }))
  useEffect(() => {
    getZoneMembers().then(setMembers, () => setMsg({ kind: 'error', text: 'Zoznam sa nepodarilo načítať.' }))
  }, [])

  const list = (members ?? []).filter((m) => (filter === 'all' || memberState(m) === filter) && (!q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase())))
  const counts = (members ?? []).reduce<Record<MemberState, number>>((a, m) => ((a[memberState(m)] += 1), a), { active: 0, invited: 0, none: 0, no_email: 0 })

  const invite = async (ids: string[]) => {
    setMsg(null)
    let ok = 0
    const errors: string[] = []
    for (const [i, id] of ids.entries()) {
      setProgress(`Posielam ${i + 1} / ${ids.length}…`)
      const m = members?.find((x) => x.clergy_id === id)
      const res = await inviteZoneMember(id, { email: emailFor[id] || null })
      if (res.success) ok++
      else errors.push(`${m?.name ?? id}: ${res.error}`)
    }
    setProgress(null)
    setSelected(new Set())
    setMsg(errors.length ? { kind: 'error', text: `Odoslané: ${ok}. Chyby (${errors.length}): ${errors.slice(0, 5).join(' · ')}` } : { kind: 'success', text: `Odoslané pozvánky: ${ok}.` })
    load()
  }

  if (!members) {
    return (
      <div className={`${cardCls} flex items-center gap-2 text-sm text-gray-500`}>
        <Loader2 size={16} className="animate-spin" /> Načítavam kňazov z registra…
      </div>
    )
  }

  return (
    <div className={`${cardCls} space-y-4`}>
      <SectionTitle
        title="Kňazi a prístupy"
        description="Kňazi a diakoni z registra (v službe, na odpočinku, na štúdiu). Pozvánka príde len na diecézny e-mail @dcza.sk z registra; prihlasujú sa cez Google, bez hesla. Účty farností vidia zónu automaticky."
      />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať meno" className={`${inputCls} !pl-9`} />
        </div>
        {(['all', 'none', 'invited', 'active', 'no_email'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            {f === 'all' ? `Všetci (${members.length})` : `${STATE_LABEL[f]} (${counts[f]})`}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!!progress || selected.size === 0}
          onClick={() => confirm(`Poslať pozvánku do kňazskej zóny ${selected.size} osobám?`) && invite(Array.from(selected))}
          className={btnPrimary}
        >
          {progress ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} {progress ?? `Poslať pozvánku vybraným (${selected.size})`}
        </button>
        <button
          type="button"
          onClick={() => setSelected(new Set(list.filter((m) => m.email && !m.account_active && !m.invited_at).map((m) => m.clergy_id)))}
          className={btnSecondary}
        >
          <Users size={14} /> Vybrať všetkých nepozvaných s e-mailom
        </button>
      </div>
      <ul className="divide-y divide-gray-100">
        {list.map((m) => {
          const st = memberState(m)
          return (
            <li key={m.clergy_id} className="py-2.5 flex flex-wrap items-center gap-3">
              <input
                type="checkbox"
                className={checkboxCls}
                disabled={!m.email && !emailFor[m.clergy_id]}
                checked={selected.has(m.clergy_id)}
                onChange={(e) => {
                  const n = new Set(selected)
                  if (e.target.checked) n.add(m.clergy_id)
                  else n.delete(m.clergy_id)
                  setSelected(n)
                }}
              />
              <div className="flex-1 min-w-[220px]">
                <Link href={`/admin/knazi/${m.clergy_id}`} className="font-bold text-gray-900 hover:text-blue-600">
                  {m.name}
                </Link>
                <p className="text-xs text-gray-400">
                  {CATEGORY_LABEL[m.category as ClergyCategory] ?? m.category}
                  {m.email && ` · ${m.email}`}
                  {m.invited_at && ` · pozvaný ${fmtDate(m.invited_at)}`}
                </p>
              </div>
              {st === 'no_email' && (
                <input
                  type="email"
                  value={emailFor[m.clergy_id] ?? ''}
                  onChange={(e) => setEmailFor({ ...emailFor, [m.clergy_id]: e.target.value })}
                  placeholder="e-mail na pozvánku"
                  className={`${inputCls} !w-56 !py-2`}
                />
              )}
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATE_CLS[st]}`}>
                {st === 'active' && <UserCheck size={12} className="inline mr-1" />}
                {st === 'no_email' && <AlertTriangle size={12} className="inline mr-1" />}
                {STATE_LABEL[st]}
              </span>
              <button
                type="button"
                disabled={!!progress || (!m.email && !emailFor[m.clergy_id])}
                onClick={() => invite([m.clergy_id])}
                className={btnSecondary}
                title={st === 'active' ? 'Poslať oznámenie o prístupe' : st === 'invited' ? 'Poslať pozvánku znova' : 'Poslať pozvánku'}
              >
                <Mail size={14} /> {st === 'invited' ? 'Znova' : st === 'active' ? 'Oznámiť' : 'Pozvať'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
