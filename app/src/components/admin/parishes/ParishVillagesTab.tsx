'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { saveVillages } from '@/app/admin/farnosti/actions'
import type { VillageWithStats } from '@/lib/parishes/types'
import { btnIcon, btnIconDanger, btnPrimary, btnSecondary, cardCls, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

const cell = `${inputCls} py-2 px-3`
const numOrNull = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v.replace(/\s/g, ''))) || 0))

export default function ParishVillagesTab({ parishId, initial }: { parishId: string; initial: VillageWithStats[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<VillageWithStats[]>(initial)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const update = (i: number, patch: Partial<VillageWithStats>) => setRows((r) => r.map((v, j) => (j === i ? { ...v, ...patch } : v)))
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const n = [...r]
      const j = i + d
      if (j < 0 || j >= n.length) return r
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })

  const population = rows.reduce((a, v) => a + (v.population ?? 0), 0)
  const catholics = rows.reduce((a, v) => a + (v.catholics ?? 0), 0)

  const save = () =>
    startTransition(async () => {
      setMsg(null)
      const res = await saveVillages(parishId, rows.map((v, i) => ({ ...v, is_seat: i === 0 })))
      if (res.success) {
        setMsg({ kind: 'success', text: 'Obce a štatistika boli uložené.' })
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })

  return (
    <div className={`${cardCls} space-y-4`}>
      <SectionTitle
        title="Obce a štatistika veriacich"
        description="Štatistika SODB 2021 (základ predpisu). Prvá obec je sídlo farnosti. Mení len diecéza – farnosť môže navrhnúť opravu."
      />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
              <th className="py-2 pr-2">Obec / filiálka</th>
              <th className="py-2 pr-2">Kostol / kaplnka</th>
              <th className="py-2 pr-2 w-32 text-right">Obyvatelia</th>
              <th className="py-2 pr-2 w-32 text-right">Katolíci</th>
              <th className="py-2 pr-2 w-16 text-right">%</th>
              <th className="py-2 pr-2">Zdroj</th>
              <th className="py-2 w-32" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((v, i) => (
              <tr key={v.id ?? `new-${i}`}>
                <td className="py-2 pr-2">
                  <input value={v.name} onChange={(e) => update(i, { name: e.target.value })} className={cell} placeholder="Názov obce" />
                  {i === 0 && <span className="text-[10px] font-bold text-blue-600 px-1">sídlo farnosti</span>}
                </td>
                <td className="py-2 pr-2"><input value={v.church_name ?? ''} onChange={(e) => update(i, { church_name: e.target.value })} className={cell} placeholder="napr. kostol sv. Martina" /></td>
                <td className="py-2 pr-2"><input value={v.population ?? ''} onChange={(e) => update(i, { population: numOrNull(e.target.value), source: 'ručne' })} className={`${cell} text-right`} inputMode="numeric" /></td>
                <td className="py-2 pr-2"><input value={v.catholics ?? ''} onChange={(e) => update(i, { catholics: numOrNull(e.target.value), source: 'ručne' })} className={`${cell} text-right`} inputMode="numeric" /></td>
                <td className="py-2 pr-2 text-right font-mono text-gray-500">
                  {v.population && v.catholics != null ? `${Math.round((1000 * v.catholics) / v.population) / 10}` : '—'}
                </td>
                <td className="py-2 pr-2 text-xs text-gray-400">{v.source ?? '—'}</td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button type="button" onClick={() => move(i, -1)} className={btnIcon} disabled={i === 0} title="Vyššie"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => move(i, 1)} className={btnIcon} disabled={i === rows.length - 1} title="Nižšie"><ArrowDown size={14} /></button>
                  <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className={btnIconDanger} title="Odstrániť"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Farnosť zatiaľ nemá obce ani štatistiku.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-100 font-black">
              <td className="py-3 pr-2" colSpan={2}>Spolu</td>
              <td className="py-3 pr-2 text-right font-mono">{population.toLocaleString('sk-SK')}</td>
              <td className="py-3 pr-2 text-right font-mono">{catholics.toLocaleString('sk-SK')}</td>
              <td className="py-3 pr-2 text-right font-mono text-gray-500">{population ? Math.round((1000 * catholics) / population) / 10 : '—'}</td>
              <td colSpan={2} className="py-3 text-xs text-gray-400 font-medium">Predpis 2026 pri 2 €/katolík: {(catholics * 2).toLocaleString('sk-SK')} €</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { name: '', is_seat: r.length === 0, district: null, church_name: null, has_church: true, population: null, catholics: null, source: 'ručne' }])}
          className={btnSecondary}
        >
          <Plus size={14} /> Pridať obec
        </button>
        <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť obce
        </button>
      </div>
    </div>
  )
}
