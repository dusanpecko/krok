'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Send, Trash2, UserPlus } from 'lucide-react'
import { grantParishAccess, resendParishAccessEmail, revokeParishAccess, type ChangeRequestRow, type ParishAccessRow } from '@/app/admin/farnosti/actions'
import { btnIcon, btnIconDanger, btnPrimary, cardCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'
import ChangeRequestList from './ChangeRequestList'

/** Prístupy farnosti (O7 – prideľuje diecéza) a návrhy zmien od farnosti. */
export default function ParishAccessTab({ parishId, access, requests, defaultEmail }: { parishId: string; access: ParishAccessRow[]; requests: ChangeRequestRow[]; defaultEmail: string | null }) {
  const router = useRouter()
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [role, setRole] = useState<'admin' | 'editor'>(access.some((a) => a.role === 'admin') ? 'editor' : 'admin')
  const [position, setPosition] = useState('farár')
  const [salutation, setSalutation] = useState('')
  const defaultSalutation = position.trim() ? `Vážený pán ${position.trim()}` : 'Dobrý deň'
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const grant = () =>
    startTransition(async () => {
      if (!confirm(`Prideliť prístup k farnosti pre ${email}? Odošle sa e-mail s oslovením „${salutation.trim() || defaultSalutation}“.`)) return
      const res = await grantParishAccess(parishId, { email, role, position, salutation })
      if (res.success) {
        if (!res.emailSent) setMsg({ kind: 'error', text: `Prístup je pridelený, ale e-mail sa nepodarilo odoslať (${res.emailError ?? 'neznáma chyba'}). Skúste „Poslať znova“.` })
        else setMsg({ kind: 'success', text: res.invited ? `Pozvánka bola odoslaná na ${email}.` : `Prístup pridelený, oznámenie odoslané na ${email}.` })
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })
  const resend = (a: ParishAccessRow) =>
    startTransition(async () => {
      const what = a.activated ? 'oznámenie o prístupe' : 'pozvánku s odkazom na nastavenie hesla'
      if (!confirm(`Poslať znova ${what} na ${a.email}?`)) return
      const res = await resendParishAccessEmail(parishId, a.user_id)
      if (res.success) {
        setMsg({ kind: 'success', text: res.invite ? `Nová pozvánka bola odoslaná na ${a.email}.` : `Oznámenie bolo odoslané na ${a.email}.` })
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })
  const revoke = (a: ParishAccessRow) =>
    startTransition(async () => {
      if (!confirm(`Odobrať prístup pre ${a.email}?`)) return
      const res = await revokeParishAccess(parishId, a.user_id)
      if (res.success) router.refresh()
      else setMsg({ kind: 'error', text: res.error })
    })

  return (
    <div className="space-y-6">
      <div className={`${cardCls} space-y-4`}>
        <SectionTitle title="Prístupy do zóny farnosti" description="Účet farnosti vidí /moja-farnost: prehľad plnenia (bez mien darcov), bohoslužby, prezentáciu a návrhy zmien. Admin účet je práve jeden." />
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
              <th className="py-2">E-mail</th><th className="py-2">Rola</th><th className="py-2">Funkcia</th><th className="py-2">Pozvaný</th><th className="py-2">Prvé prihlásenie</th><th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {access.map((a) => (
              <tr key={a.user_id}>
                <td className="py-2 font-bold">{a.email ?? a.user_id}</td>
                <td className="py-2">{a.role === 'admin' ? 'správca účtu' : 'editor'}</td>
                <td className="py-2 text-gray-600">{a.position ?? '—'}</td>
                <td className="py-2 font-mono text-xs">{a.invited_at ? new Date(a.invited_at).toLocaleDateString('sk-SK') : '—'}</td>
                <td className="py-2 font-mono text-xs">{a.accepted_at ? new Date(a.accepted_at).toLocaleDateString('sk-SK') : <span className="text-amber-600 font-sans font-bold">zatiaľ nie</span>}</td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button onClick={() => resend(a)} disabled={pending} className={btnIcon} title={a.activated ? 'Poslať znova oznámenie o prístupe' : 'Poslať pozvánku znova'}><Send size={14} /></button>
                  <button onClick={() => revoke(a)} className={btnIconDanger} title="Odobrať prístup"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {access.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Farnosť zatiaľ nemá prístup.</td></tr>}
          </tbody>
        </table>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end pt-2 border-t border-gray-50">
          <Field label="E-mail" className="md:col-span-2"><input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} type="email" /></Field>
          <Field label="Rola">
            <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'editor')} className={inputCls}>
              <option value="admin">správca účtu</option>
              <option value="editor">editor (bez prehľadu darov a návrhov)</option>
            </select>
          </Field>
          <Field label="Funkcia"><input value={position} onChange={(e) => setPosition(e.target.value)} className={inputCls} /></Field>
          <Field label="Oslovenie v e-maile" className="md:col-span-2" hint="Prázdne = podľa funkcie. Text e-mailu upravíte v E-mailových šablónach.">
            <input value={salutation} onChange={(e) => setSalutation(e.target.value)} placeholder={defaultSalutation} className={inputCls} />
          </Field>
          <div className="md:col-span-2 flex justify-end">
            <button onClick={grant} disabled={pending || !email} className={btnPrimary}>
              {pending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Prideliť prístup
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 flex items-center gap-1">
          <Mail size={12} /> Nový účet dostane pozvánku s odkazom na nastavenie hesla (šablóna „Pozvánka do zóny farnosti“), existujúci účet oznámenie o prístupe.
        </p>
      </div>

      <div className={cardCls}>
        <SectionTitle title="Návrhy zmien od farnosti" />
        <ChangeRequestList requests={requests} />
      </div>
    </div>
  )
}
