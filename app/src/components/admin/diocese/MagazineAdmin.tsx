'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ExternalLink, EyeOff, ImagePlus, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { adminDeleteMagazine, adminSaveMagazine, adminSyncMagazine, adminUploadMagazineCover } from '@/app/admin/web-dieceza/actions'
import type { MagazineInput, MagazineRow } from '@/lib/diocese/magazine'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null
type Form = MagazineInput & { id: string | null }

const empty = (): Form => {
  const d = new Date()
  return { id: null, issue_number: `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`, title: '', description: '', cover_url: '', pdf_url: '', link_url: '', published: true }
}

/** Časopis „Naša Žilinská diecéza“ – čísla, obálky, synchronizácia so Zachej.sk. */
export default function MagazineAdmin({ issues }: { issues: MagazineRow[] }) {
  const router = useRouter()
  const [form, setForm] = useState<Form | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()
  const [syncing, setSyncing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const sync = async () => {
    setSyncing(true)
    setMsg({ kind: 'info', text: 'Načítavam čísla zo Zachej.sk…' })
    const res = await adminSyncMagazine()
    setSyncing(false)
    if (!res.success) return setMsg({ kind: 'error', text: res.error })
    setMsg({
      kind: res.errors.length ? 'error' : 'success',
      text: res.added.length || res.updated.length
        ? `Pridané: ${res.added.join(', ') || '—'}${res.updated.length ? ` · doplnené: ${res.updated.join(', ')}` : ''}${res.errors.length ? ` · chyby: ${res.errors.length}` : ''}`
        : 'Na Zachej.sk nie sú žiadne nové čísla.',
    })
    router.refresh()
  }

  const upload = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await adminUploadMagazineCover(fd)
    setUploading(false)
    if (!res.success) return setMsg({ kind: 'error', text: res.error })
    set('cover_url', res.url)
  }

  const save = () =>
    start(async () => {
      if (!form) return
      const { id, ...input } = form
      const res = await adminSaveMagazine(id, input)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      setForm(null)
      setMsg({ kind: 'success', text: 'Uložené.' })
      router.refresh()
    })

  const remove = (row: MagazineRow) =>
    confirm(`Zmazať číslo ${row.issue_number}?`) &&
    start(async () => {
      const res = await adminDeleteMagazine(row.id)
      setMsg(res.success ? { kind: 'success', text: 'Zmazané.' } : { kind: 'error', text: res.error })
      router.refresh()
    })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Web diecézy dcza.sk</p>
          <h1 className="text-2xl font-black text-gray-900">Časopis Naša Žilinská diecéza</h1>
          <p className="text-sm text-gray-500 mt-1">Na úvode webu sa zobrazujú 4 najnovšie zverejnené čísla, všetky na stránke Časopis.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={sync} disabled={syncing} className={btnSecondary}>
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Načítať nové čísla zo Zachej.sk
          </button>
          <button type="button" onClick={() => setForm(empty())} className={btnPrimary}>
            <Plus size={16} /> Pridať číslo
          </button>
        </div>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {form && (
        <div className={`${cardCls} space-y-4`}>
          <div className="flex items-center justify-between">
            <SectionTitle title={form.id ? `Upraviť číslo ${form.issue_number}` : 'Nové číslo'} />
            <button type="button" onClick={() => setForm(null)} className="p-2 text-gray-400 hover:text-gray-700 cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <div className="grid md:grid-cols-[180px_1fr] gap-6">
            <div>
              <div className="aspect-[3/4] rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
                {form.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={28} className="text-gray-300" />
                )}
              </div>
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={`${btnSecondary} w-full mt-2`}>
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {form.cover_url ? 'Zmeniť obálku' : 'Nahrať obálku'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void upload(f)
                }}
              />
            </div>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-[160px_1fr] gap-4">
                <Field label="Číslo (MM/RRRR)">
                  <input value={form.issue_number} onChange={(e) => set('issue_number', e.target.value)} className={inputCls} placeholder="10/2026" />
                </Field>
                <Field label="Téma čísla" hint="Napr. „Rok Vendelína Javorku“ – ak ostane prázdne, zobrazí sa „Naša Žilinská diecéza 10/2026“.">
                  <input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} className={inputCls} maxLength={200} />
                </Field>
              </div>
              <Field label="Krátky popis (nepovinné)">
                <textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} className={inputCls} maxLength={1000} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Odkaz na e-časopis (Zachej.sk)">
                  <input type="url" value={form.link_url ?? ''} onChange={(e) => set('link_url', e.target.value)} className={inputCls} placeholder="https://www.zachej.sk/produkt/…" />
                </Field>
                <Field label="PDF na stiahnutie (nepovinné)" hint="Odkaz na PDF, ak je číslo voľne dostupné.">
                  <input type="url" value={form.pdf_url ?? ''} onChange={(e) => set('pdf_url', e.target.value)} className={inputCls} placeholder="https://…" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.published !== false} onChange={(e) => set('published', e.target.checked)} className={checkboxCls} /> Zverejnené na webe
              </label>
              <button type="button" onClick={save} disabled={pending || uploading} className={btnPrimary}>
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Uložiť
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {issues.map((m) => (
          <div key={m.id} className="group">
            <div className="relative aspect-[3/4] rounded-xl bg-gray-100 overflow-hidden border border-gray-100">
              {m.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.cover_url} alt="" loading="lazy" className={`w-full h-full object-cover ${m.published ? '' : 'opacity-40 grayscale'}`} />
              )}
              {!m.published && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-gray-900/70 text-white text-[10px] font-bold inline-flex items-center gap-1">
                  <EyeOff size={10} /> skryté
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2 flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
                <button type="button" title="Upraviť" onClick={() => setForm({ id: m.id, issue_number: m.issue_number ?? '', title: m.title, description: m.description, cover_url: m.cover_url, pdf_url: m.pdf_url, link_url: m.link_url, published: m.published })} className="p-1.5 rounded-lg bg-white text-gray-700 cursor-pointer">
                  <Pencil size={14} />
                </button>
                {m.link_url && (
                  <a href={m.link_url} target="_blank" rel="noopener noreferrer" title="Zachej.sk" className="p-1.5 rounded-lg bg-white text-gray-700">
                    <ExternalLink size={14} />
                  </a>
                )}
                <button type="button" title="Zmazať" onClick={() => remove(m)} className="p-1.5 rounded-lg bg-white text-red-600 cursor-pointer">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs font-black text-gray-900">{m.issue_number}</p>
            <p className="text-xs text-gray-500 line-clamp-2">{m.title}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
