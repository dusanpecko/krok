'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarCheck, ChevronRight, Loader2, Plus } from 'lucide-react'
import { adminSaveEvent } from '@/app/admin/web-dieceza/podujatia/actions'
import { EVENT_STATUS_LABEL, type AdminEventSummary, type EventStatus } from '@/lib/diocese/events-shared'
import { btnPrimary, cardCls, inputCls, Notice } from '@/components/admin/projects/ui'

export const STATUS_CLS: Record<EventStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-amber-50 text-amber-700',
}

/** Podujatia webu diecézy (066) – zoznam a založenie nového. */
export default function EventsList({ events }: { events: AdminEventSummary[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const res = await adminSaveEvent(null, { title, slug: '', event_when: null, intro: null, thanks_text: null, closes_at: null, status: 'draft', questions: [] })
      if (!res.success) return setError(res.error)
      router.push(`/admin/web-dieceza/podujatia/${res.id}?tab=nastavenie`)
    })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Web diecézy dcza.sk</p>
        <h1 className="text-2xl font-black text-gray-900">Podujatia</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Prihlášky na podujatia na osobnú pozvánku. Každý pozvaný dostane e-mailom vlastný odkaz, cez ktorý sa prihlási aj neskôr zmení odpoveď; po odoslaní mu príde potvrdenie.
        </p>
      </div>

      <form onSubmit={create} className={`${cardCls} flex flex-wrap gap-3 items-center`}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Názov nového podujatia" className={`${inputCls} flex-1 min-w-[240px]`} />
        <button type="submit" disabled={pending || !title.trim()} className={btnPrimary}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Nové podujatie
        </button>
      </form>
      {error && <Notice kind="error">{error}</Notice>}

      <div className={`${cardCls} p-0 overflow-hidden`}>
        {events.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">Zatiaľ žiadne podujatie.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/admin/web-dieceza/podujatia/${e.id}`} className="flex items-center gap-4 p-5 hover:bg-gray-50">
                  <CalendarCheck className="text-blue-600 shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-gray-900">{e.title}</p>
                    {e.event_when && <p className="text-sm text-gray-500">{e.event_when}</p>}
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    <strong className="text-gray-900">{e.responses}</strong> / {e.invites} odpovedí
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${STATUS_CLS[e.status]}`}>{EVENT_STATUS_LABEL[e.status]}</span>
                  <ChevronRight size={18} className="text-gray-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
