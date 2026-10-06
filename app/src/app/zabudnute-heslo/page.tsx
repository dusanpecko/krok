'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import AuthCard, { authBtnCls, authInputCls } from '@/components/auth/AuthCard'
import { requestPasswordReset } from './actions'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await requestPasswordReset(email)
    setLoading(false)
    if (res.success) setSent(true)
    else setError(res.error)
  }

  if (sent) {
    return (
      <AuthCard title="Skontrolujte si e-mail">
        <MailCheck className="mx-auto text-blue mb-4" size={36} />
        <p className="text-sm text-mute text-center mb-6">
          Ak k adrese <strong className="text-ink">{email}</strong> existuje účet, poslali sme naň odkaz na nastavenie nového hesla.
          Nevidíte ho? Pozrite aj priečinok spam.
        </p>
        <Link href="/prihlasenie" className="block text-center text-sm font-extrabold text-blue hover:underline">Späť na prihlásenie</Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Zabudnuté heslo">
      <p className="text-sm text-mute text-center mb-6">Zadajte e-mail, ktorým sa prihlasujete. Pošleme Vám odkaz na nastavenie nového hesla.</p>
      <form onSubmit={submit} className="space-y-3">
        <input type="email" autoComplete="email" required placeholder="vas@email.sk" value={email} onChange={(e) => setEmail(e.target.value)} className={authInputCls} />
        {error && <p className="text-sm text-red font-bold">{error}</p>}
        <button type="submit" disabled={loading} className={authBtnCls}>{loading ? 'Odosielam…' : 'Poslať odkaz'}</button>
      </form>
      <Link href="/prihlasenie" className="block text-center text-sm font-bold text-mute hover:text-ink mt-6">Späť na prihlásenie</Link>
    </AuthCard>
  )
}
