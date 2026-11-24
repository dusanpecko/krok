'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, RefreshCw, UserCheck } from 'lucide-react'
import { planParishAccessFromClergy, syncParishAccessForClergy } from '@/app/admin/farnosti/actions'
import type { ClergyAccessPlan } from '@/lib/parishes/clergy-access'
import { btnPrimary, btnSecondary, cardCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

/**
 * Prístupy do správy farnosti podľa schematizmu (069): náhľad zmien a hromadné spustenie.
 * Po zmene pôsobenia v registri kňazov sa prístup mení sám – toto je na prvé spustenie a kontrolu.
 */
export default function ParishAccessSync() {
  const router = useRouter()
  const [plans, setPlans] = useState<ClergyAccessPlan[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [progress, setProgress] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null)

  const load = async () => {
    setLoading(true)
    setMsg(null)
    try {
      setPlans(await planParishAccessFromClergy())
    } catch {
      setMsg({ kind: 'error', text: 'Náhľad sa nepodarilo načítať.' })
    }
    setLoading(false)
  }

  const runnable = (plans ?? []).filter((p) => !p.problem || p.remove.length)
  const run = async () => {
    if (!runnable.length) return
    const what = sendEmail ? ' a pošle im e-mail' : ' bez e-mailov'
    if (!confirm(`Upraviť prístupy pre ${runnable.length} kňazov podľa schematizmu${what}?`)) return
    let ok = 0
    let mails = 0
    const errors: string[] = []
    for (const [i, p] of runnable.entries()) {
      setProgress(`${i + 1} / ${runnable.length} – ${p.name}`)
      try {
        const res = await syncParishAccessForClergy(p.clergy_id, sendEmail)
        if (res.success) {
          ok++
          if (res.result?.emailSent) mails++
          if (res.result?.error) errors.push(`${p.name}: ${res.result.error}`)
        } else errors.push(`${p.name}: ${res.error}`)
      } catch {
        errors.push(`${p.name}: požiadavka zlyhala`)
      }
    }
    setProgress(null)
    setMsg({
      kind: errors.length ? 'error' : 'success',
      text: `Hotovo: ${ok} kňazov, odoslané e-maily: ${mails}.${errors.length ? ` Problémy (${errors.length}): ${errors.slice(0, 6).join(' · ')}` : ''}`,
    })
    await load()
    router.refresh()
  }

  return (
    <div className={`${cardCls} space-y-4`}>
      <SectionTitle
        title="Prístupy podľa schematizmu"
        description="Farár, farský administrátor a administrátor sú správcami svojej farnosti, farský vikár (kaplán) editorom. Pri zmene pôsobenia v registri kňazov sa prístup zmení sám a kňaz dostane e-mail. Tu vidíte, čo ešte nie je zosúladené."
      />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {!plans ? (
        <button type="button" onClick={load} disabled={loading} className={btnSecondary}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Zobraziť, čo treba zosúladiť
        </button>
      ) : plans.length === 0 ? (
        <p className="text-sm text-emerald-700 font-bold flex items-center gap-2">
          <UserCheck size={16} /> Všetky prístupy zodpovedajú schematizmu.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto text-sm">
            {plans.map((p) => (
              <li key={p.clergy_id} className="py-2 flex flex-wrap gap-x-3 gap-y-1 items-baseline">
                <span className="font-bold text-gray-900 min-w-[200px]">{p.name}</span>
                {p.add.map((a) => (
                  <span key={a.parish_id} className="text-emerald-700">
                    + {a.parish} ({a.role === 'admin' ? 'správca' : 'editor'})
                  </span>
                ))}
                {p.remove.map((r) => (
                  <span key={r.parish_id} className="text-red-700">− {r.parish}</span>
                ))}
                {p.problem && (
                  <span className="text-amber-700 text-xs font-bold flex items-center gap-1">
                    <AlertTriangle size={12} /> {p.problem}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-50">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Poslať kňazom e-mail (pridelenie / zmena prístupu)
            </label>
            <button type="button" onClick={run} disabled={!!progress || !runnable.length} className={btnPrimary}>
              {progress ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />} {progress ?? `Zosúladiť (${runnable.length})`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
