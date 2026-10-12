'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload } from 'lucide-react'
import { submitCelebretPhoto } from '@/app/(public)/knazska-zona/celebret/actions'
import { shrinkForUpload } from '@/lib/shrink-image'

/** Kňaz pošle novú fotku na celebret (schvaľuje kúria). */
export default function CelebretPhotoUpload() {
  const router = useRouter()
  const ref = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const send = (file: File) =>
    startTransition(async () => {
      setMsg(null)
      const form = new FormData()
      form.set('file', await shrinkForUpload(file, 1600))
      const res = await submitCelebretPhoto(form)
      setMsg(res.success ? 'Fotka bola odoslaná na schválenie biskupskému úradu.' : res.error)
      if (res.success) router.refresh()
    })
  return (
    <div className="space-y-2">
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
      <button type="button" disabled={pending} onClick={() => ref.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue text-white text-sm font-extrabold hover:bg-blue/90 cursor-pointer disabled:opacity-60">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Poslať novú fotku
      </button>
      {msg && <p className="text-sm text-mute">{msg}</p>}
    </div>
  )
}
