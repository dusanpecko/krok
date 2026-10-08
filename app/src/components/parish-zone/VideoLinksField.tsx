'use client'

import { Plus, Trash2, Video } from 'lucide-react'
import { MAX_VIDEOS, parseVideoUrl } from '@/lib/parishes/video'
import { btnSecondary, Field, inputCls } from '@/components/admin/projects/ui'

/** Odkazy na videá YouTube / Vimeo (bez nahrávania, O66) – názov a náhľad doplní server pri uložení. */
export default function VideoLinksField({ value, onChange, hint }: { value: string[]; onChange: (v: string[]) => void; hint?: string }) {
  const rows = value.length ? value : ['']
  const set = (i: number, v: string) => onChange(rows.map((x, j) => (j === i ? v : x)))
  return (
    <Field label="Videá z YouTube alebo Vimeo (nepovinné)" hint={hint ?? 'Vložte odkaz na video (napr. https://youtu.be/… alebo https://vimeo.com/…). Video sa nenahráva, len sa zobrazí prehrávač.'}>
      <div className="space-y-2">
        {rows.map((url, i) => {
          const parsed = url.trim() ? parseVideoUrl(url) : null
          const bad = url.trim() !== '' && !parsed
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Video size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => set(i, e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                    className={`${inputCls} !pl-9 ${bad ? '!border-red-300' : ''}`}
                  />
                </div>
                {parsed && <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">{parsed.provider === 'youtube' ? 'YouTube ✓' : 'Vimeo ✓'}</span>}
                {(rows.length > 1 || url) && (
                  <button type="button" title="Odstrániť" onClick={() => onChange(rows.filter((_, j) => j !== i))} className={btnSecondary}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {bad && <p className="text-xs text-red-600 px-1">Toto nie je odkaz na video z YouTube ani Vimeo.</p>}
            </div>
          )
        })}
        {rows.length < MAX_VIDEOS && rows[rows.length - 1].trim() !== '' && (
          <button type="button" onClick={() => onChange([...rows, ''])} className={btnSecondary}>
            <Plus size={14} /> Ďalšie video
          </button>
        )}
      </div>
    </Field>
  )
}
