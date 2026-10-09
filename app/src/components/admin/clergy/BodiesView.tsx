'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowUp, Landmark, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { btnIcon, btnIconDanger, btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'
import {
  addClergyMember,
  addExternalMember,
  deleteBody,
  deleteMember,
  endMember,
  moveBody,
  saveBody,
  updateMemberRole,
  type BodyDetail,
  type BodyInput,
  type BodyListItem,
  type BodyMember,
  type ExternalMemberInput,
} from '@/app/admin/knazi/kuria/actions'
import { BODY_KIND_LABEL, BODY_ROLE_SUGGESTIONS, assignmentRoleText, type BodyKind } from '@/lib/diocese/bodies'

const KINDS: BodyKind[] = ['kuria', 'rada', 'usek']

type Msg = { kind: 'success' | 'error'; text: string } | null

function useRunner() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<Msg>(null)
  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string, after?: () => void) =>
    startTransition(async () => {
      setMsg(null)
      const res = await fn()
      setMsg(res.success ? { kind: 'success', text: ok } : { kind: 'error', text: res.error ?? 'Chyba' })
      if (res.success) {
        after?.()
        router.refresh()
      }
    })
  return { pending, msg, run }
}

// ------------------------------------------------------------ zoznam orgánov

export function BodiesList({ bodies }: { bodies: BodyListItem[] }) {
  const router = useRouter()
  const { pending, msg, run } = useRunner()
  const [form, setForm] = useState<BodyInput>({ name: '', name_genitive: '', kind: 'rada' })

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link href="/admin/knazi" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600 mb-2">
            <ArrowLeft size={14} /> Schematizmus kňazov
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Landmark className="text-blue-600" /> Kúria, rady a komisie
          </h1>
          <p className="text-gray-500 mt-1 max-w-3xl">
            Kňazi a diakoni sa pridávajú z registra – členstvo sa im zapíše ako funkcia v schematizme. Laici a rehoľníci mimo registra sa pridávajú menom. Na webe dcza.sk je všetko na jednej stránke, menu „Rady a komisie“ odkazuje na jednotlivé orgány.
          </p>
        </div>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {KINDS.map((k) => {
        const list = bodies.filter((b) => b.kind === k)
        return (
          <div key={k} className={cardCls}>
            <SectionTitle title={BODY_KIND_LABEL[k]} />
            <ul className="divide-y divide-gray-50">
              {list.map((b, i) => (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <Link href={`/admin/knazi/kuria/${b.id}`} className="font-bold text-gray-900 hover:text-blue-600 flex-1 min-w-0">
                    {b.name}
                    {!b.published && <span className="ml-2 text-[10px] font-black uppercase text-amber-600">skryté</span>}
                  </Link>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{b.members} {b.members === 1 ? 'člen' : b.members >= 2 && b.members <= 4 ? 'členovia' : 'členov'}</span>
                  <button type="button" title="Vyššie" disabled={pending || i === 0} onClick={() => run(() => moveBody(b.id, -1), 'Poradie zmenené.')} className={btnIcon}>
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" title="Nižšie" disabled={pending || i === list.length - 1} onClick={() => run(() => moveBody(b.id, 1), 'Poradie zmenené.')} className={btnIcon}>
                    <ArrowDown size={14} />
                  </button>
                  <Link href={`/admin/knazi/kuria/${b.id}`} title="Upraviť" className={btnIcon}>
                    <Pencil size={14} />
                  </Link>
                </li>
              ))}
              {list.length === 0 && <li className="py-4 text-sm text-gray-400">Zatiaľ nič.</li>}
            </ul>
          </div>
        )
      })}

      <div className={cardCls}>
        <SectionTitle title="Nový orgán" description="Napr. nová komisia alebo rada. Genitív slúži na text funkcie v profile kňaza („člen Presbyterskej rady“)." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Názov">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Komisia pre…" className={inputCls} />
          </Field>
          <Field label="Názov v 2. páde" hint="nepovinné">
            <input value={form.name_genitive ?? ''} onChange={(e) => setForm((f) => ({ ...f, name_genitive: e.target.value }))} placeholder="Komisie pre…" className={inputCls} />
          </Field>
          <Field label="Druh">
            <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as BodyKind }))} className={inputCls}>
              {KINDS.map((k) => <option key={k} value={k}>{BODY_KIND_LABEL[k]}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end mt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const res = await saveBody(null, form)
                if (res.success) router.push(`/admin/knazi/kuria/${res.id}`)
                return res
              }, 'Orgán vytvorený.')
            }
            className={btnPrimary}
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Vytvoriť
          </button>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ detail orgánu

export function BodyEditor({ detail }: { detail: BodyDetail }) {
  const router = useRouter()
  const { body, current, former, clergyOptions } = detail
  const { pending, msg, run } = useRunner()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<BodyInput>({
    name: body.name,
    name_genitive: body.name_genitive ?? '',
    kind: body.kind,
    description: body.description ?? '',
    published: body.published,
  })
  const [mode, setMode] = useState<'clergy' | 'external'>('clergy')
  const [clergyLabel, setClergyLabel] = useState('')
  const [clergyRole, setClergyRole] = useState('člen')
  const [clergyFrom, setClergyFrom] = useState(today)
  const emptyExt: ExternalMemberInput = { title_before: '', first_name: '', last_name: '', title_after: '', affiliation: '', body_role: 'člen', date_from: today }
  const [ext, setExt] = useState<ExternalMemberInput>(emptyExt)
  const [showFormer, setShowFormer] = useState(false)

  const clergyId = clergyOptions.find((c) => c.label === clergyLabel)?.id ?? ''

  const memberRow = (m: BodyMember, cur: boolean) => (
    <tr key={`${m.type}-${m.id}`}>
      <td className="py-2 px-2">
        {m.clergy_id ? (
          <Link href={`/admin/knazi/${m.clergy_id}`} className="font-bold text-gray-900 hover:text-blue-600">{m.name}</Link>
        ) : (
          <span className="font-bold text-gray-900">{m.name}</span>
        )}
        {m.note && <span className="ml-2 text-xs text-gray-400">{m.note}</span>}
      </td>
      <td className="py-2 px-2 text-gray-700">{m.body_role}</td>
      <td className="py-2 px-2 text-xs">
        <span className={m.type === 'clergy' ? 'text-blue-700 font-bold' : 'text-gray-500'}>{m.type === 'clergy' ? 'register' : 'mimo registra'}</span>
      </td>
      <td className="py-2 px-2 text-xs text-gray-500 whitespace-nowrap">
        {m.date_from ? `od ${fmt(m.date_from)}` : ''}
        {m.date_to ? ` do ${fmt(m.date_to)}` : ''}
      </td>
      <td className="py-2 px-2 text-right whitespace-nowrap">
        {cur && (
          <>
            <button
              type="button"
              title="Zmeniť funkciu"
              onClick={() => {
                const r = prompt('Funkcia v orgáne (predseda, tajomník, člen…):', m.body_role)
                if (r) run(() => updateMemberRole(body.id, m.type, m.id, r), 'Funkcia zmenená.')
              }}
              className={btnIcon}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              title="Ukončiť členstvo"
              onClick={() => {
                const d = prompt('Dátum ukončenia (RRRR-MM-DD):', today)
                if (d) run(() => endMember(body.id, m.type, m.id, d), 'Členstvo ukončené.')
              }}
              className={btnIcon}
            >
              <X size={14} />
            </button>
          </>
        )}
        <button
          type="button"
          title="Zmazať (len pri chybnom zázname)"
          onClick={() => confirm('Zmazať záznam? Použite len pri chybe – inak členstvo ukončite.') && run(() => deleteMember(body.id, m.type, m.id), 'Záznam zmazaný.')}
          className={btnIconDanger}
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )

  const table = (list: BodyMember[], cur: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
            <th className="py-2 px-2">Meno</th><th className="py-2 px-2">Funkcia</th><th className="py-2 px-2">Zdroj</th><th className="py-2 px-2">Obdobie</th><th />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {list.map((m) => memberRow(m, cur))}
          {list.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Žiadni členovia.</td></tr>}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div>
        <Link href="/admin/knazi/kuria" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600 mb-2">
          <ArrowLeft size={14} /> Kúria, rady a komisie
        </Link>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{body.name}</h1>
        <p className="text-gray-500 mt-1">{BODY_KIND_LABEL[body.kind]} · na webe: /schematizmus/kuria#{body.slug}</p>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className={cardCls}>
        <SectionTitle title="Aktuálni členovia" description="Kňazom sa zmena prejaví aj v ich profile v schematizme. Ukončené členstvo ostáva v histórii." />
        {table(current, true)}
        {former.length > 0 && (
          <div className="mt-4">
            <button type="button" onClick={() => setShowFormer((v) => !v)} className="text-sm font-bold text-blue-600">
              {showFormer ? 'Skryť' : 'Zobraziť'} bývalých členov ({former.length})
            </button>
            {showFormer && <div className="mt-3">{table(former, false)}</div>}
          </div>
        )}
      </div>

      <div className={cardCls}>
        <SectionTitle title="Pridať člena" />
        <div className="inline-flex rounded-xl bg-gray-100 p-1 mb-5">
          {(['clergy', 'external'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${mode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              {m === 'clergy' ? 'Kňaz / diakon z registra' : 'Laik, rehoľník (mimo registra)'}
            </button>
          ))}
        </div>

        {mode === 'clergy' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Kňaz alebo diakon" className="md:col-span-2" hint="začnite písať meno">
                <input list="body-clergy" value={clergyLabel} onChange={(e) => setClergyLabel(e.target.value)} className={inputCls} />
                <datalist id="body-clergy">{clergyOptions.map((c) => <option key={c.id} value={c.label} />)}</datalist>
              </Field>
              <Field label="Funkcia">
                <input list="body-roles" value={clergyRole} onChange={(e) => setClergyRole(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Od">
                <input type="date" value={clergyFrom} onChange={(e) => setClergyFrom(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <p className="text-xs text-gray-400 flex-1">
                V profile kňaza: <span className="font-bold text-gray-600">{assignmentRoleText(clergyRole, form.name ? { ...body, name: form.name, name_genitive: form.name_genitive || null } : body)}</span>
              </p>
              <button
                type="button"
                disabled={pending || !clergyId}
                onClick={() =>
                  run(() => addClergyMember(body.id, { clergy_id: clergyId, body_role: clergyRole, date_from: clergyFrom }), 'Člen pridaný a zapísaný do schematizmu.', () => setClergyLabel(''))
                }
                className={btnPrimary}
              >
                {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Pridať z registra
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Titul pred">
                <input value={ext.title_before ?? ''} onChange={(e) => setExt((x) => ({ ...x, title_before: e.target.value }))} placeholder="Mgr." className={inputCls} />
              </Field>
              <Field label="Meno">
                <input value={ext.first_name ?? ''} onChange={(e) => setExt((x) => ({ ...x, first_name: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Priezvisko">
                <input value={ext.last_name} onChange={(e) => setExt((x) => ({ ...x, last_name: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Titul za">
                <input value={ext.title_after ?? ''} onChange={(e) => setExt((x) => ({ ...x, title_after: e.target.value }))} placeholder="PhD." className={inputCls} />
              </Field>
              <Field label="Funkcia">
                <input list="body-roles" value={ext.body_role} onChange={(e) => setExt((x) => ({ ...x, body_role: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Poznámka na webe" hint="napr. rehoľná sestra, SVD">
                <input value={ext.affiliation ?? ''} onChange={(e) => setExt((x) => ({ ...x, affiliation: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Od">
                <input type="date" value={ext.date_from ?? ''} onChange={(e) => setExt((x) => ({ ...x, date_from: e.target.value }))} className={inputCls} />
              </Field>
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="button"
                disabled={pending || !ext.last_name.trim()}
                onClick={() => run(() => addExternalMember(body.id, ext), 'Člen pridaný.', () => setExt(emptyExt))}
                className={btnPrimary}
              >
                {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Pridať
              </button>
            </div>
          </>
        )}
        <datalist id="body-roles">{BODY_ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}</datalist>
      </div>

      <div className={cardCls}>
        <SectionTitle title="Údaje orgánu" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Názov">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Názov v 2. páde" hint="„člen …“ v profile kňaza">
            <input value={form.name_genitive ?? ''} onChange={(e) => setForm((f) => ({ ...f, name_genitive: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Druh">
            <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as BodyKind }))} className={inputCls}>
              {KINDS.map((k) => <option key={k} value={k}>{BODY_KIND_LABEL[k]}</option>)}
            </select>
          </Field>
          <Field label="Popis na webe" hint="odseky oddeľte prázdnym riadkom" className="md:col-span-3">
            <textarea rows={5} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
            <input type="checkbox" className={checkboxCls} checked={form.published !== false} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} /> Zobraziť na webe
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              confirm(`Zmazať „${body.name}“? Členovia mimo registra sa zmažú, kňazom ostane funkcia v histórii.`) &&
              run(() => deleteBody(body.id), 'Orgán zmazaný.', () => router.push('/admin/knazi/kuria'))
            }
            className={`${btnSecondary} ml-auto text-red-600`}
          >
            <Trash2 size={14} /> Zmazať orgán
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => saveBody(body.id, form), 'Uložené.')} className={btnPrimary}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť
          </button>
        </div>
      </div>
    </div>
  )
}

const fmt = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`).toLocaleDateString('sk-SK') : d)
