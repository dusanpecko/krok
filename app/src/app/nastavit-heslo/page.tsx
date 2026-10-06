'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import AuthCard, { authBtnCls, authInputCls } from '@/components/auth/AuthCard'

/** Nastavenie hesla po pozvánke do zóny farnosti alebo po „Zabudli ste heslo?“ (session z /auth/confirm). */
function SetPasswordForm() {
  const { supabase, session, sessionChecked } = useSupabase()
  const params = useSearchParams()
  const nextParam = params.get('next')
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/auth/post-login'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!sessionChecked) {
    return (
      <AuthCard title="Nastavenie hesla">
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-blue" /></div>
      </AuthCard>
    )
  }

  if (!session) {
    return (
      <AuthCard title="Odkaz už neplatí">
        <p className="text-sm text-mute text-center mb-6">
          Odkaz na nastavenie hesla vypršal alebo už bol použitý. Požiadajte o nový cez „Zabudli ste heslo?“.
        </p>
        <Link href="/zabudnute-heslo" className={`${authBtnCls} block text-center`}>Poslať nový odkaz</Link>
      </AuthCard>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Heslo musí mať aspoň 8 znakov.')
    if (password !== confirm) return setError('Heslá sa nezhodujú.')
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setLoading(false)
      return setError(err.message.includes('different') ? 'Nové heslo musí byť iné ako doterajšie.' : 'Heslo sa nepodarilo uložiť. Skúste to znova.')
    }
    window.location.assign(next)
  }

  return (
    <AuthCard title="Nastavenie hesla">
      <p className="text-sm text-mute text-center mb-6">
        Účet: <strong className="text-ink">{session.user.email}</strong>. Zvoľte si heslo, ktorým sa budete prihlasovať.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input type="password" autoComplete="new-password" placeholder="Nové heslo (aspoň 8 znakov)" value={password} onChange={(e) => setPassword(e.target.value)} className={authInputCls} />
        <input type="password" autoComplete="new-password" placeholder="Zopakujte heslo" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={authInputCls} />
        {error && <p className="text-sm text-red font-bold">{error}</p>}
        <button type="submit" disabled={loading} className={authBtnCls}>
          {loading ? 'Ukladám…' : 'Uložiť heslo a pokračovať'}
        </button>
      </form>
    </AuthCard>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  )
}
