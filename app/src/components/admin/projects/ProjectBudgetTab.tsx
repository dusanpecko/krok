'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2, AlertTriangle } from 'lucide-react'
import { saveBudgetItems } from '@/app/admin/projekty/actions'
import { BUDGET_STATUSES, formatEur, type BudgetStatus, type ProjectBudgetItem } from '@/lib/projects/types'
import { Notice, SectionTitle, btnIcon, btnIconDanger, btnPrimary, btnSecondary, cardCls, inputCls } from './ui'

interface Row {
  key: string
  id?: string
  title: string
  description: string
  planned: string
  actual: string
  status: BudgetStatus
}

function toRows(items: ProjectBudgetItem[]): Row[] {
  return items.map((it) => ({
    key: it.id,
    id: it.id,
    title: it.title,
    description: it.description ?? '',
    planned: String(it.planned_amount),
    actual: it.actual_amount != null ? String(it.actual_amount) : '',
    status: it.status,
  }))
}

function toNumber(v: string): number {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

interface Props {
  projectId: string
  initialItems: ProjectBudgetItem[]
  targetAmount: number | null
}

export default function ProjectBudgetTab({ projectId, initialItems, targetAmount }: Props) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initialItems))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const plannedTotal = rows.reduce((acc, r) => acc + toNumber(r.planned), 0)
  const actualTotal = rows.reduce((acc, r) => acc + (r.actual ? toNumber(r.actual) : 0), 0)
  const diff = targetAmount != null ? plannedTotal - targetAmount : null

  const update = (key: string, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const remove = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key))
  const move = (index: number, dir: -1 | 1) =>
    setRows((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  const add = () =>
    setRows((prev) => [...prev, { key: crypto.randomUUID(), title: '', description: '', planned: '', actual: '', status: 'planned' }])

  const handleSave = () => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const res = await saveBudgetItems(
        projectId,
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description || null,
          planned_amount: toNumber(r.planned),
          actual_amount: r.actual ? toNumber(r.actual) : null,
          status: r.status,
        }))
      )
      if (!res.success) {
        setError(res.error)
        return
      }
      setRows(toRows(res.items))
      setSuccess('Rozpočet bol uložený.')
    })
  }

  return (
    <div className="space-y-6">
      {error && <Notice kind="error">{error}</Notice>}
      {success && <Notice kind="success">{success}</Notice>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardCls} lg:col-span-2 space-y-4`}>
          <SectionTitle title="Rozpočtové položky" description="Plán ukazuje darcom, na čo presne idú peniaze. Skutočnosť doplňte po realizácii (transparentné vyúčtovanie)." />

          {rows.length === 0 && (
            <p className="text-sm text-gray-400 italic py-6 text-center">Zatiaľ žiadne položky. Pridajte napríklad „Výmena okien“ alebo „Ubytovanie a strava účastníkov“.</p>
          )}

          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={r.key} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                <div className="flex gap-2 items-start">
                  <div className="flex flex-col gap-1 pt-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={btnIcon} title="Posunúť hore"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className={btnIcon} title="Posunúť dole"><ArrowDown size={14} /></button>
                  </div>
                  <div className="flex-1 grid sm:grid-cols-12 gap-3">
                    <input
                      value={r.title}
                      onChange={(e) => update(r.key, { title: e.target.value })}
                      placeholder="Názov položky *"
                      className={`${inputCls} sm:col-span-5 bg-white font-bold`}
                    />
                    <div className="sm:col-span-2 relative">
                      <input type="number" min="0" step="0.01" value={r.planned} onChange={(e) => update(r.key, { planned: e.target.value })} placeholder="Plán" className={`${inputCls} bg-white pr-7`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                    </div>
                    <div className="sm:col-span-2 relative">
                      <input type="number" min="0" step="0.01" value={r.actual} onChange={(e) => update(r.key, { actual: e.target.value })} placeholder="Skutočnosť" className={`${inputCls} bg-white pr-7`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                    </div>
                    <select value={r.status} onChange={(e) => update(r.key, { status: e.target.value as BudgetStatus })} className={`${inputCls} sm:col-span-3 bg-white`}>
                      {BUDGET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <input
                      value={r.description}
                      onChange={(e) => update(r.key, { description: e.target.value })}
                      placeholder="Poznámka (voliteľné)"
                      className={`${inputCls} sm:col-span-12 bg-white text-xs`}
                    />
                  </div>
                  <button type="button" onClick={() => remove(r.key)} className={btnIconDanger} title="Odstrániť"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
            <button type="button" onClick={add} className={btnSecondary}><Plus size={14} /> Pridať položku</button>
            <button type="button" onClick={handleSave} disabled={isPending} className={btnPrimary}>
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť rozpočet
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${cardCls} space-y-3`}>
            <SectionTitle title="Súhrn" />
            <Row label="Plán spolu" value={formatEur(plannedTotal)} strong />
            <Row label="Skutočnosť spolu" value={actualTotal ? formatEur(actualTotal) : '–'} />
            <Row label="Cieľová suma výzvy" value={targetAmount != null ? formatEur(targetAmount) : 'nenastavená'} />
            {diff != null && Math.abs(diff) >= 0.01 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-xs font-bold flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  Plán je o {formatEur(Math.abs(diff))} {diff > 0 ? 'vyšší' : 'nižší'} než cieľová suma. Upravte položky alebo cieľovú sumu v záložke Základné.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      <span className={`text-sm ${strong ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>{value}</span>
    </div>
  )
}
