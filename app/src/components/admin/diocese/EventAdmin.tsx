'use client'

import { Fragment, useEffect, useMemo, useState, useTransition } from 'react'
import QRCode from 'qrcode'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Download, Eye, Loader2, Mail, Pencil, Plus, QrCode, Save, Send, Trash2, X } from 'lucide-react'
import {
  adminAddInvites, adminDeleteEvent, adminDeleteInvite, adminDeleteResponse, adminExportResponses, adminSaveEvent, adminSendInvites, adminSetPublicLink, adminUpdateInvite,
} from '@/app/admin/web-dieceza/podujatia/actions'
import {
  EVENT_STATUS_LABEL, QUESTION_TYPE_LABEL, visibleQuestions,
  type AdminInvite, type EventAdminData, type EventInput, type EventQuestion, type EventStatus, type InviteInput, type QuestionType,
} from '@/lib/diocese/events-shared'
import { btnIcon, btnIconDanger, btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'
import { STATUS_CLS } from './EventsList'

type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null
type Tab = 'odpovede' | 'pozvani' | 'nastavenie'
const TABS: { key: Tab; label: string }[] = [
  { key: 'odpovede', label: 'Odpovede' },
  { key: 'pozvani', label: 'Pozvaní' },
  { key: 'nastavenie', label: 'Nastavenie' },
]

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
const short = (l: string) => l.replace(/:\s*$/, '').split(' / ')[0]
const fullName = (p: { first_name: string | null; last_name: string }) => [p.first_name, p.last_name].filter(Boolean).join(' ')

function download(fileName: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/** Riadky vložené z Excelu: Meno; Priezvisko; E-mail; Skupina; Oslovenie (tabulátor, bodkočiarka alebo čiarka). */
function parseInvites(text: string): InviteInput[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const c = l.split(l.includes('\t') ? '\t' : l.includes(';') ? ';' : ',').map((x) => x.trim())
      return { first_name: c[0] || null, last_name: c[1] || '', email: c[2] || null, group_name: c[3] || null, salutation: c[4] || null, note: null }
    })
    .filter((r) => !/^meno$/i.test(r.first_name ?? '')) // hlavička z Excelu
}

const emptyInvite = (): InviteInput => ({ salutation: '', first_name: '', last_name: '', email: '', group_name: '', note: '' })
const emptyQuestion = (): EventQuestion => ({ id: '', label: '', help: null, type: 'choice', options: ['ÁNO', 'NIE'], required: true, show_if: null })

/** Detail podujatia (066): odpovede, pozvaní a nastavenie prihlášky. */
export default function EventAdmin({ data }: { data: EventAdminData }) {
  const { event, invites, responses } = data
  const router = useRouter()
  const params = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'odpovede')
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()

  const answeredIds = useMemo(() => new Set(responses.map((r) => r.invite_id).filter(Boolean) as string[]), [responses])

  const act = <T,>(fn: () => Promise<({ success: true } & T) | { success: false; error: string }>, ok: (r: T) => string, after?: () => void) =>
    start(async () => {
      const res = await fn()
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      setMsg({ kind: 'success', text: ok(res) })
      after?.()
      router.refresh()
    })

  const exportXlsx = () =>
    start(async () => {
      const res = await adminExportResponses(event.id)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      download(res.fileName, res.base64)
    })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/web-dieceza/podujatia" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600">
            <ArrowLeft size={14} /> Podujatia
          </Link>
          <h1 className="text-2xl font-black text-gray-900 mt-1">{event.title}</h1>
          {event.event_when && <p className="text-sm text-gray-500 mt-1">{event.event_when}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${STATUS_CLS[event.status]}`}>{EVENT_STATUS_LABEL[event.status]}</span>
          <Link href={`/admin/web-dieceza/podujatia/${event.id}/nahlad`} target="_blank" className={btnSecondary}>
            <Eye size={14} /> Zobraziť formulár
          </Link>
          <button type="button" onClick={exportXlsx} disabled={pending || !responses.length} className={btnSecondary}>
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Pozvaní', invites.length],
          ['Odpovedali', responses.length],
          ['Bez odpovede', invites.filter((i) => !answeredIds.has(i.id)).length],
          ['Pozvánka neodoslaná', invites.filter((i) => !i.sent_at && !answeredIds.has(i.id)).length],
        ].map(([k, v]) => (
          <div key={k} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{k}</p>
            <p className="text-2xl font-black text-gray-900">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-white p-1 rounded-2xl border border-gray-100 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key)
              setMsg(null)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {tab === 'odpovede' && <ResponsesTab data={data} pending={pending} act={act} />}
      {tab === 'pozvani' && <InvitesTab data={data} answeredIds={answeredIds} pending={pending} act={act} />}
      {tab === 'nastavenie' && (
        <SettingsTab
          key={event.id}
          data={data}
          pending={pending}
          onSave={(input) => act(() => adminSaveEvent(event.id, input), () => 'Uložené.')}
          onDelete={() =>
            start(async () => {
              const res = await adminDeleteEvent(event.id)
              if (!res.success) return setMsg({ kind: 'error', text: res.error })
              router.push('/admin/web-dieceza/podujatia')
            })
          }
        />
      )}
    </div>
  )
}

type Act = <T>(fn: () => Promise<({ success: true } & T) | { success: false; error: string }>, ok: (r: T) => string, after?: () => void) => void

// ------------------------------------------------------------ odpovede

function ResponsesTab({ data, pending, act }: { data: EventAdminData; pending: boolean; act: Act }) {
  const { event, invites, responses } = data
  const [open, setOpen] = useState<string | null>(null)
  const groupOf = new Map(invites.map((i) => [i.id, i.group_name]))
  const choiceQs = event.questions.filter((q) => q.type === 'choice')

  const totals = choiceQs.map((q) => {
    const counts = Object.fromEntries(q.options.map((o) => [o, 0])) as Record<string, number>
    for (const r of responses) {
      const a = r.answers[q.id]
      if (a && a in counts && visibleQuestions(event.questions, r.answers).some((v) => v.id === q.id)) counts[a]++
    }
    return { q, counts }
  })
  const textCounts = event.questions.filter((q) => q.type !== 'choice').map((q) => ({ q, n: responses.filter((r) => r.answers[q.id]).length }))

  return (
    <div className="space-y-6">
      {(totals.length > 0 || textCounts.length > 0) && (
        <div className={cardCls}>
          <SectionTitle title="Súhrn" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {totals.map(({ q, counts }) => (
              <div key={q.id} className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm font-bold text-gray-700">{short(q.label)}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(counts).map(([o, n]) => (
                    <span key={o} className="text-sm text-gray-500">
                      {o}: <strong className="text-gray-900 text-lg">{n}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {textCounts.map(({ q, n }) => (
              <div key={q.id} className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm font-bold text-gray-700">{short(q.label)}</p>
                <p className="mt-2 text-sm text-gray-500">
                  vyplnené: <strong className="text-gray-900 text-lg">{n}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`${cardCls} p-0 overflow-x-auto`}>
        {responses.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">Zatiaľ nikto neodpovedal.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3">Meno</th>
                <th className="px-3 py-3">Skupina</th>
                {choiceQs.map((q) => (
                  <th key={q.id} className="px-3 py-3">{short(q.label)}</th>
                ))}
                <th className="px-3 py-3">Odoslané</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {responses.map((r) => {
                const visible = visibleQuestions(event.questions, r.answers)
                return (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(open === r.id ? null : r.id)}>
                      <td className="px-5 py-3">
                        <p className="font-bold text-gray-900">{r.last_name} {r.first_name}</p>
                        <p className="text-xs text-gray-400">{r.email}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-500">{(r.invite_id && groupOf.get(r.invite_id)) || ''}</td>
                      {choiceQs.map((q) => (
                        <td key={q.id} className="px-3 py-3 font-bold">{visible.some((v) => v.id === q.id) ? r.answers[q.id] ?? '–' : ''}</td>
                      ))}
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{fmt(r.updated_at)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Zmazať odpoveď – ${r.first_name} ${r.last_name}?`)) act(() => adminDeleteResponse(event.id, r.id), () => 'Odpoveď zmazaná.')
                          }}
                          className={btnIconDanger}
                          title="Zmazať odpoveď"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                    {open === r.id && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={choiceQs.length + 4} className="px-5 py-4">
                          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                            {visible.map((q) => (
                              <div key={q.id}>
                                <dt className="text-xs text-gray-400">{q.label.replace(/:\s*$/, '')}</dt>
                                <dd className="font-bold text-gray-900 whitespace-pre-line">{r.answers[q.id] || '–'}</dd>
                              </div>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ pozvaní

type InviteFilter = 'all' | 'unanswered' | 'unsent'

function InvitesTab({ data, answeredIds, pending, act }: { data: EventAdminData; answeredIds: Set<string>; pending: boolean; act: Act }) {
  const { event, invites } = data
  const [one, setOne] = useState<InviteInput>(emptyInvite())
  const [bulk, setBulk] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [filter, setFilter] = useState<InviteFilter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [edit, setEdit] = useState<{ id: string; form: InviteInput } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const unsent = (i: AdminInvite) => !i.sent_at && !answeredIds.has(i.id)
  const list = invites.filter((i) => (filter === 'unanswered' ? !answeredIds.has(i.id) : filter === 'unsent' ? unsent(i) : true))
  const parsed = useMemo(() => parseInvites(bulk), [bulk])
  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })

  const send = (ids: string[], label: string) => {
    if (!ids.length) return
    if (event.status === 'draft' && !confirm('Podujatie je v príprave. Prihláška bude fungovať, ale skontrolujte, či sú otázky hotové. Poslať aj tak?')) return
    if (!confirm(`${label}: ${ids.length} ${ids.length === 1 ? 'pozvánka' : ids.length < 5 ? 'pozvánky' : 'pozvánok'}. Odoslať?`)) return
    act(
      () => adminSendInvites(event.id, ids),
      (r: { sent: number; failed: number; withoutEmail: number }) =>
        `Odoslané: ${r.sent}${r.failed ? `, zlyhalo: ${r.failed}` : ''}${r.withoutEmail ? `, bez e-mailu: ${r.withoutEmail}` : ''}.`,
      () => setSelected(new Set())
    )
  }

  const copy = async (i: AdminInvite) => {
    await navigator.clipboard.writeText(i.url)
    setCopied(i.id)
    setTimeout(() => setCopied(null), 1500)
  }

  const status = (i: AdminInvite) => {
    if (answeredIds.has(i.id)) return <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">Odpovedal(a){i.source === 'public' ? ' cez QR' : ''}</span>
    if (i.opened_at) return <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">Otvoril(a) {fmt(i.opened_at)}</span>
    if (i.sent_at) return <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold">Odoslaná {fmt(i.sent_at)}{i.send_count > 1 ? ` (${i.send_count}×)` : ''}</span>
    return <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">Neodoslaná</span>
  }

  const inviteFields = (f: InviteInput, set: (f: InviteInput) => void) => (
    <>
      <input value={f.salutation ?? ''} onChange={(e) => set({ ...f, salutation: e.target.value })} placeholder="Oslovenie (Vážený otec biskup)" className={inputCls} />
      <input value={f.first_name ?? ''} onChange={(e) => set({ ...f, first_name: e.target.value })} placeholder="Meno" className={inputCls} />
      <input value={f.last_name} onChange={(e) => set({ ...f, last_name: e.target.value })} placeholder="Priezvisko *" className={inputCls} />
      <input value={f.email ?? ''} onChange={(e) => set({ ...f, email: e.target.value })} placeholder="E-mail" className={inputCls} />
      <input value={f.group_name ?? ''} onChange={(e) => set({ ...f, group_name: e.target.value })} placeholder="Skupina (biskupi, hostia…)" className={inputCls} />
    </>
  )

  return (
    <div className="space-y-6">
      <PublicLinkCard data={data} pending={pending} act={act} />
      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle title="Pridať pozvaného" description="Oslovenie sa použije v pozvánke (inak „Dobrý deň“). Bez e-mailu sa dá poslať odkaz aj ručne – tlačidlo kopírovať." />
          <button type="button" onClick={() => setShowBulk((v) => !v)} className={btnSecondary}>
            {showBulk ? 'Jeden po jednom' : 'Vložiť zoznam z Excelu'}
          </button>
        </div>
        {showBulk ? (
          <div className="space-y-3">
            <textarea
              rows={8}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder={'Stĺpce: Meno, Priezvisko, E-mail, Skupina, Oslovenie\n(skopírujte bunky z Excelu, alebo oddeľte bodkočiarkou)\n\nJozef\tNovák\tjozef.novak@example.sk\tHostia\tVážený pán starosta'}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={pending || !parsed.length}
                onClick={() => act(() => adminAddInvites(event.id, parsed), (r: { added: number; skipped: number }) => `Pridaných: ${r.added}${r.skipped ? `, preskočené (e-mail už v zozname): ${r.skipped}` : ''}.`, () => setBulk(''))}
                className={btnPrimary}
              >
                <Plus size={16} /> Pridať {parsed.length || ''}
              </button>
              {parsed.length > 0 && (
                <p className="text-xs text-gray-500">
                  Prvý riadok: <strong>{fullName({ first_name: parsed[0].first_name, last_name: parsed[0].last_name }) || '?'}</strong> · {parsed[0].email || 'bez e-mailu'} · {parsed[0].group_name || 'bez skupiny'}
                </p>
              )}
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              act(() => adminAddInvites(event.id, [one]), () => 'Pridané.', () => setOne(emptyInvite()))
            }}
            className="grid sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr_1fr_auto] gap-2"
          >
            {inviteFields(one, setOne)}
            <button type="submit" disabled={pending || !one.last_name.trim()} className={btnPrimary}>
              <Plus size={16} />
            </button>
          </form>
        )}
      </div>

      <div className={`${cardCls} p-0`}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
          <div className="flex gap-1">
            {(
              [
                ['all', `Všetci (${invites.length})`],
                ['unanswered', `Bez odpovede (${invites.filter((i) => !answeredIds.has(i.id)).length})`],
                ['unsent', `Neodoslané (${invites.filter(unsent).length})`],
              ] as [InviteFilter, string][]
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${filter === k ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending || !selected.size} onClick={() => send([...selected], 'Vybraným')} className={btnSecondary}>
              <Send size={14} /> Poslať vybraným ({selected.size})
            </button>
            <button
              type="button"
              disabled={pending || !invites.some((i) => unsent(i) && i.email)}
              onClick={() => send(invites.filter((i) => unsent(i) && i.email).map((i) => i.id), 'Všetkým, ktorým ešte nebola poslaná')}
              className={btnPrimary}
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Poslať neodoslané
            </button>
          </div>
        </div>
        {list.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">Žiadni pozvaní.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((i) =>
              edit?.id === i.id ? (
                <li key={i.id} className="p-4 grid sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr_1fr_auto] gap-2 bg-blue-50/30">
                  {inviteFields(edit.form, (form) => setEdit({ id: i.id, form }))}
                  <div className="flex gap-1">
                    <button type="button" disabled={pending} onClick={() => act(() => adminUpdateInvite(event.id, i.id, edit.form), () => 'Uložené.', () => setEdit(null))} className={btnIcon} title="Uložiť">
                      <Save size={16} />
                    </button>
                    <button type="button" onClick={() => setEdit(null)} className={btnIcon} title="Zrušiť">
                      <X size={16} />
                    </button>
                  </div>
                </li>
              ) : (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} className={checkboxCls} disabled={!i.email} />
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-gray-900">
                      {i.last_name} {i.first_name}
                      {i.group_name && <span className="ml-2 text-xs font-bold text-gray-400">{i.group_name}</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {i.email || 'bez e-mailu'}
                      {i.salutation && ` · ${i.salutation}`}
                    </p>
                  </div>
                  {status(i)}
                  <div className="flex">
                    <button type="button" onClick={() => copy(i)} className={btnIcon} title="Kopírovať osobný odkaz">
                      {copied === i.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                    </button>
                    {i.email && (
                      <button type="button" disabled={pending} onClick={() => send([i.id], i.sent_at ? 'Znova poslať' : 'Poslať')} className={btnIcon} title={i.sent_at ? 'Poslať pozvánku znova' : 'Poslať pozvánku'}>
                        <Send size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEdit({ id: i.id, form: { salutation: i.salutation, first_name: i.first_name, last_name: i.last_name, email: i.email, group_name: i.group_name, note: i.note } })}
                      className={btnIcon}
                      title="Upraviť"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (confirm(`Odstrániť ${fullName(i)} zo zoznamu pozvaných?${answeredIds.has(i.id) ? ' Zmaže sa aj jeho/jej odpoveď.' : ''}`)) act(() => adminDeleteInvite(event.id, i.id), () => 'Odstránené.')
                      }}
                      className={btnIconDanger}
                      title="Odstrániť"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ spoločný odkaz (QR) pre pozvánky poštou

function PublicLinkCard({ data, pending, act }: { data: EventAdminData; pending: boolean; act: Act }) {
  const { event, invites } = data
  const url = event.public_url
  const [svg, setSvg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const viaQr = invites.filter((i) => i.source === 'public').length

  useEffect(() => {
    if (!url) return
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setSvg)
  }, [url])

  const save = async (kind: 'png' | 'svg') => {
    if (!url) return
    const a = document.createElement('a')
    a.download = `qr-${event.slug}.${kind}`
    if (kind === 'png') a.href = await QRCode.toDataURL(url, { width: 1200, margin: 2, errorCorrectionLevel: 'M' })
    else a.href = URL.createObjectURL(new Blob([await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })], { type: 'image/svg+xml' }))
    a.click()
  }

  return (
    <div className={cardCls}>
      <SectionTitle
        title="Pozvánky poštou – QR kód"
        description="Jeden spoločný odkaz pre všetky tlačené pozvánky. Kto sa cez neho prihlási, pribudne tu medzi pozvaných (skupina „Poštou (QR)“) a v potvrdení dostane vlastný odkaz na úpravu."
      />
      {!url ? (
        <button type="button" disabled={pending} onClick={() => act(() => adminSetPublicLink(event.id, true), () => 'Spoločný odkaz je vytvorený.')} className={btnPrimary}>
          <QrCode size={16} /> Vytvoriť QR kód
        </button>
      ) : (
        <div className="flex flex-wrap gap-6 items-start">
          {svg ? <div className="w-40 h-40 shrink-0 bg-white" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="w-40 h-40 shrink-0 bg-gray-50 rounded-xl" />}
          <div className="flex-1 min-w-[240px] space-y-3">
            <p className="text-sm font-mono break-all text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{url}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => save('png')} className={btnSecondary}><Download size={14} /> PNG (tlač)</button>
              <button type="button" onClick={() => save('svg')} className={btnSecondary}><Download size={14} /> SVG (grafik)</button>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(url)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
                className={btnSecondary}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} Kopírovať odkaz
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Cez QR sa prihlásilo: <strong className="text-gray-900">{viaQr}</strong>. Na pozvánku vytlačte aj adresu pre tých, ktorí QR nepoužijú.
            </p>
            <div className="flex flex-wrap gap-4 pt-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm('Vytvoriť nový odkaz? Starý QR kód (aj už vytlačený) prestane fungovať.')) act(() => adminSetPublicLink(event.id, true), () => 'Vytvorený nový odkaz – starý QR už nefunguje.')
                }}
                className="text-xs font-bold text-gray-500 hover:text-blue-600 cursor-pointer"
              >
                Vytvoriť nový odkaz
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm('Vypnúť spoločný odkaz? Vytlačený QR kód prestane fungovať.')) act(() => adminSetPublicLink(event.id, false), () => 'Spoločný odkaz je vypnutý.')
                }}
                className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
              >
                Vypnúť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------ nastavenie

const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function SettingsTab({ data, pending, onSave, onDelete }: { data: EventAdminData; pending: boolean; onSave: (i: EventInput) => void; onDelete: () => void }) {
  const { event, responses } = data
  const [f, setF] = useState<EventInput>({
    title: event.title,
    slug: event.slug,
    event_when: event.event_when,
    intro: event.intro,
    thanks_text: event.thanks_text,
    closes_at: event.closes_at,
    status: event.status,
    questions: event.questions,
  })
  const setQ = (i: number, patch: Partial<EventQuestion>) => setF((x) => ({ ...x, questions: x.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) }))
  const moveQ = (i: number, dir: -1 | 1) =>
    setF((x) => {
      if (i + dir < 0 || i + dir >= x.questions.length) return x
      const qs = [...x.questions]
      ;[qs[i], qs[i + dir]] = [qs[i + dir], qs[i]]
      return { ...x, questions: qs }
    })

  return (
    <div className="space-y-6">
      <div className={`${cardCls} space-y-4`}>
        <SectionTitle title="Podujatie" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Názov">
            <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Dátum a miesto" hint="Zobrazí sa na prihláške aj v e-mailoch.">
            <input value={f.event_when ?? ''} onChange={(e) => setF({ ...f, event_when: e.target.value })} className={inputCls} placeholder="sobota 28. novembra 2026, Katedrála Najsvätejšej Trojice, Žilina" />
          </Field>
          <Field label="Stav">
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as EventStatus })} className={inputCls}>
              {(Object.keys(EVENT_STATUS_LABEL) as EventStatus[]).map((s) => (
                <option key={s} value={s}>{EVENT_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="Uzávierka prihlášok" hint="Prázdne = do prepnutia na Uzavreté.">
            <input type="datetime-local" value={toLocalInput(f.closes_at)} onChange={(e) => setF({ ...f, closes_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className={inputCls} />
          </Field>
          <Field label="Adresa (slug)" hint={`www.dcza.sk/podujatia/${f.slug || '…'}?k=…  – po rozoslaní pozvánok nemeniť.`}>
            <input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Field label="Úvodný text na prihláške">
          <textarea rows={3} value={f.intro ?? ''} onChange={(e) => setF({ ...f, intro: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Text po odoslaní" hint="Napr. praktické informácie: parkovanie, vstup, kontakt.">
          <textarea rows={3} value={f.thanks_text ?? ''} onChange={(e) => setF({ ...f, thanks_text: e.target.value })} className={inputCls} />
        </Field>
      </div>

      <div className={`${cardCls} space-y-4`}>
        <SectionTitle title="Otázky" description="Meno, priezvisko a e-mail sú na prihláške vždy (predvyplnené z pozvánky). Pri zmene otázok po prvých odpovediach ponechajte pôvodné otázky – odpovede sú viazané na ne." />
        {f.questions.map((q, i) => {
          const earlier = f.questions.slice(0, i).filter((x) => x.type === 'choice' && x.label.trim())
          return (
            <div key={i} className="rounded-2xl border border-gray-100 p-4 space-y-3">
              {/* inputCls má w-full – šírky určuje mriežka (text otázky široký, typ úzky) */}
              <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] sm:grid-cols-[1.25rem_minmax(0,1fr)_11rem_auto] gap-2 items-start">
                <span className="mt-3 text-xs font-black text-gray-300">{i + 1}.</span>
                <input value={q.label} onChange={(e) => setQ(i, { label: e.target.value })} placeholder="Otázka (napr. Účasť na obede / Lunch attendance)" className={inputCls} />
                <select value={q.type} onChange={(e) => setQ(i, { type: e.target.value as QuestionType })} className={`${inputCls} col-start-2 sm:col-start-auto`}>
                  {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((t) => (
                    <option key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</option>
                  ))}
                </select>
                <div className="flex col-start-2 sm:col-start-auto">
                  <button type="button" onClick={() => moveQ(i, -1)} className={btnIcon} title="Vyššie"><ArrowUp size={15} /></button>
                  <button type="button" onClick={() => moveQ(i, 1)} className={btnIcon} title="Nižšie"><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => setF((x) => ({ ...x, questions: x.questions.filter((_, k) => k !== i) }))} className={btnIconDanger} title="Odstrániť otázku"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 pl-7">
                <input value={q.help ?? ''} onChange={(e) => setQ(i, { help: e.target.value })} placeholder="Pomocný text (nepovinné)" className={inputCls} />
                {q.type === 'choice' ? (
                  <input
                    key={`${i}|${q.options.join(',')}`}
                    defaultValue={q.options.join(', ')}
                    onBlur={(e) => setQ(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                    placeholder="Možnosti oddelené čiarkou: ÁNO, NIE"
                    className={inputCls}
                  />
                ) : (
                  <span />
                )}
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} className={checkboxCls} /> Povinná
                </label>
                {earlier.length > 0 && (
                  <select
                    value={q.show_if ? `${q.show_if.question}|${q.show_if.equals}` : ''}
                    onChange={(e) => {
                      const [question, equals] = e.target.value.split('|')
                      setQ(i, { show_if: e.target.value ? { question, equals } : null })
                    }}
                    className={inputCls}
                  >
                    <option value="">Zobraziť vždy</option>
                    {earlier.flatMap((x) =>
                      x.options.map((o) => (
                        <option key={`${x.id || x.label}|${o}`} value={`${x.id}|${o}`} disabled={!x.id}>
                          Len ak „{short(x.label)}“ = {o}{!x.id ? ' (najprv uložte)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
            </div>
          )
        })}
        <button type="button" onClick={() => setF((x) => ({ ...x, questions: [...x.questions, emptyQuestion()] }))} className={btnSecondary}>
          <Plus size={14} /> Pridať otázku
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" disabled={pending} onClick={() => onSave(f)} className={btnPrimary}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Zmazať podujatie „${event.title}“ so všetkými pozvanými${responses.length ? ` a ${responses.length} odpoveďami` : ''}? Nedá sa vrátiť.`)) onDelete()
          }}
          className="text-sm font-bold text-red-600 hover:underline cursor-pointer"
        >
          Zmazať podujatie
        </button>
      </div>
    </div>
  )
}
