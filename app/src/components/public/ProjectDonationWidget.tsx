'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, Loader2, AlertCircle, QrCode, Landmark, Repeat, CheckCircle2, LogIn, Info } from 'lucide-react'
import { startOnlineDonation, type MyOnlineSubscription } from '@/app/(public)/platby/actions'
import { getPaymentQrCode, type PaymentQrResult } from '@/app/(public)/actions'
import RecurringChoice, { type RecurringChoiceValue } from './RecurringChoice'
import { formatEur } from '@/lib/projects/types'

export interface DonationWidgetProject {
  id: string
  name: string
  slug: string
  allow_one_time: boolean
  allow_recurring: boolean
  suggested_amounts: number[]
  specific_symbol: string | null
}

interface Props {
  project: DonationWidgetProject
  /** Výzva je zverejnená, aktívna a pred termínom (počíta server). */
  isOpen: boolean
  isLoggedIn: boolean
  defaultEmail: string
  defaultName: string
  /** VS prihláseného darcu pre bankový prevod. */
  variableSymbol: string | null
  iban: string
  /** Aktívne pravidelné dary prihláseného darcu (všetky účely). */
  subscriptions: MyOnlineSubscription[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Darovací widget na stránke výzvy: Mollie (jednorazovo / mesačne) ako hlavná
 * cesta, bankový prevod so ŠS výzvy ako doplnok. Funguje aj bez prihlásenia.
 */
export default function ProjectDonationWidget({
  project,
  isOpen,
  isLoggedIn,
  defaultEmail,
  defaultName,
  variableSymbol,
  iban,
  subscriptions,
}: Props) {
  const presets = project.suggested_amounts.length ? project.suggested_amounts : [10, 20, 50, 100]
  const canRecurring = project.allow_recurring
  const canOneTime = project.allow_one_time

  const sameProjectSubs = subscriptions.filter((s) => s.project_id === project.id)
  const otherSubs = subscriptions.filter((s) => s.project_id !== project.id)

  const [recurring, setRecurring] = useState(canRecurring)
  const [preset, setPreset] = useState<number | 'custom'>(presets[0])
  const [custom, setCustom] = useState('')
  const [email, setEmail] = useState(defaultEmail)
  const [name, setName] = useState(defaultName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [choice, setChoice] = useState<RecurringChoiceValue>(() =>
    sameProjectSubs.length ? { mode: 'replace', replaceId: sameProjectSubs[0].id } : { mode: 'add', replaceId: null }
  )

  const [showBank, setShowBank] = useState(false)
  const [qr, setQr] = useState<PaymentQrResult | null>(null)
  const [qrLoading, setQrLoading] = useState(false)

  const amount = preset === 'custom' ? Number(custom) || 0 : preset
  const replacing = recurring && sameProjectSubs.length > 0 && choice.mode === 'replace' && !!choice.replaceId

  const toggleBank = async () => {
    if (showBank) {
      setShowBank(false)
      return
    }
    setShowBank(true)
    setQrLoading(true)
    setQr(await getPaymentQrCode({ amount, recurring, specificSymbol: project.specific_symbol, note: `Dar KROK ${project.name}`.slice(0, 60) }))
    setQrLoading(false)
  }

  const handlePay = async () => {
    setError(null)
    if (amount < 1) {
      setError('Minimálna suma daru je 1 €.')
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Zadajte platnú e-mailovú adresu, pošleme na ňu potvrdenie platby.')
      return
    }
    setLoading(true)
    const res = await startOnlineDonation({
      amount,
      recurring,
      interval: 'month',
      email: email.trim(),
      name: name.trim(),
      projectId: project.id,
      replaceSubscriptionId: replacing ? choice.replaceId : null,
    })
    if (res.success) {
      window.location.href = res.url
      return
    }
    setError(res.error)
    setLoading(false)
  }

  if (!isOpen) {
    return (
      <div className="bg-white border border-blue/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 border border-emerald-200 flex items-center justify-center">
          <CheckCircle2 size={26} className="text-emerald-700" />
        </div>
        <h3 className="text-lg font-extrabold text-ink">Táto výzva je uzavretá</h3>
        <p className="text-sm text-ink/80 font-light leading-relaxed">
          Ďakujeme všetkým, ktorí prispeli. Pozrite si ďalšie výzvy, ktoré práve potrebujú vašu pomoc.
        </p>
        <Link
          href="/vyzvy"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep font-extrabold rounded-2xl text-sm shadow-xl"
        >
          Ďalšie výzvy
        </Link>
      </div>
    )
  }

  const inputCls =
    'w-full bg-white border border-blue/10 focus:border-blue rounded-xl py-3 px-4 text-ink text-sm outline-none placeholder:text-mute'

  return (
    <div className="bg-white border border-blue/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue mb-1">Podporiť výzvu</p>
        <h3 className="text-xl font-extrabold text-ink leading-snug">{project.name}</h3>
      </div>

      {canRecurring && canOneTime && (
        <div className="flex bg-paper p-1 rounded-xl border border-blue/10">
          <button
            type="button"
            onClick={() => setRecurring(true)}
            className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition-all ${recurring ? 'bg-blue text-white shadow-md' : 'text-mute hover:text-ink'}`}
          >
            Pravidelne (mesačne)
          </button>
          <button
            type="button"
            onClick={() => setRecurring(false)}
            className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition-all ${!recurring ? 'bg-blue text-white shadow-md' : 'text-mute hover:text-ink'}`}
          >
            Jednorazovo
          </button>
        </div>
      )}
      {!canRecurring && canOneTime && <p className="text-xs text-mute">Táto výzva prijíma jednorazové dary.</p>}
      {canRecurring && !canOneTime && <p className="text-xs text-mute">Táto výzva prijíma pravidelné mesačné dary.</p>}

      <div className="space-y-3">
        <label className="text-xs uppercase tracking-widest text-mute font-extrabold block">Výška daru</label>
        <div className={`grid gap-2.5 ${presets.length >= 4 ? 'grid-cols-3' : 'grid-cols-2'} sm:grid-cols-4`}>
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPreset(p)
                setCustom('')
              }}
              className={`py-3 rounded-xl text-base font-extrabold border transition-all ${
                preset === p ? 'bg-gold/15 border-gold text-gold-ink' : 'bg-paper border-blue/10 hover:border-blue/30 text-mute hover:text-ink'
              }`}
            >
              {p} €
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreset('custom')}
            className={`py-3 rounded-xl text-sm font-extrabold border transition-all ${
              preset === 'custom' ? 'bg-gold/15 border-gold text-gold-ink' : 'bg-paper border-blue/10 hover:border-blue/30 text-mute hover:text-ink'
            }`}
          >
            Iná
          </button>
        </div>
        {preset === 'custom' && (
          <div className="relative">
            <input
              type="number"
              min="1"
              step="1"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Zadajte sumu"
              className={`${inputCls} pr-12 font-mono text-base`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-mute font-extrabold">€</span>
          </div>
        )}
      </div>

      {!isLoggedIn && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Meno a priezvisko" className={inputCls} autoComplete="name" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail *" className={inputCls} autoComplete="email" required />
          </div>
          <p className="text-[11px] text-mute leading-relaxed flex items-start gap-1.5">
            <LogIn size={12} className="shrink-0 mt-0.5" />
            <span>
              Máte účet? <Link href={`/prihlasenie?redirect=${encodeURIComponent(`/vyzvy/${project.slug}`)}`} className="text-gold-ink hover:underline">Prihláste sa</Link>, dar sa priradí k vášmu profilu.
            </span>
          </p>
        </div>
      )}

      {recurring && sameProjectSubs.length > 0 && (
        <RecurringChoice subscriptions={sameProjectSubs} newAmount={amount} value={choice} onChange={setChoice} />
      )}

      {recurring && otherSubs.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-white border border-blue/10 text-xs text-ink/80 leading-relaxed">
          <Info size={14} className="shrink-0 mt-0.5 text-gold-ink" />
          <span>
            Váš pravidelný dar{otherSubs.length > 1 ? 'y' : ''}{' '}
            {otherSubs.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ', '}
                <strong className="text-ink">{formatEur(s.amount)}</strong> {s.interval === 'year' ? 'ročne' : 'mesačne'} na{' '}
                {s.box_parish_name ? <em>e-zvonček {s.box_parish_name}</em> : s.project_name ? <em>{s.project_name}</em> : 'fond KROK'}
              </span>
            ))}{' '}
            ostáva bez zmeny. Tento dar pribudne ako ďalší.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-vermilion/10 border border-vermilion/30 text-sm text-red">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={loading || amount < 1}
        className="w-full py-4 bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep font-extrabold text-base rounded-2xl shadow-xl hover:shadow-gold/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {loading ? <Loader2 size={20} className="animate-spin" /> : recurring ? <Repeat size={20} /> : <CreditCard size={20} />}
        {loading
          ? 'Presmerúvame na platobnú bránu…'
          : replacing
            ? `Zmeniť na ${amount > 0 ? formatEur(amount) : '…'} mesačne`
            : `Darovať ${amount > 0 ? formatEur(amount) : ''}${recurring ? ' mesačne' : ''}`}
      </button>

      <p className="text-[11px] text-mute text-center leading-relaxed">
        Bezpečná platba cez Mollie (karta, Apple Pay, Google Pay). Pravidelný dar môžete kedykoľvek zrušiť vo svojom profile.
      </p>

      <button
        type="button"
        onClick={toggleBank}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-ink/80 border border-blue/10 rounded-xl hover:bg-blue-soft/50 hover:text-ink transition-colors"
      >
        <Landmark size={14} />
        {showBank ? 'Skryť údaje na prevod' : 'Radšej bankovým prevodom'}
      </button>

      {showBank && (
        <div className="space-y-4 p-4 rounded-2xl bg-white border border-blue/10">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-36 h-36 shrink-0 bg-white p-1.5 rounded-2xl flex items-center justify-center">
              {qrLoading || !qr ? (
                <QrCode size={96} className="text-ink/80 animate-pulse" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr.dataUrl} alt="PAY by square QR kód" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="text-xs text-mute space-y-1.5 text-center sm:text-left">
              <p className="text-ink font-bold text-sm">Naskenujte v bankovej aplikácii</p>
              <p>
                {recurring
                  ? 'QR nastaví príjemcu, sumu a symboly. V banke platbu uložte ako trvalý príkaz (mesačne).'
                  : 'QR nastaví príjemcu, sumu a symboly, aby sa dar priradil k tejto výzve.'}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            <dt className="text-mute font-bold">IBAN</dt>
            <dd className="font-mono text-ink/90">{iban.replace(/(.{4})/g, '$1 ').trim()}</dd>
            {project.specific_symbol && (
              <>
                <dt className="text-mute font-bold">Špecifický symbol</dt>
                <dd className="font-mono text-ink/90">{project.specific_symbol}</dd>
              </>
            )}
            <dt className="text-mute font-bold">Variabilný symbol</dt>
            <dd className="font-mono text-ink/90">
              {variableSymbol ?? (
                <span className="font-sans text-mute">
                  váš VS získate <Link href="/registracia" className="text-gold-ink hover:underline">registráciou</Link>
                </span>
              )}
            </dd>
          </dl>
          <p className="text-[11px] text-mute leading-relaxed">
            Špecifický symbol priradí dar k tejto výzve, variabilný symbol k vám ako darcovi.
          </p>
        </div>
      )}
    </div>
  )
}
