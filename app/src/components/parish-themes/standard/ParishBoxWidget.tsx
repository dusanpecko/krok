'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Bell, CreditCard, Loader2 } from 'lucide-react'
import { startOnlineDonation } from '@/app/(public)/platby/actions'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { BOX_PRESETS, type PublicParishBox } from '@/lib/parish-box/types'
import { formatEur } from '@/lib/projects/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputCls =
  'w-full bg-white border border-blue/15 focus:border-blue rounded-xl py-3 px-4 text-ink text-sm outline-none placeholder:text-mute/70'

/**
 * E-zvonček farnosti (O31–O38): online dar pre farnosť cez Mollie, jednorazovo alebo mesačne,
 * aj bez registrácie. Peniaze prijme fond a mesačne ich odovzdá farnosti.
 */
export default function ParishBoxWidget({ parishId, parishName, box }: { parishId: string; parishName: string; box: PublicParishBox }) {
  const { session } = useSupabase()
  const [recurring, setRecurring] = useState(false)
  const [preset, setPreset] = useState<number | 'custom'>(BOX_PRESETS[1])
  const [custom, setCustom] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.email && !email) setEmail(session.user.email)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email])

  const amount = preset === 'custom' ? Number(custom.replace(',', '.')) || 0 : preset

  const pay = async () => {
    setError(null)
    if (amount < 1) return setError('Minimálna suma daru je 1 €.')
    if (!EMAIL_RE.test(email.trim())) return setError('Zadajte e-mail – pošleme naň potvrdenie o dare.')
    setLoading(true)
    const res = await startOnlineDonation({
      amount,
      recurring,
      interval: 'month',
      email: email.trim(),
      name: name.trim(),
      parishBoxId: parishId,
    })
    if (res.success) {
      window.location.href = res.url
      return
    }
    setError(res.error)
    setLoading(false)
  }

  const toggle = (on: boolean) =>
    `flex-1 py-2.5 text-sm font-extrabold rounded-lg transition-all cursor-pointer ${on ? 'bg-blue text-white shadow-md' : 'text-mute hover:text-ink'}`

  return (
    <div id="zvoncek" className="scroll-mt-28 rounded-3xl border border-blue/15 bg-white p-6 sm:p-8 shadow-sm text-left">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold-ink shrink-0">
          <Bell size={20} />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-blue">E-zvonček</p>
          <h2 className="text-xl sm:text-2xl font-light leading-tight">{box.title}</h2>
        </div>
      </div>
      <p className="text-sm text-mute mb-5">
        {box.description ?? `Váš dar pomáha farnosti ${parishName}. Celú sumu po odpočítaní poplatkov platobnej brány a fondu mesačne odovzdáme farnosti.`}
      </p>

      <div className="flex bg-paper p-1 rounded-xl border border-blue/10 mb-4">
        <button type="button" onClick={() => setRecurring(false)} className={toggle(!recurring)}>Jednorazovo</button>
        <button type="button" onClick={() => setRecurring(true)} className={toggle(recurring)}>Mesačne</button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        {BOX_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            className={`py-3 rounded-xl text-sm font-extrabold border transition-all cursor-pointer ${
              preset === p ? 'bg-gold/15 border-gold text-ink' : 'bg-paper border-blue/10 text-mute hover:text-ink hover:border-blue/30'
            }`}
          >
            {p} €
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPreset('custom')}
        className={`w-full py-2.5 rounded-xl text-sm font-extrabold border transition-all mb-3 cursor-pointer ${
          preset === 'custom' ? 'bg-gold/15 border-gold text-ink' : 'bg-paper border-blue/10 text-mute hover:text-ink'
        }`}
      >
        Iná suma
      </button>
      {preset === 'custom' && (
        <div className="relative mb-3">
          <input type="number" min={1} inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Suma" aria-label="Vlastná suma" className={`${inputCls} pr-10 font-mono`} />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-mute font-extrabold">€</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-2 mb-4">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Meno (nepovinné)" aria-label="Meno" autoComplete="name" className={inputCls} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail *" aria-label="E-mail" autoComplete="email" className={inputCls} />
      </div>

      {error && (
        <p className="flex items-start gap-2 text-xs text-red mb-3">
          <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={pay}
        disabled={loading || amount < 1}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep font-extrabold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
        {loading ? 'Presmerúvame na platobnú bránu…' : `Darovať ${amount > 0 ? formatEur(amount) : ''}${recurring ? ' mesačne' : ''}`}
      </button>
      <p className="text-[11px] text-mute text-center mt-3">
        Karta, Apple Pay, Google Pay – cez Mollie. Dar prijíma Pastoračný fond KROK a mesačne ho odovzdá farnosti.
        {recurring && ' Pravidelný dar môžete kedykoľvek zrušiť vo svojom profile alebo odpoveďou na potvrdzujúci e-mail.'}
      </p>
    </div>
  )
}
