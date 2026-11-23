'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Repeat, XCircle } from 'lucide-react'
import { adminCancelOnlineSubscription, type AdminOnlineSubscription } from '@/app/admin/platby/actions'

const STATUS: Record<string, { label: string; className: string }> = {
  active: { label: 'Aktívny', className: 'bg-green-50 text-green-700 border-green-200' },
  activating: { label: 'Aktivuje sa', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  past_due: { label: 'Neuhradený', className: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { label: 'Zrušený', className: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('sk-SK') : '—')

/** Pravidelné online dary (Mollie) darcu s možnosťou zrušenia. */
export default function DonorSubscriptions({ subscriptions }: { subscriptions: AdminOnlineSubscription[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (subscriptions.length === 0) return null

  const handleCancel = async (id: string) => {
    if (!confirm('Naozaj zrušiť tento pravidelný dar? Platobná brána (Mollie) prestane sťahovať ďalšie platby.')) return
    setBusyId(id)
    const res = await adminCancelOnlineSubscription(id)
    setBusyId(null)
    if (!res.success) alert(res.error)
    else router.refresh()
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 mb-4">
        <Repeat size={18} /> Pravidelné online dary (platobná brána)
      </h2>
      <div className="divide-y divide-gray-100">
        {subscriptions.map((s) => {
          const st = STATUS[s.status] ?? { label: s.status, className: 'bg-gray-50 text-gray-600 border-gray-200' }
          const canCancel = s.status !== 'cancelled'
          return (
            <div key={s.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">
                    {s.amount.toFixed(2)} € / {s.interval === 'year' ? 'rok' : 'mesiac'}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${st.className}`}>{st.label}</span>
                  {s.mode === 'test' && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">TEST</span>
                  )}
                  {s.box_parish && <span className="text-xs text-gray-500">e-zvonček: {s.box_parish.name}</span>}
                </div>
                <div className="text-xs text-gray-500">
                  Od {fmtDate(s.started_at ?? s.created_at)}
                  {s.status === 'cancelled'
                    ? ` · zrušený ${fmtDate(s.cancelled_at)}`
                    : ` · ďalšia platba ${fmtDate(s.next_payment_at)}`}
                  {s.mollie_subscription_id && <span className="font-mono"> · {s.mollie_subscription_id}</span>}
                </div>
              </div>
              {canCancel && (
                <button
                  type="button"
                  onClick={() => handleCancel(s.id)}
                  disabled={busyId === s.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle size={16} /> {busyId === s.id ? 'Ruším…' : 'Zrušiť pravidelný dar'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
