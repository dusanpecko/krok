'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ExternalLink, EyeOff, Loader2, Pencil, Plus, Save, Trash2, UserPlus, X } from 'lucide-react'
import { adminDeleteContactSection, adminMoveContactSection, adminSaveContactSection } from '@/app/admin/web-dieceza/actions'
import {
  CONTACT_SOURCE_LABEL,
  holderKey,
  type AdminContactSection,
  type ContactBlockInput,
  type ContactPersonInput,
  type ContactSectionInput,
  type ContactSource,
  type ContactsAdminData,
} from '@/lib/diocese/contacts'
import { btnIcon, btnIconDanger, btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null
type Form = ContactSectionInput & { id: string | null }

const SOURCES: ContactSource[] = ['function', 'clergy', 'manual']
const ACTION_LABEL: Record<string, string> = { create: 'pridal(a)', update: 'upravil(a)', delete: 'zmazal(a)', move: 'presunul(a)' }

const emptyPerson = (): ContactPersonInput => ({ source: 'manual', name: '', clergy_id: null, body_id: null, body_role_match: null, role: null, emails: [], phones: [] })
const emptyBlock = (): ContactBlockInput => ({ title: '', emails: [], phones: [], body: '', people: [] })
const toForm = (s: AdminContactSection): Form => ({ id: s.id, title: s.title, published: s.published, blocks: s.blocks })

/** zoznam ↔ text v poli (oddelené čiarkou alebo novým riadkom) */
const listToText = (l: string[]) => l.join(', ')
const textToList = (t: string) => t.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean)

function swap<T>(list: T[], i: number, dir: -1 | 1): T[] {
  if (i + dir < 0 || i + dir >= list.length) return list
  const next = [...list]
  ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
  return next
}

/** Pole so zoznamom e-mailov / telefónov – text sa prevedie na zoznam až pri opustení poľa. */
function ListInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState(listToText(value))
  return <input value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onChange(textToList(text))} className={inputCls} placeholder={placeholder} />
}

/** Kontakty webu dcza.sk (065) – sekcie, bloky, osoby; osoba z funkcie v kúrii sa mení podľa registra. */
export default function ContactsAdmin({ data }: { data: ContactsAdminData }) {
  const router = useRouter()
  const [form, setForm] = useState<Form | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()

  const open = (f: Form) => {
    setForm(f)
    setFormKey((k) => k + 1)
    setMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const setBlocks = (fn: (b: ContactBlockInput[]) => ContactBlockInput[]) => setForm((f) => (f ? { ...f, blocks: fn(f.blocks) } : f))
  const setBlock = (i: number, patch: Partial<ContactBlockInput>) => setBlocks((bs) => bs.map((b, k) => (k === i ? { ...b, ...patch } : b)))
  const setPerson = (bi: number, pi: number, patch: Partial<ContactPersonInput>) =>
    setBlocks((bs) => bs.map((b, k) => (k === bi ? { ...b, people: b.people.map((p, j) => (j === pi ? { ...p, ...patch } : p)) } : b)))

  const save = () =>
    start(async () => {
      if (!form) return
      const { id, ...input } = form
      const res = await adminSaveContactSection(id, input)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      setForm(null)
      setMsg({ kind: 'success', text: 'Uložené – na webe sa zmena prejaví hneď.' })
      router.refresh()
    })

  const move = (s: AdminContactSection, dir: -1 | 1) =>
    start(async () => {
      const res = await adminMoveContactSection(s.id, dir)
      if (!res.success) setMsg({ kind: 'error', text: res.error })
      router.refresh()
    })

  const remove = (s: AdminContactSection) =>
    confirm(`Zmazať sekciu „${s.title}“ aj so všetkými kontaktmi?`) &&
    start(async () => {
      const res = await adminDeleteContactSection(s.id)
      setMsg(res.success ? { kind: 'success', text: 'Zmazané.' } : { kind: 'error', text: res.error })
      if (form?.id === s.id) setForm(null)
      router.refresh()
    })

  const bodyOf = (id: string | null) => data.bodyOptions.find((b) => b.id === id)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Web diecézy dcza.sk</p>
          <h1 className="text-2xl font-black text-gray-900">Kontakty</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Stránka Kontakty na dcza.sk. Osoba zadaná ako <b>funkcia v kúrii</b> sa mení sama podľa registra (napr. nový generálny vikár), <b>kňaz z registra</b> berie meno a tituly z registra, laikov zadajte <b>ručne</b>.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/kontakty" target="_blank" rel="noopener" className={btnSecondary}>
            <ExternalLink size={14} /> Zobraziť na webe
          </a>
          <button type="button" onClick={() => open({ id: null, title: '', published: true, blocks: [emptyBlock()] })} className={btnPrimary}>
            <Plus size={16} /> Pridať sekciu
          </button>
        </div>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {form && (
        <div key={formKey} className={`${cardCls} space-y-5`}>
          <div className="flex items-center justify-between">
            <SectionTitle title={form.id ? `Upraviť: ${form.title}` : 'Nová sekcia'} />
            <button type="button" onClick={() => setForm(null)} className="p-2 text-gray-400 hover:text-gray-700 cursor-pointer"><X size={18} /></button>
          </div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
            <Field label="Názov sekcie">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} maxLength={200} placeholder="Kúria" />
            </Field>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer pb-3">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className={checkboxCls} /> Zverejnené na webe
            </label>
          </div>

          <div className="space-y-4">
            {form.blocks.map((b, bi) => (
              <div key={bi} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex-1">Blok {bi + 1}</span>
                  <button type="button" onClick={() => setBlocks((bs) => swap(bs, bi, -1))} disabled={bi === 0} className={btnIcon} title="Vyššie"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => setBlocks((bs) => swap(bs, bi, 1))} disabled={bi === form.blocks.length - 1} className={btnIcon} title="Nižšie"><ArrowDown size={14} /></button>
                  <button type="button" onClick={() => setBlocks((bs) => bs.filter((_, k) => k !== bi))} className={btnIconDanger} title="Odstrániť blok"><Trash2 size={14} /></button>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="Nadpis bloku" hint="Napr. Učtáreň, Kancelár. Prázdny = úvod sekcie.">
                    <input value={b.title ?? ''} onChange={(e) => setBlock(bi, { title: e.target.value })} className={inputCls} maxLength={200} />
                  </Field>
                  <Field label="E-maily bloku" hint="Oddeľte čiarkou.">
                    <ListInput value={b.emails} onChange={(v) => setBlock(bi, { emails: v })} placeholder="uctaren@dcza.sk" />
                  </Field>
                  <Field label="Telefóny bloku" hint="Oddeľte čiarkou.">
                    <ListInput value={b.phones} onChange={(v) => setBlock(bi, { phones: v })} placeholder="041/56 584 23" />
                  </Field>
                </div>
                <Field label="Text (nepovinné)" hint="Adresa, IČO, hodiny… Riadky sa zachovajú; e-maily a odkazy (https://…) budú klikateľné.">
                  <textarea rows={3} value={b.body ?? ''} onChange={(e) => setBlock(bi, { body: e.target.value })} className={inputCls} maxLength={3000} />
                </Field>

                <div className="space-y-2">
                  {b.people.map((p, pi) => {
                    const body = bodyOf(p.body_id)
                    const now = p.source === 'function' && p.body_id ? data.holders[holderKey(p.body_id, p.body_role_match)] : undefined
                    return (
                      <div key={pi} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <select value={p.source} onChange={(e) => setPerson(bi, pi, { source: e.target.value as ContactSource })} className={`${inputCls} w-auto py-2`}>
                            {SOURCES.map((s) => <option key={s} value={s}>{CONTACT_SOURCE_LABEL[s]}</option>)}
                          </select>
                          <div className="flex-1" />
                          <button type="button" onClick={() => setBlock(bi, { people: swap(b.people, pi, -1) })} disabled={pi === 0} className={btnIcon} title="Vyššie"><ArrowUp size={14} /></button>
                          <button type="button" onClick={() => setBlock(bi, { people: swap(b.people, pi, 1) })} disabled={pi === b.people.length - 1} className={btnIcon} title="Nižšie"><ArrowDown size={14} /></button>
                          <button type="button" onClick={() => setBlock(bi, { people: b.people.filter((_, j) => j !== pi) })} className={btnIconDanger} title="Odstrániť osobu"><Trash2 size={14} /></button>
                        </div>
                        {p.source === 'manual' && (
                          <input value={p.name ?? ''} onChange={(e) => setPerson(bi, pi, { name: e.target.value })} className={inputCls} placeholder="Meno s titulmi, napr. Ing. Oľga Zuziaková" maxLength={300} />
                        )}
                        {p.source === 'clergy' && (
                          <select value={p.clergy_id ?? ''} onChange={(e) => setPerson(bi, pi, { clergy_id: e.target.value || null })} className={inputCls}>
                            <option value="">— vyberte kňaza z registra —</option>
                            {data.clergyOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                          </select>
                        )}
                        {p.source === 'function' && (
                          <div className="space-y-1">
                            <div className="grid md:grid-cols-2 gap-2">
                              <select value={p.body_id ?? ''} onChange={(e) => setPerson(bi, pi, { body_id: e.target.value || null, body_role_match: null })} className={inputCls}>
                                <option value="">— orgán kúrie —</option>
                                {data.bodyOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                              </select>
                              <select value={p.body_role_match ?? ''} onChange={(e) => setPerson(bi, pi, { body_role_match: e.target.value || null })} className={inputCls} disabled={!body}>
                                <option value="">— všetci v orgáne —</option>
                                {body?.roles.map((r) => <option key={r} value={r}>{r}</option>)}
                                {p.body_role_match && body && !body.roles.includes(p.body_role_match) && <option value={p.body_role_match}>{p.body_role_match} (začiatok funkcie)</option>}
                              </select>
                            </div>
                            <p className="text-xs text-gray-500 px-1">
                              {now ? (now.length ? <>Teraz: <b>{now.join(', ')}</b></> : <span className="text-amber-600 font-bold">Funkcia je teraz neobsadená – na webe sa nezobrazí nikto.</span>) : 'Po uložení sa ukáže, kto je vo funkcii.'}
                            </p>
                          </div>
                        )}
                        <div className="grid md:grid-cols-3 gap-2">
                          <input value={p.role ?? ''} onChange={(e) => setPerson(bi, pi, { role: e.target.value })} className={inputCls} placeholder="Funkcia na webe (nepovinné), napr. vedúca učtárne" maxLength={200} />
                          <ListInput value={p.emails} onChange={(v) => setPerson(bi, pi, { emails: v })} placeholder="E-maily (čiarkou)" />
                          <ListInput value={p.phones} onChange={(v) => setPerson(bi, pi, { phones: v })} placeholder="Telefóny (čiarkou)" />
                        </div>
                      </div>
                    )
                  })}
                  <button type="button" onClick={() => setBlock(bi, { people: [...b.people, emptyPerson()] })} className={btnSecondary}>
                    <UserPlus size={14} /> Pridať osobu
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setBlocks((bs) => [...bs, emptyBlock()])} className={btnSecondary}>
              <Plus size={14} /> Pridať blok
            </button>
          </div>

          <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Uložiť sekciu
          </button>
        </div>
      )}

      <div className={cardCls}>
        <SectionTitle title="Sekcie stránky" description="Poradie ako na webe. Pri úprave sa otvorí celá sekcia s blokmi a osobami." />
        <div className="divide-y divide-gray-100">
          {data.sections.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 flex items-center gap-2">
                  {s.title}
                  {!s.published && (
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold inline-flex items-center gap-1"><EyeOff size={10} /> skryté</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {s.blocks.map((b) => b.title).filter(Boolean).join(' · ') || `${s.blocks.length} blokov`}
                </p>
              </div>
              <button type="button" onClick={() => move(s, -1)} disabled={pending || i === 0} className={btnIcon} title="Vyššie"><ArrowUp size={16} /></button>
              <button type="button" onClick={() => move(s, 1)} disabled={pending || i === data.sections.length - 1} className={btnIcon} title="Nižšie"><ArrowDown size={16} /></button>
              <button type="button" onClick={() => open(toForm(s))} className={btnIcon} title="Upraviť"><Pencil size={16} /></button>
              <button type="button" onClick={() => remove(s)} className={btnIconDanger} title="Zmazať"><Trash2 size={16} /></button>
            </div>
          ))}
          {!data.sections.length && <p className="py-6 text-center text-sm text-gray-500">Zatiaľ žiadne sekcie.</p>}
        </div>
      </div>

      {data.log.length > 0 && (
        <div className={cardCls}>
          <SectionTitle title="Posledné zmeny" />
          <ul className="text-sm text-gray-600 space-y-1.5">
            {data.log.map((l, i) => (
              <li key={i}>
                <span className="text-gray-400 tabular-nums">{new Date(l.created_at).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>{' '}
                · <b>{l.user ?? 'neznámy'}</b> {ACTION_LABEL[l.action] ?? l.action} sekciu „{l.section_title}“
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-gray-400 text-center">
        Funkcie v kúrii sa spravujú v <Link href="/admin/knazi/kuria" className="underline hover:text-blue-600">Schematizmus → Kúria, rady a komisie</Link>.
      </p>
    </div>
  )
}
