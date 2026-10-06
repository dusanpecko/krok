'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, CheckCircle2, FileCode, FileSpreadsheet, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { btnIconDanger, btnPrimary, btnSecondary, cardCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'
import {
  createPayouts,
  deletePendingPayout,
  exportPayoutsXlsx,
  exportPayoutsXml,
  markPayoutsSent,
  saveBoxDefaults,
  type PayoutOverview,
} from '@/app/admin/farnosti/e-zvoncek/actions'
import { formatEur } from '@/lib/projects/types'

function download(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/** Mesačné vyúčtovanie e-zvončekov: návrh → vytvoriť výplaty → SEPA XML do Fio → označiť ako odoslané. */
export default function BoxPayoutsView({ overview }: { overview: PayoutOverview }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null)
  const [defaults, setDefaults] = useState({ mollie: String(overview.defaults.mollie_fee_pct), fund: String(overview.defaults.fund_fee_pct) })

  const drafts = overview.rows.filter((r) => !r.payout)
  const waiting = overview.rows.filter((r) => r.payout?.status === 'pending')
  const sum = (rows: typeof overview.rows, k: 'gross' | 'mollie_fee' | 'fund_fee' | 'net') => rows.reduce((a, r) => a + r[k], 0)

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      setMsg(null)
      await fn()
      router.refresh()
    })

  const onCreate = () =>
    run(async () => {
      const res = await createPayouts(overview.month)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      setMsg({
        kind: res.skipped.length ? 'info' : 'success',
        text: `Vytvorené výplaty: ${res.created}.${res.skipped.length ? ` Preskočené: ${res.skipped.join(', ')}.` : ''}`,
      })
    })

  const onXml = () =>
    run(async () => {
      const res = await exportPayoutsXml(overview.month)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      download(res.fileName, new Blob([res.content], { type: 'application/xml' }))
      setMsg({ kind: 'info', text: `SEPA XML s ${res.count} príkazmi je stiahnutý. Nahrajte ho v internetbankingu Fio (Import príkazov) a po odoslaní kliknite „Označiť ako odoslané“.` })
    })

  const onXlsx = () =>
    run(async () => {
      const res = await exportPayoutsXlsx(overview.month)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      download(res.fileName, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    })

  const onSent = () => {
    if (!confirm(`Označiť ${waiting.length} výplat za ${overview.label} ako odoslané? Urobte to až po zadaní príkazu v banke.`)) return
    run(async () => {
      const res = await markPayoutsSent(overview.month)
      setMsg(res.success ? { kind: 'success', text: `Odoslané: ${res.count}.` } : { kind: 'error', text: res.error })
    })
  }

  const onDelete = (id: string, name: string) => {
    if (!confirm(`Zrušiť výplatu pre ${name}? Dary sa presunú do ďalšieho vyúčtovania.`)) return
    run(async () => {
      const res = await deletePendingPayout(id)
      if (!res.success) setMsg({ kind: 'error', text: res.error })
    })
  }

  const onDefaults = () =>
    run(async () => {
      const res = await saveBoxDefaults({ mollie_fee_pct: Number(defaults.mollie.replace(',', '.')), fund_fee_pct: Number(defaults.fund.replace(',', '.')) })
      setMsg(res.success ? { kind: 'success', text: 'Predvolené poplatky sú uložené (platia pre farnosti, ktorým e-zvonček ešte nebol nastavený).' } : { kind: 'error', text: res.error })
    })

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Link href="/admin/farnosti" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Všetky farnosti
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Bell className="text-blue-600" /> E-zvonček – vyúčtovanie
          </h1>
          <p className="text-gray-500 mt-1">
            Zapnutý v {overview.enabledCount} farnostiach. Vypláca sa mesačne – dary zaplatené do konca mesiaca, ktoré ešte neboli vyplatené.
          </p>
        </div>
        <form className="flex items-end gap-2">
          <Field label="Mesiac">
            <input type="month" name="mesiac" defaultValue={overview.month} className={inputCls} />
          </Field>
          <button type="submit" className={btnSecondary}>Zobraziť</button>
        </form>
      </div>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className={cardCls}>
        <SectionTitle title={`Výplaty – ${overview.label}`} description="1. Vytvorte výplaty z návrhu · 2. Stiahnite SEPA XML a nahrajte ho do Fio · 3. Po odoslaní v banke označte ako odoslané." />

        <div className="flex flex-wrap gap-3 mb-6">
          <button type="button" onClick={onCreate} disabled={pending || drafts.length === 0} className={btnPrimary}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Vytvoriť výplaty ({drafts.length})
          </button>
          <button type="button" onClick={onXml} disabled={pending || waiting.length === 0} className={btnSecondary}>
            <FileCode size={14} /> SEPA XML ({waiting.length})
          </button>
          <button type="button" onClick={onXlsx} disabled={pending || overview.rows.length === 0} className={btnSecondary}>
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button type="button" onClick={onSent} disabled={pending || waiting.length === 0} className={btnSecondary}>
            <CheckCircle2 size={14} /> Označiť ako odoslané
          </button>
        </div>

        {overview.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Za tento mesiac nie sú žiadne dary na vyplatenie.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <th className="py-3">Farnosť</th>
                  <th className="py-3">IBAN</th>
                  <th className="py-3 text-right">Darov</th>
                  <th className="py-3 text-right">Vyzbierané</th>
                  <th className="py-3 text-right">Mollie</th>
                  <th className="py-3 text-right">Fond</th>
                  <th className="py-3 text-right">Na výplatu</th>
                  <th className="py-3 text-right">Stav</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {overview.rows.map((r) => (
                  <tr key={r.parish_id}>
                    <td className="py-3 font-bold text-gray-900">
                      <Link href={`/admin/farnosti/${r.parish_id}`} className="hover:text-blue-600">{r.parish_name}</Link>
                    </td>
                    <td className={`py-3 font-mono text-xs ${r.ibanValid ? 'text-gray-600' : 'text-red-600 font-bold'}`}>{r.iban || 'chýba IBAN'}</td>
                    <td className="py-3 text-right">{r.gift_count}</td>
                    <td className="py-3 text-right">{formatEur(r.gross)}</td>
                    <td className="py-3 text-right text-gray-500">{formatEur(r.mollie_fee)} <span className="text-[10px]">({r.mollie_fee_pct} %)</span></td>
                    <td className="py-3 text-right text-gray-500">{formatEur(r.fund_fee)} <span className="text-[10px]">({r.fund_fee_pct} %)</span></td>
                    <td className="py-3 text-right font-black text-gray-900">{formatEur(r.net)}</td>
                    <td className="py-3 text-right text-xs font-bold">
                      {!r.payout ? (
                        <span className="text-gray-400">návrh</span>
                      ) : r.payout.status === 'sent' ? (
                        <span className="text-emerald-700">odoslané</span>
                      ) : (
                        <span className="text-amber-700">čaká na odoslanie</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {r.payout?.status === 'pending' && (
                        <button type="button" onClick={() => onDelete(r.payout!.id, r.parish_name)} className={btnIconDanger} title="Zrušiť výplatu">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="font-black text-gray-900 border-t-2 border-gray-100">
                  <td className="py-3" colSpan={3}>Spolu</td>
                  <td className="py-3 text-right">{formatEur(sum(overview.rows, 'gross'))}</td>
                  <td className="py-3 text-right">{formatEur(sum(overview.rows, 'mollie_fee'))}</td>
                  <td className="py-3 text-right">{formatEur(sum(overview.rows, 'fund_fee'))}</td>
                  <td className="py-3 text-right">{formatEur(sum(overview.rows, 'net'))}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={cardCls}>
        <SectionTitle title="Predvolené poplatky diecézy" description="Predvyplnia sa pri prvom nastavení e-zvončeka farnosti. Každá farnosť môže mať vlastné percentá (detail farnosti → E-zvonček)." />
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Mollie (%)">
            <input inputMode="decimal" value={defaults.mollie} onChange={(e) => setDefaults((d) => ({ ...d, mollie: e.target.value }))} className={`${inputCls} w-32`} />
          </Field>
          <Field label="Fond (%)">
            <input inputMode="decimal" value={defaults.fund} onChange={(e) => setDefaults((d) => ({ ...d, fund: e.target.value }))} className={`${inputCls} w-32`} />
          </Field>
          <button type="button" onClick={onDefaults} disabled={pending} className={btnSecondary}>
            <Save size={14} /> Uložiť
          </button>
        </div>
      </div>
    </div>
  )
}
