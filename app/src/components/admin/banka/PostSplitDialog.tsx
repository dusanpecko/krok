'use client'

import { useState } from 'react'
import { X, FileUp, Loader2, AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react'
import { previewPostSplit, savePostSplit, searchDonors, type PostSplitPreviewRow } from '@/app/admin/banka/actions'

interface Props {
  transaction: { id: string; amount: number; booking_date: string; counterparty_name: string | null }
  onClose: () => void
  onSuccess: (msg: string) => void
}

const eur = (n: number) => n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })

/**
 * Rozúčtovanie inkasa Slovenskej pošty: PDF „Opis úhrad k prevodu“ → riadky → darca ku každému
 * (návrh podľa EČP / mena, alebo nový darca) → dary jednotlivým darcom.
 */
export default function PostSplitDialog({ transaction, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<(PostSplitPreviewRow & { donorId: string })[] | null>(null)
  const [summary, setSummary] = useState<{ total: number; fee: number | null; net: number | null; period: string | null; amountMatches: boolean } | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setLoading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await previewPostSplit(transaction.id, fd)
    setLoading(false)
    if (!res.success) {
      setError(res.error)
      return
    }
    setRows(res.rows.map((r) => ({ ...r, donorId: r.suggested })))
    setSummary({ total: res.total, fee: res.fee, net: res.net, period: res.period, amountMatches: res.amountMatches })
  }

  const handleSave = async () => {
    if (!rows) return
    setSaving(true)
    setError(null)
    const res = await savePostSplit(
      transaction.id,
      rows.map((r) => ({ ecp: r.ecp, name: r.name, address: r.address, amount: r.amount, donorId: r.donorId }))
    )
    setSaving(false)
    if (!res.success) {
      setError(res.error)
      return
    }
    onSuccess(`Platba rozúčtovaná na ${res.count} darcov${res.created ? ` (nových darcov: ${res.created})` : ''}.`)
  }

  // „Iný darca…“ – vyhľadanie podľa VS alebo mena (darca je v Kroku pod iným menom)
  const searchOther = async (i: number) => {
    const q = window.prompt('VS alebo meno darcu v Kroku:')
    if (!q || q.trim().length < 2) return
    const found = ((await searchDonors(q.trim())) ?? []) as { id: string; first_name: string; last_name: string; variable_symbol: string | null; city: string | null }[]
    if (found.length === 0) {
      window.alert('Darca sa nenašiel.')
      return
    }
    setRows((prev) =>
      prev!.map((x, j) => {
        if (j !== i) return x
        const extra = found
          .filter((d) => !x.candidates.some((c) => c.id === d.id))
          .map((d) => ({ id: d.id, name: `${d.first_name} ${d.last_name}`, variable_symbol: d.variable_symbol, city: d.city, reason: 'name' as const }))
        return { ...x, candidates: [...x.candidates, ...extra], donorId: found[0].id }
      })
    )
  }

  const newCount = rows?.filter((r) => r.donorId === 'new').length ?? 0

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900">Rozúčtovať inkaso pošty</h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(transaction.booking_date).toLocaleDateString('sk-SK')} · {transaction.counterparty_name} ·{' '}
              <span className="font-bold text-green-600">{eur(Number(transaction.amount))}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-5">
          {!rows && (
            <label className="flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
              {loading ? <Loader2 size={28} className="animate-spin text-blue-600" /> : <FileUp size={28} className="text-blue-600" />}
              <span className="text-sm font-bold text-gray-700">
                {loading ? 'Čítam PDF…' : 'Nahrajte PDF „Opis úhrad k prevodu“ zo Slovenskej pošty'}
              </span>
              <span className="text-xs text-gray-400">Z PDF sa načítajú platitelia (EČP, meno, adresa, suma).</span>
              <input type="file" accept="application/pdf" className="hidden" disabled={loading} onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {rows && summary && (
            <>
              <div className={`p-4 rounded-2xl border text-sm flex flex-wrap gap-x-6 gap-y-1 ${summary.amountMatches ? 'bg-green-50 border-green-100 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                {summary.amountMatches ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                {summary.period && <span>Obdobie: <b>{summary.period}</b></span>}
                <span>Úhrady spolu: <b>{eur(summary.total)}</b></span>
                {summary.fee != null && <span>Odmena pošty: <b>−{eur(summary.fee)}</b></span>}
                <span>K úhrade: <b>{summary.net != null ? eur(summary.net) : '—'}</b></span>
                {!summary.amountMatches && <span className="font-bold">Suma v PDF nesedí s platbou v banke – skontrolujte, či je to správny výpis.</span>}
              </div>

              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <th className="py-2 pr-3">EČP</th>
                    <th className="py-2 pr-3">Platiteľ (PDF)</th>
                    <th className="py-2 pr-3 text-right">Suma</th>
                    <th className="py-2">Darca v Kroku</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r, i) => (
                    <tr key={r.ecp + i}>
                      <td className="py-3 pr-3 font-mono text-xs text-gray-500">{r.ecp}</td>
                      <td className="py-3 pr-3">
                        <div className="font-bold text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.address}</div>
                      </td>
                      <td className="py-3 pr-3 text-right font-black text-green-600 whitespace-nowrap">{eur(r.amount)}</td>
                      <td className="py-3">
                        <select
                          value={r.donorId}
                          onChange={(e) => {
                            if (e.target.value === '__search') {
                              searchOther(i)
                              return
                            }
                            const v = e.target.value
                            setRows((prev) => prev!.map((x, j) => (j === i ? { ...x, donorId: v } : x)))
                          }}
                          className={`w-full text-xs font-bold rounded-lg px-2 py-2 border cursor-pointer ${r.donorId === 'new' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}
                        >
                          {r.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}{c.variable_symbol ? ` · VS ${c.variable_symbol}` : ''}{c.city ? ` · ${c.city}` : ''} {c.reason === 'ecp' ? '(podľa EČP)' : '(podľa mena)'}
                            </option>
                          ))}
                          <option value="new">➕ Nový darca z PDF</option>
                          <option value="__search">🔎 Iný darca (VS alebo meno)…</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {newCount > 0 && (
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <UserPlus size={14} /> Založí sa {newCount} nových darcov (meno a adresa z PDF, nový VS, potvrdenie poštou).
                  Ak je darca v Kroku pod iným menom, vyberte „Iný darca (VS alebo meno)…“.
                </p>
              )}
              <p className="text-[11px] text-gray-400">
                EČP sa darcovi zapamätá – pri ďalšom inkase sa navrhne automaticky.
              </p>
            </>
          )}
        </div>

        <div className="px-8 py-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100">Zrušiť</button>
          {rows && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />} Rozúčtovať na {rows.length} darcov
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
