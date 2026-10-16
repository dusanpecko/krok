'use client'

import { useState, useTransition } from 'react'
import { Loader2, Mail, Send } from 'lucide-react'
import { reportClergyDataCorrection } from '@/app/(public)/knazska-zona/moje-udaje/actions'

/** Nahlásenie opravy údajov – odošle správu na sekretariát (bez poštového programu). */
export default function CorrectionForm() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue text-white text-sm font-extrabold hover:bg-blue/90 cursor-pointer">
        <Mail size={16} /> Nahlásiť opravu
      </button>
    )
  return (
    <div className="mt-5 rounded-2xl bg-white border border-blue/10 p-5 space-y-3 max-w-2xl">
      <label className="block text-sm font-bold text-ink">Čo treba opraviť alebo doplniť?</label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Napr. dátum kňazskej vysviacky je 13. 6. 2009, telefón 0903…" className="w-full rounded-xl border border-blue/15 p-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue/10" />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || text.trim().length < 3}
          onClick={() =>
            startTransition(async () => {
              const res = await reportClergyDataCorrection(text)
              setMsg(res.success ? { ok: true, text: 'Ďakujeme – správa bola odoslaná na sekretariát biskupského úradu.' } : { ok: false, text: res.error ?? 'Chyba.' })
              if (res.success) setText('')
            })
          }
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue text-white text-sm font-extrabold hover:bg-blue/90 disabled:opacity-40 cursor-pointer"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Odoslať na sekretariát
        </button>
        <span className="text-xs text-mute">sekretariat@dcza.sk</span>
      </div>
      {msg && <p className={`text-sm font-bold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
    </div>
  )
}
