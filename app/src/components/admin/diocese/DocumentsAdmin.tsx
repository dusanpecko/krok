'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Download, ExternalLink, Eye, EyeOff, FileUp, Loader2, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { adminDeleteDocument, adminSaveDocument, adminSyncKbs, adminUploadDocumentFile } from '@/app/admin/web-dieceza/actions'
import type { DioceseDocument } from '@/lib/diocese/documents'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice } from '@/components/admin/projects/ui'

type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null
type Form = { id?: string; group_label: string; title: string; description: string; url: string; file_name: string | null; issued_on: string; published: boolean; source: 'krok' | 'kbs' }

const SECTION = 'dokumenty-papezov'

/** Dokumenty pápežov – synchronizácia z kbs.sk + vlastné dokumenty diecézy (O77). */
export default function DocumentsAdmin({ docs }: { docs: DioceseDocument[] }) {
  const router = useRouter()
  const [form, setForm] = useState<Form | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [q, setQ] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pending, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out: { label: string; items: DioceseDocument[] }[] = []
    for (const d of docs) {
      if (needle && !d.title.toLowerCase().includes(needle)) continue
      const label = d.group_label || 'Ďalšie dokumenty'
      const g = out.find((x) => x.label === label)
      if (g) g.items.push(d)
      else out.push({ label, items: [d] })
    }
    return out
  }, [docs, q])
  const labels = useMemo(() => Array.from(new Set(docs.map((d) => d.group_label).filter(Boolean))) as string[], [docs])
  const lastSync = docs.filter((d) => d.synced_at).map((d) => d.synced_at!).sort().pop()

  const sync = async () => {
    setSyncing(true)
    setMsg({ kind: 'info', text: 'Načítavam dokumenty z kbs.sk…' })
    const res = await adminSyncKbs(SECTION)
    setSyncing(false)
    setMsg(res.success ? { kind: res.errors.length ? 'error' : 'success', text: `Nové: ${res.added}, aktualizované: ${res.updated}${res.errors.length ? `, chyby: ${res.errors.length}` : ''}.` } : { kind: 'error', text: res.error })
    router.refresh()
  }

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn()
      setMsg(res.success ? { kind: 'success', text: ok } : { kind: 'error', text: res.error ?? 'Chyba' })
      if (res.success) router.refresh()
    })

  const upload = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await adminUploadDocumentFile(fd)
    setUploading(false)
    if (!res.success) return setMsg({ kind: 'error', text: res.error })
    setForm((f) => (f ? { ...f, url: res.url, file_name: res.name, title: f.title || res.name.replace(/\.[^.]+$/, '') } : f))
  }

  const edit = (d: DioceseDocument) =>
    setForm({ id: d.id, group_label: d.group_label ?? '', title: d.title, description: d.description ?? '', url: d.url, file_name: d.file_name, issued_on: d.issued_on ?? '', published: d.published, source: d.source })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Web diecézy dcza.sk</p>
          <h1 className="text-2xl font-black text-gray-900">Dokumenty pápežov</h1>
          <p className="text-sm text-gray-500 mt-1">
            Zoznam z kbs.sk sa načítava každú noc (otvára sa na kbs.sk). Vlastné dokumenty diecézy sa otvoria na dcza.sk.
            {lastSync && ` Posledná synchronizácia: ${new Date(lastSync).toLocaleString('sk-SK')}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={sync} disabled={syncing} className={btnSecondary}>
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Načítať z kbs.sk
          </button>
          <button
            type="button"
            onClick={() => setForm({ group_label: labels[0] ?? '', title: '', description: '', url: '', file_name: null, issued_on: '', published: true, source: 'krok' })}
            className={btnPrimary}
          >
            <Plus size={16} /> Vlastný dokument
          </button>
        </div>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {form && (
        <div className={`${cardCls} space-y-4`}>
          <div className="flex items-center justify-between">
            <p className="font-black text-gray-900">{form.id ? (form.source === 'kbs' ? 'Dokument z kbs.sk' : 'Upraviť dokument') : 'Nový vlastný dokument'}</p>
            <button type="button" onClick={() => setForm(null)} className="p-2 text-gray-400 hover:text-gray-700 cursor-pointer">
              <X size={18} />
            </button>
          </div>
          {form.source === 'kbs' ? (
            <p className="text-sm text-gray-500">
              {form.title} – názov a odkaz preberá synchronizácia z kbs.sk, tu sa dá zmeniť len zverejnenie.
            </p>
          ) : (
            <>
              <div className="grid md:grid-cols-[1fr_220px] gap-4">
                <Field label="Názov">
                  <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} maxLength={300} />
                </Field>
                <Field label="Skupina" hint="Napr. „Lev XIV.“ alebo nová skupina">
                  <input list="doc-groups" value={form.group_label} onChange={(e) => set('group_label', e.target.value)} className={inputCls} />
                  <datalist id="doc-groups">
                    {labels.map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </Field>
              </div>
              <div className="grid md:grid-cols-[1fr_200px] gap-4">
                <Field label="Krátky popis (nepovinné)">
                  <input value={form.description} onChange={(e) => set('description', e.target.value)} className={inputCls} maxLength={500} />
                </Field>
                <Field label="Dátum (nepovinné)">
                  <input type="date" value={form.issued_on} onChange={(e) => set('issued_on', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Súbor alebo odkaz" hint="PDF, Word alebo Excel do 4 MB; väčší súbor nahrajte inde a vložte odkaz.">
                <div className="flex flex-wrap gap-2">
                  <input type="url" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" className={`${inputCls} flex-1 min-w-[240px]`} />
                  <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={btnSecondary}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />} Nahrať súbor
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.odt,.rtf,.xls,.xlsx"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) void upload(f)
                    }}
                  />
                </div>
                {form.file_name && <p className="text-xs text-emerald-600 mt-1.5">Nahraté: {form.file_name}</p>}
              </Field>
            </>
          )}
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} className={checkboxCls} /> Zverejnené na dcza.sk
          </label>
          <button
            type="button"
            disabled={pending || uploading}
            onClick={() =>
              run(async () => {
                const res = await adminSaveDocument({ ...form, section: SECTION })
                if (res.success) setForm(null)
                return res
              }, 'Uložené.')
            }
            className={btnPrimary}
          >
            <Save size={14} /> Uložiť
          </button>
        </div>
      )}

      <div className={`${cardCls} space-y-3`}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Hľadať v ${docs.length} dokumentoch`} className={`${inputCls} !pl-9`} />
        </div>
        {groups.map((g, i) => (
          <details key={g.label} open={i === 0 || !!q} className="group rounded-xl border border-gray-100">
            <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-3 font-bold text-gray-900">
              {g.label}
              <span className="text-xs text-gray-400 inline-flex items-center gap-1.5">
                {g.items.length} <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
              </span>
            </summary>
            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {g.items.map((d) => (
                <li key={d.id} className="px-4 py-2 flex items-center gap-3">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${d.source === 'kbs' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700'}`}>{d.source === 'kbs' ? 'KBS' : 'VLASTNÝ'}</span>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className={`flex-1 min-w-0 truncate text-sm hover:text-blue-600 ${d.published ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                    {d.title}
                  </a>
                  <ExternalLink size={12} className="text-gray-300" />
                  <button
                    type="button"
                    title={d.published ? 'Skryť' : 'Zverejniť'}
                    disabled={pending}
                    onClick={() => run(() => adminSaveDocument({ id: d.id, section: SECTION, title: d.title, url: d.url, published: !d.published }), d.published ? 'Skryté.' : 'Zverejnené.')}
                    className="p-1.5 text-gray-400 hover:text-blue-600 cursor-pointer"
                  >
                    {d.published ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  {d.source === 'krok' && (
                    <>
                      <button type="button" title="Upraviť" onClick={() => edit(d)} className="p-1.5 text-gray-400 hover:text-blue-600 cursor-pointer">
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        title="Zmazať"
                        disabled={pending}
                        onClick={() => confirm(`Zmazať „${d.title}“?`) && run(() => adminDeleteDocument(d.id), 'Zmazané.')}
                        className="p-1.5 text-gray-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  )
}
