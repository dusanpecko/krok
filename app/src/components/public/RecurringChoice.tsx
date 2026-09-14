'use client'

import { AlertTriangle } from 'lucide-react'
import type { MyOnlineSubscription } from '@/app/(public)/platby/actions'

export interface RecurringChoiceValue {
  /** 'replace' = starý pravidelný dar sa po úspešnej platbe zruší; 'add' = pribudne ďalší */
  mode: 'replace' | 'add'
  replaceId: string | null
}

interface Props {
  subscriptions: MyOnlineSubscription[]
  newAmount: number
  value: RecurringChoiceValue
  onChange: (value: RecurringChoiceValue) => void
}

function formatEur(amount: number) {
  return amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })
}

/**
 * Upozornenie pre darcu, ktorý už má aktívny pravidelný dar a zakladá ďalší.
 * Nechá ho vybrať: nahradiť existujúci (zmena výšky) alebo pridať ďalší.
 */
export default function RecurringChoice({ subscriptions, newAmount, value, onChange }: Props) {
  if (subscriptions.length === 0) return null

  const total = subscriptions.reduce((acc, s) => acc + (s.interval === 'year' ? s.amount / 12 : s.amount), 0)

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-amber-400/10 border border-amber-300/30">
      <div className="flex items-start gap-2 text-sm text-amber-100">
        <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-300" />
        <p className="leading-relaxed">
          {subscriptions.length === 1 ? (
            <>
              Už máte pravidelný dar <strong className="text-white">{formatEur(subscriptions[0].amount)}</strong>
              {subscriptions[0].interval === 'year' ? ' ročne' : ' mesačne'}.
            </>
          ) : (
            <>
              Už máte <strong className="text-white">{subscriptions.length} pravidelné dary</strong> (spolu {formatEur(total)} mesačne).
            </>
          )}{' '}
          Čo chcete urobiť?
        </p>
      </div>

      <div className="space-y-2">
        {subscriptions.map((s) => (
          <label
            key={s.id}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              value.mode === 'replace' && value.replaceId === s.id
                ? 'bg-white/10 border-gold/50'
                : 'bg-white/5 border-white/10 hover:border-white/25'
            }`}
          >
            <input
              type="radio"
              name="recurring-choice"
              className="mt-1 accent-[#CBBB2D]"
              checked={value.mode === 'replace' && value.replaceId === s.id}
              onChange={() => onChange({ mode: 'replace', replaceId: s.id })}
            />
            <span className="text-sm">
              <span className="text-white font-bold block">
                Zmeniť výšku z {formatEur(s.amount)} na {newAmount > 0 ? formatEur(newAmount) : '…'}
              </span>
              <span className="text-zinc-400 text-xs">
                Doterajší pravidelný dar sa zruší hneď po úspešnej platbe nového.
              </span>
            </span>
          </label>
        ))}

        <label
          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
            value.mode === 'add' ? 'bg-white/10 border-gold/50' : 'bg-white/5 border-white/10 hover:border-white/25'
          }`}
        >
          <input
            type="radio"
            name="recurring-choice"
            className="mt-1 accent-[#CBBB2D]"
            checked={value.mode === 'add'}
            onChange={() => onChange({ mode: 'add', replaceId: null })}
          />
          <span className="text-sm">
            <span className="text-white font-bold block">Pridať ďalší pravidelný dar</span>
            <span className="text-zinc-400 text-xs">
              Budete mať {subscriptions.length + 1} pravidelné dary, spolu {formatEur(total + newAmount)} mesačne.
            </span>
          </span>
        </label>
      </div>
    </div>
  )
}
