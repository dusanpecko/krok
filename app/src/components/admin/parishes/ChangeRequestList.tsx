'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, X } from 'lucide-react'
import { approveChangeRequest, rejectChangeRequest, type ChangeRequestRow } from '@/app/admin/farnosti/actions'
import { FIELD_LABEL } from '@/lib/parishes/fields'
import { inputCls, Notice } from '@/components/admin/projects/ui'

const STATUS = { pending: 'Čaká', approved: 'Schválené', rejected: 'Zamietnuté' }

/** Návrhy zmien od farností – rozdiel starý → nový, schválenie jedným klikom (§ 3.6). */
export default function ChangeRequestList({ requests, showParish = false }: { requests: ChangeRequestRow[]; showParish?: boolean }) {
  if (!requests.length) return <p className="text-sm text-gray-400 py-6 text-center">Žiadne návrhy.</p>
  return (
    <ul className="space-y-3">
      {requests.map((r) => <RequestItem key={r.id} r={r} showParish={showParish} />)}
    </ul>
  )
}

function RequestItem({ r, showParish }: { r: ChangeRequestRow; showParish: boolean }) {
  const router = useRouter()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const act = (fn: () => Promise<{ success: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn()
      if (res.success) router.refresh()
      else setErr(res.error ?? 'Chyba.')
    })

  const fields = Object.keys(r.payload).filter((k) => k !== '_note')
  const payloadNote = r.payload._note as string | undefined

  return (
    <li className="border border-gray-100 rounded-2xl p-4 bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-2">
        {showParish && <Link href={`/admin/farnosti/${r.parish_id}`} className="font-black text-gray-900 text-sm hover:text-blue-600">{r.parish_name}</Link>}
        <span className="font-bold">{r.entity === 'population' ? 'Štatistika veriacich' : 'Úradné údaje'}</span>
        <span className="font-mono">{new Date(r.submitted_at).toLocaleString('sk-SK')}</span>
        {r.submitted_by_email && <span>{r.submitted_by_email}</span>}
        <span className={`font-bold ${r.status === 'pending' ? 'text-amber-600' : r.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>{STATUS[r.status]}</span>
      </div>

      {r.entity === 'parish' ? (
        <table className="w-full text-sm">
          <tbody>
            {fields.map((f) => (
              <tr key={f} className="border-t border-gray-50">
                <td className="py-1.5 pr-3 text-xs font-bold text-gray-500 w-44">{FIELD_LABEL[f] ?? f}</td>
                <td className="py-1.5 pr-3 text-red-700 line-through decoration-red-300">{String(r.current[f] ?? '—')}</td>
                <td className="py-1.5 text-emerald-700 font-bold">{String(r.payload[f] ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div><div className="font-bold text-gray-500 mb-1">Teraz</div>{((r.current.villages as string[]) ?? []).map((v) => <div key={v} className="text-red-700">{v}</div>)}</div>
          <div>
            <div className="font-bold text-gray-500 mb-1">Návrh</div>
            {((r.payload.villages as { name: string; catholics: number | null; population: number | null }[]) ?? []).map((v) => (
              <div key={v.name} className="text-emerald-700 font-bold">{v.name}: {v.catholics ?? '–'} katolíkov / {v.population ?? '–'} obyv.</div>
            ))}
          </div>
        </div>
      )}
      {payloadNote && <p className="text-xs text-gray-600 mt-2">Poznámka farnosti: {payloadNote}</p>}
      {r.review_note && <p className="text-xs text-red-600 mt-2">Dôvod zamietnutia: {r.review_note}</p>}
      {err && <div className="mt-2"><Notice kind="error">{err}</Notice></div>}

      {r.status === 'pending' && (
        <div className="flex flex-wrap gap-2 justify-end mt-3">
          {rejecting ? (
            <>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dôvod zamietnutia (farnosť ho uvidí)" className={`${inputCls} py-2 flex-1 min-w-[240px]`} autoFocus />
              <button onClick={() => act(() => rejectChangeRequest(r.id, note))} disabled={pending} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black">Zamietnuť</button>
              <button onClick={() => setRejecting(false)} className="px-3 py-2 rounded-xl text-gray-500 text-xs font-bold">Zrušiť</button>
            </>
          ) : (
            <>
              <button onClick={() => setRejecting(true)} className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-black hover:bg-red-50"><X size={14} /> Zamietnuť</button>
              <button onClick={() => act(() => approveChangeRequest(r.id))} disabled={pending} className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700">
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Schváliť
              </button>
            </>
          )}
        </div>
      )}
    </li>
  )
}
