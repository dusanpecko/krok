'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2, Pencil } from 'lucide-react'
import { sendRsvp } from '@/app/dcza/podujatia/[slug]/actions'
import { visibleQuestions, type EventQuestion, type PublicEvent } from '@/lib/diocese/events-shared'

type Person = { first_name: string; last_name: string; email: string }
type Saved = Person & { answers: Record<string, string>; updated_at: string }

const inputCls = 'w-full px-4 py-3 rounded-xl bg-white border border-blue/15 focus:outline-none focus:ring-4 focus:ring-blue/10 focus:border-blue/40'
const labelText = (l: string) => l.replace(/:\s*$/, '')

function Label({ text, required, help }: { text: string; required?: boolean; help?: string | null }) {
  return (
    <span className="block mb-1.5">
      <span className="font-bold text-ink">{labelText(text)}</span>
      {required && <span className="text-red-600"> *</span>}
      {help && <span className="block text-sm text-mute">{help}</span>}
    </span>
  )
}

function Summary({ questions, data }: { questions: EventQuestion[]; data: Saved }) {
  const rows = [
    ['Meno / Name', `${data.first_name} ${data.last_name}`],
    ['E-mail', data.email],
    ...visibleQuestions(questions, data.answers)
      .filter((q) => data.answers[q.id])
      .map((q) => [labelText(q.label), data.answers[q.id]]),
  ]
  return (
    <dl className="mt-4 divide-y divide-blue/10 text-[15px]">
      {rows.map(([k, v], i) => (
        <div key={i} className="py-2 grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4">
          <dt className="text-mute">{k}</dt>
          <dd className="font-bold whitespace-pre-line break-words">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Prihláška na podujatie (osobný odkaz) – po odoslaní zhrnutie s možnosťou úpravy. */
export default function RsvpForm({ slug, token: initialToken, mode, preview = false, event, invite, response }: { slug: string; token: string; mode: 'invite' | 'public'; preview?: boolean; event: PublicEvent; invite: Person; response: Saved | null }) {
  // po prihlásení cez spoločný odkaz (QR) sa ďalšie úpravy robia už cez osobný odkaz
  const [token, setToken] = useState(initialToken)
  const [saved, setSaved] = useState<Saved | null>(response)
  const [editing, setEditing] = useState(!response)
  const [person, setPerson] = useState<Person>(response ?? invite)
  const [answers, setAnswers] = useState<Record<string, string>>(response?.answers ?? {})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const questions = visibleQuestions(event.questions, answers)
  const setAnswer = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    start(async () => {
      // náhľad v admine – nič neukladá, len ukáže, čo uvidí hosť po odoslaní
      const res = preview
        ? ({ success: true, token, emailed: true } as const)
        : await sendRsvp(slug, token, { ...person, answers })
      if (!res.success) return setError(res.error)
      if (!preview && res.token !== token) {
        setToken(res.token)
        window.history.replaceState(null, '', `/podujatia/${slug}?k=${res.token}`)
      }
      const kept = Object.fromEntries(questions.filter((q) => answers[q.id]?.trim()).map((q) => [q.id, answers[q.id].trim()]))
      setSaved({ ...person, answers: kept, updated_at: new Date().toISOString() })
      setEditing(false)
      setNotice(
        res.emailed
          ? `Potvrdenie s odkazom na úpravu sme poslali na ${person.email}. / A confirmation with an edit link has been sent to your e-mail.`
          : 'Prihláška je uložená. / Your registration has been saved.'
      )
      if (!preview) window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  if (!event.open && !preview) {
    return (
      <div className="mt-10 rounded-2xl bg-white border border-blue/10 p-6">
        <p className="font-extrabold">Prihlasovanie je uzavreté. / Registration is closed.</p>
        {saved ? <Summary questions={event.questions} data={saved} /> : <p className="mt-1 text-mute text-sm">Prihlášku ste neodoslali. / You have not registered.</p>}
      </div>
    )
  }

  if (saved && !editing) {
    return (
      <div className="mt-10 rounded-2xl bg-white border border-blue/10 p-6">
        <p className="flex items-center gap-2 text-lg font-extrabold text-green-700">
          <CheckCircle2 size={22} /> Vaša prihláška je zaevidovaná. / You are registered.
        </p>
        {notice && <p className="mt-1 text-sm text-mute">{notice}</p>}
        {event.thanks_text && <div className="mt-4 text-[15px] leading-relaxed space-y-2">{event.thanks_text.split('\n').map((l, i) => (l.trim() ? <p key={i}>{l}</p> : null))}</div>}
        <Summary questions={event.questions} data={saved} />
        <button
          type="button"
          onClick={() => {
            setEditing(true)
            setNotice(null)
          }}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-blue/20 font-bold text-blue hover:bg-blue-soft/40"
        >
          <Pencil size={16} /> Upraviť odpoveď / Edit
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-10 rounded-2xl bg-white border border-blue/10 p-5 sm:p-7 space-y-6">
      {mode === 'public' && !saved && (
        <p className="text-sm text-mute">
          Prihláška k pozvánke, ktorú ste dostali poštou. Na zadaný e-mail Vám pošleme potvrdenie s odkazom, cez ktorý môžete odpoveď neskôr zmeniť. / Registration for the invitation you received by post. We will e-mail you a confirmation with a link to edit your reply.
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <Label text="Meno / Name" required />
          <input required value={person.first_name} onChange={(e) => setPerson({ ...person, first_name: e.target.value })} className={inputCls} autoComplete="given-name" />
        </label>
        <label className="block">
          <Label text="Priezvisko / Surname" required />
          <input required value={person.last_name} onChange={(e) => setPerson({ ...person, last_name: e.target.value })} className={inputCls} autoComplete="family-name" />
        </label>
        <label className="block sm:col-span-2">
          <Label text="E-mail" required help="Pošleme naň potvrdenie. / We will send a confirmation." />
          <input required type="email" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} className={inputCls} autoComplete="email" />
        </label>
      </div>

      {questions.map((q) => (
        <div key={q.id}>
          {q.type === 'choice' ? (
            <fieldset>
              <legend className="contents">
                <Label text={q.label} required={q.required} help={q.help} />
              </legend>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const on = answers[q.id] === o
                  return (
                    <label key={o} className={`cursor-pointer px-4 py-2.5 rounded-xl border font-bold text-sm transition ${on ? 'bg-blue text-white border-blue' : 'bg-white border-blue/15 text-ink/85 hover:border-blue/40'}`}>
                      <input type="radio" name={q.id} value={o} checked={on} required={q.required} onChange={() => setAnswer(q.id, o)} className="sr-only" />
                      {o}
                    </label>
                  )
                })}
                {!q.required && answers[q.id] && (
                  <button type="button" onClick={() => setAnswer(q.id, '')} className="px-3 py-2.5 text-sm text-mute hover:text-blue">
                    zrušiť výber
                  </button>
                )}
              </div>
            </fieldset>
          ) : (
            <label className="block">
              <Label text={q.label} required={q.required} help={q.help} />
              {q.type === 'textarea' ? (
                <textarea rows={3} required={q.required} value={answers[q.id] ?? ''} onChange={(e) => setAnswer(q.id, e.target.value)} className={inputCls} />
              ) : (
                <input required={q.required} value={answers[q.id] ?? ''} onChange={(e) => setAnswer(q.id, e.target.value)} className={inputCls} />
              )}
            </label>
          )}
        </div>
      ))}

      {error && <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" disabled={pending} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue text-white font-extrabold hover:bg-blue/90 disabled:opacity-60">
          {pending && <Loader2 size={18} className="animate-spin" />} {saved ? 'Uložiť zmeny / Save changes' : 'Odoslať prihlášku / Submit'}
        </button>
        {saved && (
          <button type="button" onClick={() => setEditing(false)} className="px-4 py-3 text-sm font-bold text-mute hover:text-blue">
            Zrušiť / Cancel
          </button>
        )}
      </div>
    </form>
  )
}
