'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { saveMilestones } from '@/app/admin/projekty/actions'
import type { ProjectMilestone } from '@/lib/projects/types'
import { Notice, SectionTitle, btnIcon, btnIconDanger, btnPrimary, btnSecondary, cardCls, inputCls } from './ui'

interface Row {
  key: string
  id?: string
  title: string
  description: string
  due_date: string
  completed_at: string
}

function toRows(items: ProjectMilestone[]): Row[] {
  return items.map((it) => ({
    key: it.id,
    id: it.id,
    title: it.title,
    description: it.description ?? '',
    due_date: it.due_date ?? '',
    completed_at: it.completed_at ?? '',
  }))
}

interface Props {
  projectId: string
  initialItems: ProjectMilestone[]
}

export default function ProjectMilestonesTab({ projectId, initialItems }: Props) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initialItems))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
  const add = () => setRows((prev) => [...prev, { key: crypto.randomUUID(), title: '', description: '', due_date: '', completed_at: '' }])

  const toggleDone = (r: Row) => {
    if (r.completed_at) update(r.key, { completed_at: '' })
    else update(r.key, { completed_at: new Date().toISOString().slice(0, 10) })
  }

  const handleSave = () => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const res = await saveMilestones(
        projectId,
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description || null,
          due_date: r.due_date || null,
          completed_at: r.completed_at || null,
        }))
      )
      if (!res.success) {
        setError(res.error)
        return
      }
      setRows(toRows(res.items))
      setSuccess('Harmonogram bol uložený.')
    })
  }

  const done = rows.filter((r) => r.completed_at).length

  return (
    <div className="space-y-6">
      {error && <Notice kind="error">{error}</Notice>}
      {success && <Notice kind="success">{success}</Notice>}

      <div className={`${cardCls} space-y-4`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <SectionTitle title="Harmonogram" description="Míľniky projektu, napr. stavebné povolenie, začiatok prác, kolaudácia. Darcovia vidia, v akej fáze projekt je." />
          {rows.length > 0 && (
            <span className="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
              Splnené {done} / {rows.length}
            </span>
          )}
        </div>

        {rows.length === 0 && <p className="text-sm text-gray-400 italic py-6 text-center">Zatiaľ žiadne míľniky.</p>}

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.key} className={`p-4 border rounded-2xl flex gap-3 items-start ${r.completed_at ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-200'}`}>
              <button
                type="button"
                onClick={() => toggleDone(r)}
                className={`mt-2 shrink-0 cursor-pointer ${r.completed_at ? 'text-emerald-600' : 'text-gray-300 hover:text-gray-500'}`}
                title={r.completed_at ? 'Označiť ako nesplnené' : 'Označiť ako splnené'}
              >
                {r.completed_at ? <CheckCircle2 size={22} /> : <Circle size={22} />}
              </button>
              <div className="flex-1 grid sm:grid-cols-12 gap-3">
                <input value={r.title} onChange={(e) => update(r.key, { title: e.target.value })} placeholder="Názov míľnika *" className={`${inputCls} sm:col-span-6 bg-white font-bold`} />
                <div className="sm:col-span-3">
                  <input type="date" value={r.due_date} onChange={(e) => update(r.key, { due_date: e.target.value })} className={`${inputCls} bg-white`} title="Plánovaný termín" />
                  <span className="text-[10px] text-gray-400 px-1">plánovaný termín</span>
                </div>
                <div className="sm:col-span-3">
                  <input type="date" value={r.completed_at} onChange={(e) => update(r.key, { completed_at: e.target.value })} className={`${inputCls} bg-white`} title="Splnené dňa" />
                  <span className="text-[10px] text-gray-400 px-1">splnené dňa</span>
                </div>
                <input value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} placeholder="Poznámka (voliteľné)" className={`${inputCls} sm:col-span-12 bg-white text-xs`} />
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={btnIcon} title="Hore"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className={btnIcon} title="Dole"><ArrowDown size={14} /></button>
                <button type="button" onClick={() => remove(r.key)} className={btnIconDanger} title="Odstrániť"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
          <button type="button" onClick={add} className={btnSecondary}><Plus size={14} /> Pridať míľnik</button>
          <button type="button" onClick={handleSave} disabled={isPending} className={btnPrimary}>
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť harmonogram
          </button>
        </div>
      </div>
    </div>
  )
}
