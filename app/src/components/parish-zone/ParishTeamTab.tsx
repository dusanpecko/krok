'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2, Send, Trash2, UserPlus } from 'lucide-react'
import { addMyParishEditor, getMyParishTeam, removeMyParishEditor, resendMyParishEditorEmail, type ParishTeamMember } from '@/app/moja-farnost/team-actions'
import { btnIcon, btnIconDanger, btnPrimary, cardCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

/** Ľudia s prístupom (070): správca farnosti pridá / odoberie editora stránky (napr. ministranta). */
export default function ParishTeamTab({ parishId }: { parishId: string }) {
  const [team, setTeam] = useState<ParishTeamMember[] | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const load = () => getMyParishTeam(parishId).then(setTeam, (e) => setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Zoznam sa nepodarilo načítať.' }))
  useEffect(() => {
    getMyParishTeam(parishId).then(setTeam, (e) => setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Zoznam sa nepodarilo načítať.' }))
  }, [parishId])

  const add = () =>
    startTransition(async () => {
      setMsg(null)
      const res = await addMyParishEditor(parishId, { email, name })
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      setMsg(
        res.emailSent
          ? { kind: 'success', text: `Prístup je pridaný, na ${email.trim()} odišiel e-mail s pozvánkou.` }
          : { kind: 'error', text: `Prístup je pridaný, ale e-mail sa nepodarilo odoslať (${res.emailError ?? 'neznáma chyba'}). Skúste „Poslať znova“.` }
      )
      setEmail('')
      setName('')
      load()
    })
  const resend = (m: ParishTeamMember) =>
    startTransition(async () => {
      if (!confirm(`Poslať pozvánku znova na ${m.email}?`)) return
      const res = await resendMyParishEditorEmail(parishId, m.user_id)
      setMsg(res.success ? { kind: 'success', text: `Pozvánka odišla na ${m.email}.` } : { kind: 'error', text: res.error })
      load()
    })
  const remove = (m: ParishTeamMember) =>
    startTransition(async () => {
      if (!confirm(`Odobrať prístup pre ${m.email}?`)) return
      const res = await removeMyParishEditor(parishId, m.user_id)
      if (!res.success) setMsg({ kind: 'error', text: res.error })
      load()
    })

  return (
    <div className={`${cardCls} space-y-5`}>
      <SectionTitle
        title="Ľudia s prístupom"
        description="Farár (administrátor) a farský vikár majú prístup podľa schematizmu diecézy. Ďalším ľuďom – napr. ministrantovi alebo kostolníkovi – môžete sprístupniť úpravu stránky farnosti. Editor nevidí prehľad príspevkov ani e-zvonček."
      />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {!team ? (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Načítavam…
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {team.map((m) => (
            <li key={m.user_id} className="py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <p className="font-bold text-gray-900 break-all">{m.email ?? '—'}</p>
                <p className="text-xs text-gray-500">
                  {m.role === 'admin' ? 'správca farnosti' : 'editor stránky'}
                  {m.position && ` · ${m.position}`}
                  {m.source === 'clergy' && ' · podľa schematizmu'}
                  {!m.activated && m.source !== 'clergy' && ' · zatiaľ sa neprihlásil'}
                </p>
              </div>
              {m.removable && (
                <span className="whitespace-nowrap">
                  {!m.activated && (
                    <button type="button" onClick={() => resend(m)} disabled={pending} className={btnIcon} title="Poslať pozvánku znova">
                      <Send size={14} />
                    </button>
                  )}
                  <button type="button" onClick={() => remove(m)} disabled={pending} className={btnIconDanger} title="Odobrať prístup">
                    <Trash2 size={14} />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end pt-4 border-t border-gray-100">
        <Field label="E-mail" className="md:col-span-2" hint="Akákoľvek adresa (aj Gmail).">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputCls} placeholder="meno@gmail.com" />
        </Field>
        <Field label="Meno a úloha" className="md:col-span-2" hint="Napr. Jakub Novák – ministrant">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={80} />
        </Field>
        <button type="button" onClick={add} disabled={pending || !email.trim()} className={btnPrimary}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Pridať editora
        </button>
      </div>
    </div>
  )
}
