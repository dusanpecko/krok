'use client'

import { useState } from 'react'
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { subscribeNewsletter } from '@/app/(public)/newsletter-actions'
import { NEWSLETTER_CONSENT_TEXT } from '@/lib/newsletter/consent'

/** Prihlásenie na newsletter (pätička webu). Kontakt ide do Brevo, súhlas sa eviduje v Kroku. */
export default function NewsletterSignup({ source = 'footer' }: { source?: string }) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('') // honeypot
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<null | 'new' | 'again'>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!consent) {
      setError('Pre prihlásenie potvrďte súhlas so zasielaním newslettera.')
      return
    }
    setLoading(true)
    const res = await subscribeNewsletter({ email, firstName, consent, source, website })
    setLoading(false)
    if (res.success) setDone(res.alreadySubscribed ? 'again' : 'new')
    else setError(res.error)
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 max-w-md">
        <CheckCircle2 size={20} className="text-gold-bright shrink-0 mt-0.5" />
        <p className="text-sm text-gray-300">
          {done === 'again'
            ? 'Tento e-mail už newsletter odoberá. Ďakujeme, že ste s nami.'
            : 'Ďakujeme! Ste prihlásený na newsletter KROK.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-3" noValidate>
      <h4 className="font-bold text-lg">Newsletter</h4>
      <p className="text-sm text-gray-400">Novinky o výzvach, podporených projektoch a živote fondu – raz za čas, bez spamu.</p>

      {/* Honeypot – skryté pre ľudí aj čítačky */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Meno (nepovinné)"
          autoComplete="given-name"
          aria-label="Meno (nepovinné)"
          className="sm:w-36 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-gold focus:ring-1 focus:ring-gold"
        />
        <div className="relative flex-1">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vas@email.sk"
            autoComplete="email"
            aria-label="E-mail"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-gold focus:ring-1 focus:ring-gold"
          />
        </div>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded accent-gold shrink-0"
        />
        <span className="text-xs text-gray-400 leading-relaxed">{NEWSLETTER_CONSENT_TEXT}</span>
      </label>

      {error && (
        <p className="flex items-start gap-2 text-xs text-red-300">
          <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        {loading ? 'Prihlasujem…' : 'Prihlásiť sa na newsletter'}
      </button>
    </form>
  )
}
