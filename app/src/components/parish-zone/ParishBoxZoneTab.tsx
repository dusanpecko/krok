'use client'

import { useEffect, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { getMyParishBox, type MyParishBoxView } from '@/app/moja-farnost/web-actions'
import { formatEur } from '@/lib/projects/types'

const cardCls = 'bg-white border border-gray-100 rounded-3xl p-6 shadow-sm'

/** Zóna farnosti → E-zvonček: súhrny a výplaty od fondu (bez mien darcov, O3). */
export default function ParishBoxZoneTab({ parishId, parishSlug }: { parishId: string; parishSlug: string | null }) {
  const [view, setView] = useState<MyParishBoxView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getMyParishBox(parishId).then((res) => {
      if (cancelled) return
      if (res.success) setView(res.view)
      else setError(res.error)
    })
    return () => {
      cancelled = true
    }
  }, [parishId])

  if (error) return <div className={`${cardCls} text-sm text-red-700 font-bold`}>{error}</div>
  if (!view) {
    return (
      <div className={`${cardCls} flex justify-center py-16`}>
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    )
  }

  // nezapnutý a bez histórie → len krátka informácia (v spoločnej záložke s Prehľadom)
  const compact = !view.enabled && view.payouts.length === 0 && view.waiting.count === 0

  return (
    <div className="space-y-6">
      <div className={cardCls}>
        <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-2">
          <Bell size={16} className="text-blue-600" /> E-zvonček farnosti
        </h3>
        {view.enabled ? (
          <p className="text-sm text-gray-600">
            E-zvonček je <strong className="text-emerald-700">zapnutý</strong> – veriaci môžu farnosti darovať online
            {parishSlug && (
              <>
                {' '}na <a href={`/farnosti/${parishSlug}#zvoncek`} target="_blank" className="text-blue-600 font-bold hover:underline">stránke farnosti</a>
              </>
            )}
            . Pastoračný fond KROK dary prijme a raz mesačne ich pošle na účet farnosti. Odpočítava sa poplatok platobnej brány{' '}
            <strong>{view.mollie_fee_pct} %</strong> a poplatok fondu <strong>{view.fund_fee_pct} %</strong>.
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            E-zvonček zatiaľ nie je zapnutý. Zapína ho diecéza – ak oň máte záujem, napíšte na{' '}
            <a href="mailto:mojkrok@dcza.sk" className="text-blue-600 font-bold hover:underline">mojkrok@dcza.sk</a>.
          </p>
        )}
      </div>

      {!compact && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              ['Tento mesiac', formatEur(view.thisMonth.gross), `${view.thisMonth.count} darov`],
              ['Čaká na odoslanie farnosti', formatEur(view.waiting.gross), `${view.waiting.count} darov`],
              ['Pravidelní darcovia', String(view.activeRecurring), 'aktívne mesačné dary'],
            ].map(([label, value, sub]) => (
              <div key={label} className={cardCls}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            ))}
          </div>

          <div className={cardCls}>
            <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider mb-4">Výplaty od fondu</h3>
            {view.payouts.length === 0 ? (
              <p className="text-sm text-gray-500">Zatiaľ žiadne výplaty.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      <th className="py-2">Mesiac</th>
                      <th className="py-2 text-right">Darov</th>
                      <th className="py-2 text-right">Vyzbierané</th>
                      <th className="py-2 text-right">Poplatky</th>
                      <th className="py-2 text-right">Na účet farnosti</th>
                      <th className="py-2 text-right">Stav</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {view.payouts.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2">{new Date(p.period_month).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}</td>
                        <td className="py-2 text-right">{p.gift_count}</td>
                        <td className="py-2 text-right">{formatEur(p.gross_amount)}</td>
                        <td className="py-2 text-right text-gray-500">{formatEur(p.mollie_fee + p.fund_fee)}</td>
                        <td className="py-2 text-right font-black">{formatEur(p.net_amount)}</td>
                        <td className="py-2 text-right text-xs font-bold">
                          {p.status === 'sent' ? (
                            <span className="text-emerald-700">odoslané {p.sent_at ? new Date(p.sent_at).toLocaleDateString('sk-SK') : ''}</span>
                          ) : (
                            <span className="text-amber-700">pripravuje sa</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
