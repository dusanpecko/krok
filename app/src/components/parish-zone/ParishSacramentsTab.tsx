'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Pencil, RotateCcw, Save, X } from 'lucide-react'
import SimpleRichTextEditor from '@/components/admin/SimpleRichTextEditor'
import type { SacramentEditRow } from '@/lib/parishes/posts'
import { btnPrimary, btnSecondary, cardCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

type Save = (parishId: string, type: string, content: string | null, isHidden: boolean) => Promise<{ success: true } | { success: false; error: string }>

/** Sviatosti: diecézny text je štandard, farnosť si ho môže upraviť alebo sekciu skryť (O27). */
export default function ParishSacramentsTab({ parishId, rows, save }: { parishId: string; rows: SacramentEditRow[]; save: Save }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const run = (type: string, content: string | null, hidden: boolean, ok: string) =>
    startTransition(async () => {
      const res = await save(parishId, type, content, hidden)
      if (res.success) {
        setMsg({ kind: 'success', text: ok })
        setEditing(null)
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })

  return (
    <div className={`${cardCls} space-y-5`}>
      <SectionTitle title="Sviatosti – čo treba vybaviť" description="Biskupský úrad pripravil spoločné texty. Môžete ich upraviť pre vašu farnosť (napr. termíny prípravy) alebo sekciu na stránke skryť." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.type} className="border border-gray-100 rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-extrabold text-gray-900">
                {r.title}
                <span className={`ml-2 text-xs font-bold ${r.is_hidden ? 'text-gray-400' : r.own_content ? 'text-blue-600' : 'text-gray-400'}`}>
                  {r.is_hidden ? 'skryté na stránke' : r.own_content ? 'vlastný text farnosti' : 'diecézny text'}
                </span>
              </p>
              {editing !== r.type && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setEditing(r.type); setDraft(r.own_content ?? r.base_content) }} className={btnSecondary}>
                    <Pencil size={14} /> Upraviť
                  </button>
                  {r.own_content && (
                    <button type="button" disabled={pending} onClick={() => run(r.type, null, r.is_hidden, 'Vrátené na diecézny text.')} className={btnSecondary}>
                      <RotateCcw size={14} /> Diecézny text
                    </button>
                  )}
                  <button type="button" disabled={pending} onClick={() => run(r.type, r.own_content, !r.is_hidden, r.is_hidden ? 'Sekcia sa zobrazí.' : 'Sekcia je skrytá.')} className={btnSecondary}>
                    {r.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />} {r.is_hidden ? 'Zobraziť' : 'Skryť'}
                  </button>
                </div>
              )}
            </div>
            {editing === r.type ? (
              <div className="mt-4 space-y-3">
                <SimpleRichTextEditor label="Text pre našu farnosť" value={draft} onChange={setDraft} minHeight="220px" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditing(null)} className={btnSecondary}><X size={14} /> Zrušiť</button>
                  <button type="button" disabled={pending} onClick={() => run(r.type, draft, r.is_hidden, 'Uložené.')} className={btnPrimary}>
                    {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť
                  </button>
                </div>
              </div>
            ) : (
              !r.is_hidden && <div className="mt-2 text-sm text-gray-600 simple-rich-editor line-clamp-3" dangerouslySetInnerHTML={{ __html: r.own_content ?? r.base_content }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
