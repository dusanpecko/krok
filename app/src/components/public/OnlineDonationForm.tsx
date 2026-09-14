'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CreditCard, Repeat, Loader2, AlertCircle, XCircle, CalendarClock } from 'lucide-react'
import {
  startOnlineDonation,
  cancelMyOnlineSubscription,
  type MyOnlineSubscription,
} from '@/app/(public)/platby/actions'
import RecurringChoice, { type RecurringChoiceValue } from './RecurringChoice'
import { getPaymentQrCode, type PaymentQrResult } from '@/app/(public)/actions'
import { QrCode } from 'lucide-react'

interface Props {
  defaultEmail: string
  defaultName: string
  variableSymbol?: string | null
  subscriptions: MyOnlineSubscription[]
}

const PRESETS = [5, 10, 20]

function formatEur(amount: number) {
  return amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })
}

/**
 * Formulár online daru (Mollie) v profile darcu + zoznam jeho pravidelných darov.
 */
export default function OnlineDonationForm({ defaultEmail, defaultName, variableSymbol, subscriptions }: Props) {
  const router = useRouter()
  // Formulár v profile je všeobecná podpora fondu – nahradiť možno len predplatné bez výzvy.
  // Pravidelné dary na konkrétne výzvy sa menia na stránke danej výzvy.
  const generalSubs = subscriptions.filter((s) => !s.project_id)
  const [recurring, setRecurring] = useState(true)
  const [preset, setPreset] = useState<number | 'custom'>(10)
  const [custom, setCustom] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  // Darca s existujúcim pravidelným darom: nahradiť (zmena výšky) alebo pridať ďalší
  const [choice, setChoice] = useState<RecurringChoiceValue>({
    mode: 'replace',
    replaceId: generalSubs[0]?.id ?? null,
  })

  const amount = preset === 'custom' ? Number(custom) || 0 : preset
  const replacing = recurring && generalSubs.length > 0 && choice.mode === 'replace' && !!choice.replaceId

  // PAY by square QR pre prevod (alternatíva ku karte)
  const [showQr, setShowQr] = useState(false)
  const [qr, setQr] = useState<PaymentQrResult | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const toggleQr = async () => {
    if (showQr) {
      setShowQr(false)
      return
    }
    setShowQr(true)
    setQrLoading(true)
    setQr(await getPaymentQrCode({ amount, recurring }))
    setQrLoading(false)
  }

  const handlePay = async () => {
    setError(null)
    if (amount < 1) {
      setError('Minimálna suma daru je 1 €.')
      return
    }
    setLoading(true)
    const res = await startOnlineDonation({
      amount,
      recurring,
      interval: 'month',
      email: defaultEmail,
      name: defaultName,
      replaceSubscriptionId: replacing ? choice.replaceId : null,
    })
    if (res.success) {
      window.location.href = res.url
      return
    }
    setError(res.error)
    setLoading(false)
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Naozaj chcete zrušiť tento pravidelný dar? Ďalšie platby sa už nebudú sťahovať.')) return
    setCancelling(id)
    const res = await cancelMyOnlineSubscription(id)
    setCancelling(null)
    if (!res.success) {
      alert(res.error || 'Zrušenie sa nepodarilo.')
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-8">
      {/* Aktívne pravidelné dary */}
      {subscriptions.length > 0 && (
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 border border-white/10 text-gold-bright rounded-xl flex items-center justify-center shrink-0">
              <Repeat size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Vaše pravidelné dary</h3>
              <p className="text-xs text-zinc-400 font-light">Sťahujú sa automaticky z vašej karty</p>
            </div>
          </div>
          <div className="space-y-3">
            {subscriptions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl"
              >
                <div>
                  <p className="text-white font-bold">
                    {formatEur(s.amount)} <span className="text-zinc-400 font-normal text-sm">{s.interval === 'year' ? 'ročne' : 'mesačne'}</span>
                  </p>
                  <p className="text-xs text-gold-bright/90 mt-0.5">
                    {s.project_name && s.project_slug ? (
                      <Link href={`/vyzvy/${s.project_slug}`} className="hover:underline">Výzva: {s.project_name}</Link>
                    ) : (
                      'Všeobecná podpora fondu'
                    )}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                    <CalendarClock size={12} />
                    {s.status === 'past_due'
                      ? 'Posledná platba zlyhala – skúsime ju znova'
                      : s.next_payment_at
                        ? `Ďalšia platba ${new Date(s.next_payment_at).toLocaleDateString('sk-SK')}`
                        : 'Aktívne'}
                  </p>
                </div>
                <button
                  onClick={() => handleCancel(s.id)}
                  disabled={cancelling === s.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-zinc-300 border border-white/15 rounded-xl hover:bg-white/10 hover:text-white disabled:opacity-50 self-start sm:self-auto"
                >
                  {cancelling === s.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Zrušiť
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nový dar */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex bg-blue-deep/60 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setRecurring(true)}
            className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition-all ${
              recurring ? 'bg-blue text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pravidelne (mesačne)
          </button>
          <button
            onClick={() => setRecurring(false)}
            className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition-all ${
              !recurring ? 'bg-blue text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Jednorazovo
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-xs uppercase tracking-widest text-zinc-400 font-extrabold block">Výška daru</label>
          <div className="grid grid-cols-4 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPreset(p)
                  setCustom('')
                }}
                className={`py-3.5 rounded-xl text-base font-extrabold border transition-all ${
                  preset === p
                    ? 'bg-gold/15 border-gold text-gold-bright'
                    : 'bg-blue-deep/80 border-white/5 hover:border-white/20 text-zinc-400 hover:text-white'
                }`}
              >
                {p} €
              </button>
            ))}
            <button
              onClick={() => setPreset('custom')}
              className={`py-3.5 rounded-xl text-sm font-extrabold border transition-all ${
                preset === 'custom'
                  ? 'bg-gold/15 border-gold text-gold-bright'
                  : 'bg-blue-deep/80 border-white/5 hover:border-white/20 text-zinc-400 hover:text-white'
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
                className="w-full bg-blue-deep border border-white/10 focus:border-gold-bright rounded-xl py-3 px-4 text-white text-base outline-none pr-12 font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-extrabold">€</span>
            </div>
          )}
        </div>

        {recurring && (
          <RecurringChoice subscriptions={generalSubs} newAmount={amount} value={choice} onChange={setChoice} />
        )}
        {recurring && subscriptions.length > generalSubs.length && (
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Pravidelné dary na konkrétne výzvy ostávajú bez zmeny. Upravíte ich na stránke danej výzvy.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-vermilion/10 border border-vermilion/30 text-sm text-red-200">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading || amount < 1}
          className="w-full py-4 bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep font-extrabold text-base rounded-2xl shadow-xl hover:shadow-gold/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
          {loading
            ? 'Presmerúvame na platobnú bránu…'
            : replacing
              ? `Zmeniť na ${amount > 0 ? formatEur(amount) : '…'} mesačne`
              : `Zaplatiť kartou ${amount > 0 ? formatEur(amount) : ''}${recurring ? ' mesačne' : ''}`}
        </button>

        <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
          Bezpečná platba cez Mollie (karta, Apple Pay, Google Pay). Pravidelný dar môžete kedykoľvek zrušiť.
          {variableSymbol && (
            <>
              {' '}Radšej prevodom? Použite variabilný symbol <span className="font-mono text-zinc-300">{variableSymbol}</span>.
            </>
          )}
        </p>

        <button
          type="button"
          onClick={toggleQr}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-zinc-300 border border-white/10 rounded-xl hover:bg-white/5 hover:text-white transition-colors"
        >
          <QrCode size={14} />
          {showQr ? 'Skryť QR kód na prevod' : 'Zobraziť QR kód na prevod (PAY by square)'}
        </button>

        {showQr && (
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-36 h-36 shrink-0 bg-white p-1.5 rounded-2xl flex items-center justify-center">
              {qrLoading || !qr ? (
                <QrCode size={96} className="text-zinc-300 animate-pulse" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr.dataUrl} alt="PAY by square QR kód" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="text-xs text-zinc-400 space-y-1.5 text-center sm:text-left">
              <p className="text-white font-bold text-sm">Naskenujte v bankovej aplikácii</p>
              <p>
                {recurring
                  ? `QR nastaví príjemcu, sumu ${amount > 0 ? formatEur(amount) : ''} a váš VS – v banke platbu uložte ako trvalý príkaz (mesačne).`
                  : `QR nastaví príjemcu, sumu ${amount > 0 ? formatEur(amount) : ''} a váš variabilný symbol.`}
              </p>
              {qr && (
                <p className="font-mono text-zinc-300">
                  IBAN {qr.iban.replace(/(.{4})/g, '$1 ').trim()}
                  {qr.variableSymbol && <> · VS {qr.variableSymbol}</>}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
