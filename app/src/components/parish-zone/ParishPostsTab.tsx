'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Eye, EyeOff, FileText, Loader2, Newspaper, Pencil, Pin, Plus, Save, Trash2, Upload, X, AlertTriangle, ExternalLink } from 'lucide-react'
import SimpleRichTextEditor from '@/components/admin/SimpleRichTextEditor'
import type { ParishPostInput, ParishPostRow, ParishPostType } from '@/lib/parishes/posts'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null

export interface PostActions {
  save: (parishId: string, input: ParishPostInput) => Promise<{ success: true; id: string; slug: string } | { success: false; error: string }>
  remove: (parishId: string, postId: string) => Promise<{ success: true } | { success: false; error: string }>
  upload: (parishId: string, formData: FormData) => Promise<{ url?: string; name?: string; error?: string }>
  uploadEditorImage: (parishId: string, formData: FormData) => Promise<{ url?: string; error?: string }>
  /** albumy galérie na pripojenie k aktualite (§ 17) */
  listAlbums: (parishId: string) => Promise<{ id: string; title: string; event_date: string | null }[]>
}

const TYPE_LABEL: Record<ParishPostType, string> = { announcement: 'Oznamy', news: 'Aktuality' }

/** Najbližšia nedeľa → nasledujúca sobota: predvolený týždeň platnosti oznamov. */
function nextWeek() {
  const d = new Date()
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  const to = new Date(d)
  to.setDate(d.getDate() + 6)
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  return { from: iso(d), to: iso(to) }
}

const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function emptyPost(type: ParishPostType): ParishPostInput {
  const w = nextWeek()
  return {
    type,
    title: type === 'announcement' ? `Farské oznamy ${w.from.slice(8, 10)}. ${w.from.slice(5, 7)}. – ${w.to.slice(8, 10)}. ${w.to.slice(5, 7)}.`.replace(/(\D)0(\d)/g, '$1$2') : '',
    content: '',
    excerpt: '',
    image_url: null,
    attachment_url: null,
    attachment_name: null,
    valid_from: type === 'announcement' ? w.from : null,
    valid_to: type === 'announcement' ? w.to : null,
    event_at: null,
    published: true,
    pinned: false,
    album_id: null,
  }
}

export default function ParishPostsTab({ parishId, parishSlug, posts, actions }: { parishId: string; parishSlug: string | null; posts: ParishPostRow[]; actions: PostActions }) {
  const router = useRouter()
  const [type, setType] = useState<ParishPostType>('announcement')
  const [editing, setEditing] = useState<ParishPostInput | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, startTransition] = useTransition()
  const list = posts.filter((p) => p.type === type)

  const edit = (p: ParishPostRow) =>
    setEditing({
      id: p.id, type: p.type, title: p.title, content: p.content ?? '', excerpt: p.excerpt ?? '', image_url: p.image_url,
      attachment_url: p.attachment_url, attachment_name: p.attachment_name, valid_from: p.valid_from, valid_to: p.valid_to,
      event_at: p.event_at, published: p.published, pinned: p.pinned, album_id: p.album_id,
    })

  const remove = (p: ParishPostRow) => {
    if (!confirm(`Naozaj zmazať „${p.title}“?`)) return
    startTransition(async () => {
      const res = await actions.remove(parishId, p.id)
      setMsg(res.success ? { kind: 'success', text: 'Zmazané.' } : { kind: 'error', text: res.error })
      router.refresh()
    })
  }

  if (editing) {
    return (
      <PostEditor
        parishId={parishId}
        initial={editing}
        actions={actions}
        takenDown={posts.find((p) => p.id === editing.id)?.taken_down_at ? posts.find((p) => p.id === editing.id)?.takedown_reason ?? '' : null}
        onClose={(saved) => {
          setEditing(null)
          if (saved) {
            setMsg({ kind: 'success', text: 'Uložené.' })
            router.refresh()
          }
        }}
      />
    )
  }

  return (
    <div className={`${cardCls} space-y-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle title="Oznamy a aktuality" description="Zverejnené príspevky sú na stránke farnosti hneď. Text z Wordu môžete vložiť priamo – formátovanie sa vyčistí." />
        <button type="button" onClick={() => setEditing(emptyPost(type))} className={btnPrimary}>
          <Plus size={16} /> {type === 'announcement' ? 'Nové oznamy' : 'Nová aktualita'}
        </button>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="flex gap-1 bg-gray-50 p-1 rounded-xl w-fit">
        {(['announcement', 'news'] as ParishPostType[]).map((t) => (
          <button key={t} type="button" onClick={() => setType(t)} className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer inline-flex items-center gap-1.5 ${type === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            {t === 'announcement' ? <Bell size={14} /> : <Newspaper size={14} />} {TYPE_LABEL[t]} <span className="text-xs text-gray-400">({posts.filter((p) => p.type === t).length})</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Zatiaľ žiadne {type === 'announcement' ? 'oznamy' : 'aktuality'}.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {list.map((p) => {
            const url = parishSlug ? `/farnosti/${parishSlug}/${p.type === 'announcement' ? 'oznamy' : 'aktuality'}/${p.slug}` : null
            return (
              <li key={p.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-bold text-gray-900 flex items-center gap-2">
                    {p.pinned && <Pin size={13} className="text-amber-500" />}
                    {p.title}
                    {p.attachment_url && <FileText size={13} className="text-gray-400" />}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.taken_down_at ? (
                      <span className="text-red-600 font-bold">Stiahnuté biskupským úradom{p.takedown_reason ? ` – ${p.takedown_reason}` : ''}</span>
                    ) : p.published ? (
                      <span className="text-emerald-600 font-bold">Zverejnené</span>
                    ) : (
                      <span className="font-bold">Koncept</span>
                    )}
                    {p.valid_from && ` · ${p.valid_from} – ${p.valid_to ?? ''}`}
                    {p.event_at && ` · udalosť ${new Date(p.event_at).toLocaleString('sk-SK')}`}
                  </p>
                </div>
                {url && p.published && !p.taken_down_at && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                    <ExternalLink size={14} /> Zobraziť
                  </a>
                )}
                <button type="button" onClick={() => edit(p)} className={btnSecondary}>
                  <Pencil size={14} /> Upraviť
                </button>
                <button type="button" onClick={() => remove(p)} disabled={pending} className={`${btnSecondary} hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700`}>
                  <Trash2 size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PostEditor({ parishId, initial, actions, takenDown, onClose }: { parishId: string; initial: ParishPostInput; actions: PostActions; takenDown: string | null; onClose: (saved: boolean) => void }) {
  const [form, setForm] = useState<ParishPostInput>(initial)
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState<'image' | 'pdf' | null>(null)
  const set = <K extends keyof ParishPostInput>(k: K, v: ParishPostInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const isAnn = form.type === 'announcement'

  const upload = async (file: File, kind: 'image' | 'pdf') => {
    setUploading(kind)
    const fd = new FormData()
    fd.append('file', file)
    const res = await actions.upload(parishId, fd)
    setUploading(null)
    if (!res.url) return setMsg({ kind: 'error', text: res.error ?? 'Nahrávanie zlyhalo.' })
    if (kind === 'image') set('image_url', res.url)
    else setForm((f) => ({ ...f, attachment_url: res.url!, attachment_name: f.attachment_name || res.name?.replace(/\.pdf$/i, '') || null }))
  }

  const save = (published: boolean) =>
    startTransition(async () => {
      const res = await actions.save(parishId, { ...form, published })
      if (res.success) onClose(true)
      else setMsg({ kind: 'error', text: res.error })
    })

  return (
    <div className={`${cardCls} space-y-5`}>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle title={`${form.id ? 'Upraviť' : 'Nové'} – ${isAnn ? 'oznamy' : 'aktualita'}`} description={isAnn ? 'Týždenné farské oznamy. Text skopírujte z Wordu, prípadne priložte PDF.' : 'Správa z farnosti alebo pozvánka na udalosť (vyplňte dátum konania).'} />
        <button type="button" onClick={() => onClose(false)} className={btnSecondary}>
          <X size={14} /> Zavrieť
        </button>
      </div>
      {takenDown != null && (
        <Notice kind="error">
          <span className="inline-flex items-center gap-2"><AlertTriangle size={16} /> Príspevok stiahol biskupský úrad{takenDown ? `: ${takenDown}` : '.'} Môžete ho upraviť, znova zverejniť ho môže len úrad.</span>
        </Notice>
      )}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <Field label="Nadpis">
        <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} maxLength={200} />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isAnn ? (
          <>
            <Field label="Platí od"><input type="date" value={form.valid_from ?? ''} onChange={(e) => set('valid_from', e.target.value || null)} className={inputCls} /></Field>
            <Field label="Platí do"><input type="date" value={form.valid_to ?? ''} onChange={(e) => set('valid_to', e.target.value || null)} className={inputCls} /></Field>
          </>
        ) : (
          <Field label="Dátum a čas konania" hint="Len ak ide o udalosť – zobrazí sa v „Pripravujeme“.">
            <input type="datetime-local" value={toLocalInput(form.event_at ?? null)} onChange={(e) => set('event_at', e.target.value ? new Date(e.target.value).toISOString() : null)} className={inputCls} />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer self-end pb-3">
          <input type="checkbox" checked={!!form.pinned} onChange={(e) => set('pinned', e.target.checked)} className={checkboxCls} />
          Pripnúť navrch
        </label>
      </div>

      <SimpleRichTextEditor label="Text" value={form.content ?? ''} onChange={(v) => set('content', v)} minHeight="320px" uploader={(fd) => actions.uploadEditorImage(parishId, fd)} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="PDF príloha (nepovinné)" hint="Napr. naskenované oznamy. Max. 15 MB.">
          {form.attachment_url ? (
            <div className="flex items-center gap-2">
              <input value={form.attachment_name ?? ''} onChange={(e) => set('attachment_name', e.target.value)} className={inputCls} placeholder="Názov prílohy" />
              <a href={form.attachment_url} target="_blank" rel="noopener noreferrer" className={btnSecondary}><FileText size={14} /></a>
              <button type="button" onClick={() => setForm((f) => ({ ...f, attachment_url: null, attachment_name: null }))} className={btnSecondary}><X size={14} /></button>
            </div>
          ) : (
            <label className={`${btnSecondary} w-full`}>
              {uploading === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Nahrať PDF
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'pdf')} />
            </label>
          )}
        </Field>
        {!isAnn && (
          <Field label="Titulný obrázok (nepovinné)">
            {form.image_url ? (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="" className="h-12 w-20 object-cover rounded-lg border" />
                <button type="button" onClick={() => set('image_url', null)} className={btnSecondary}><X size={14} /> Odstrániť</button>
              </div>
            ) : (
              <label className={`${btnSecondary} w-full`}>
                {uploading === 'image' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Nahrať obrázok
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'image')} />
              </label>
            )}
          </Field>
        )}
      </div>

      {!isAnn && <AlbumPicker parishId={parishId} value={form.album_id ?? null} onChange={(v) => set('album_id', v)} list={actions.listAlbums} />}

      <Field label="Krátky popis (nepovinné)" hint="Zobrazí sa v zozname a vo vyhľadávačoch. Ak ho nevyplníte, vezme sa začiatok textu.">
        <textarea value={form.excerpt ?? ''} onChange={(e) => set('excerpt', e.target.value)} rows={2} className={inputCls} maxLength={300} />
      </Field>

      <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={() => save(false)} disabled={pending || !!uploading} className={btnSecondary}>
          <EyeOff size={14} /> Uložiť ako koncept
        </button>
        <button type="button" onClick={() => save(true)} disabled={pending || !!uploading || takenDown != null} className={btnPrimary}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : form.published ? <Save size={16} /> : <Eye size={16} />} {initial.id && initial.published ? 'Uložiť' : 'Zverejniť'}
        </button>
      </div>
    </div>
  )
}

function AlbumPicker({ parishId, value, onChange, list }: { parishId: string; value: string | null; onChange: (v: string | null) => void; list: PostActions['listAlbums'] }) {
  const [albums, setAlbums] = useState<{ id: string; title: string; event_date: string | null }[] | null>(null)
  useEffect(() => {
    list(parishId).then(setAlbums, () => setAlbums([]))
  }, [list, parishId])
  return (
    <Field label="Fotky z galérie (nepovinné)" hint="Pripojte album zo záložky Galéria – fotky sa zobrazia pod aktualitou, netreba ich nahrávať znova.">
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={inputCls} disabled={!albums}>
        <option value="">{albums ? (albums.length ? '— bez albumu —' : 'Zatiaľ žiadne albumy (vytvoríte ich v záložke Galéria)') : 'Načítavam…'}</option>
        {albums?.map((a) => (
          <option key={a.id} value={a.id}>
            {a.title}
            {a.event_date ? ` (${new Date(`${a.event_date}T12:00:00`).toLocaleDateString('sk-SK')})` : ''}
          </option>
        ))}
      </select>
    </Field>
  )
}
