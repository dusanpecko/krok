'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Save, X } from 'lucide-react'
import SimpleRichTextEditor from '@/components/admin/SimpleRichTextEditor'
import { saveSacramentText, type SacramentTextRow } from '@/app/admin/farnosti/web-actions'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice } from '@/components/admin/projects/ui'

export default function SacramentTextsEditor({ rows }: { rows: SacramentTextRow[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content: '', is_active: true })
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const save = (type: string) =>
    startTransition(async () => {
      const res = await saveSacramentText(type, form)
      if (res.success) {
        setMsg({ kind: 'success', text: 'Uložené.' })
        setEditing(null)
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })

  return (
    <div className="space-y-3">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {rows.map((r) => (
        <div key={r.type} className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-extrabold text-gray-900">
              {r.title}
              {!r.is_active && <span className="ml-2 text-xs font-bold text-gray-400">vypnuté</span>}
              {r.customized_count > 0 && <span className="ml-2 text-xs font-bold text-blue-600">vlastný text má {r.customized_count} farností</span>}
            </p>
            {editing !== r.type && (
              <button type="button" onClick={() => { setEditing(r.type); setForm({ title: r.title, content: r.content, is_active: r.is_active }) }} className={btnSecondary}>
                <Pencil size={14} /> Upraviť
              </button>
            )}
          </div>
          {editing === r.type ? (
            <div className="mt-4 space-y-4">
              <Field label="Názov"><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} /></Field>
              <SimpleRichTextEditor label="Text" value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} minHeight="240px" />
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className={checkboxCls} />
                Zobrazovať na stránkach farností
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className={btnSecondary}><X size={14} /> Zrušiť</button>
                <button type="button" disabled={pending} onClick={() => save(r.type)} className={btnPrimary}>
                  {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-600 simple-rich-editor" dangerouslySetInnerHTML={{ __html: r.content }} />
          )}
        </div>
      ))}
    </div>
  )
}
