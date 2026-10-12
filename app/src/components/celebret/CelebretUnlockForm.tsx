'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2 } from 'lucide-react'
import { unlockCelebret } from '@/app/celebret/actions'

/** Pole na heslo z karty – po správnom hesle sa stránka obnoví s celými údajmi. */
export default function CelebretUnlockForm({ token }: { token: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      setError(null)
      const res = await unlockCelebret(token, code)
      if (!res.success) return setError(res.error ?? 'Chyba.')
      router.refresh()
    })
  }
  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl bg-paper-warm border border-blue/10 p-5">
      <p className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest text-ink">
        <KeyRound size={16} className="text-gold-ink" /> Password
      </p>
      <p className="mt-1 text-xs text-mute leading-relaxed">
        Ad plura videnda tesseram e charta inserite.
        <br />
        Enter the password printed on the card · Zadajte heslo z karty
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••"
          aria-label="Password"
          className="w-28 text-center text-2xl font-black tracking-[0.4em] px-3 py-2.5 rounded-xl border border-blue/20 bg-white focus:outline-none focus:ring-4 focus:ring-blue/10"
        />
        <button type="submit" disabled={pending || code.length !== 4} className="px-5 py-2.5 rounded-xl bg-blue text-white font-extrabold disabled:opacity-40 cursor-pointer">
          {pending ? <Loader2 size={18} className="animate-spin" /> : 'OK'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
    </form>
  )
}
