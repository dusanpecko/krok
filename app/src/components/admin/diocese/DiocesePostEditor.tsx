'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, ImagePlus, Loader2, Pin, Save, Send, Trash2, X } from 'lucide-react'
import SimpleRichTextEditor from '@/components/admin/SimpleRichTextEditor'
import { adminDeleteDiocesePost, adminSaveDiocesePost, adminUploadDioceseImage } from '@/app/admin/web-dieceza/actions'
import type { AdminDioceseCategory, AdminDiocesePost, DiocesePostInput } from '@/lib/diocese/posts-admin'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice } from '@/components/admin/projects/ui'

type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null

const toLocal = (iso: string | null | undefined) => {
  const d = iso ? new Date(iso) : new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

/** Editor článku webu diecézy. */
export default function DiocesePostEditor({ post, categories }: { post: AdminDiocesePost | null; categories: AdminDioceseCategory[] }) {
  const router = useRouter()
  const [form, setForm] = useState<DiocesePostInput>(
    post
      ? { id: post.id, title: post.title, excerpt: post.excerpt ?? '', content: post.content ?? '', image_url: post.image_url, published: post.published, published_at: post.published_at, pinned: post.pinned, category_ids: post.category_ids }
      : { title: '', excerpt: '', content: '', image_url: null, published: false, published_at: null, pinned: false, category_ids: [] }
  )
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof DiocesePostInput>(k: K, v: DiocesePostInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = (published: boolean) =>
    start(async () => {
      const res = await adminSaveDiocesePost({ ...form, published })
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      if (!post) return router.replace(`/admin/web-dieceza/aktuality/${res.id}`)
      setForm((f) => ({ ...f, published }))
      setMsg({ kind: 'success', text: published ? 'Uložené a zverejnené na dcza.sk.' : 'Uložené ako koncept.' })
      router.refresh()
    })

  const uploadCover = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await adminUploadDioceseImage(fd)
    setUploading(false)
    if (!res.url) return setMsg({ kind: 'error', text: res.error ?? 'Nahratie zlyhalo.' })
    set('image_url', res.url)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/admin/web-dieceza/aktuality" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Aktuality webu diecézy
      </Link>
      <div className={`${cardCls} space-y-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-black text-gray-900">{post ? 'Upraviť článok' : 'Nový článok'}</h1>
          <div className="flex items-center gap-2">
            {post?.published && (
              <a href={`/aktuality/${post.slug}`} target="_blank" rel="noopener noreferrer" className={btnSecondary} title="Na test.mojkrok.sk najprv prepnite web cez /web/dieceza">
                <ExternalLink size={14} /> Zobraziť na webe
              </a>
            )}
            <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${form.published ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{form.published ? 'Zverejnené' : 'Koncept'}</span>
          </div>
        </div>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

        <Field label="Nadpis">
          <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} maxLength={300} />
        </Field>
        <Field label="Perex (krátky úvod)" hint="Zobrazí sa v zozname, na úvode a vo vyhľadávačoch. Ak ho nevyplníte, vezme sa začiatok textu.">
          <textarea rows={2} value={form.excerpt ?? ''} onChange={(e) => set('excerpt', e.target.value)} className={inputCls} maxLength={500} />
        </Field>

        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-1.5">Titulný obrázok</p>
            <div className="aspect-[16/10] rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
              {form.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={26} className="text-gray-300" />
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={`${btnSecondary} flex-1`}>
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {form.image_url ? 'Zmeniť' : 'Nahrať'}
              </button>
              {form.image_url && (
                <button type="button" onClick={() => set('image_url', null)} className={btnSecondary} title="Odstrániť obrázok">
                  <X size={14} />
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void uploadCover(f)
              }}
            />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-1.5">Kategórie</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const on = form.category_ids.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => set('category_ids', on ? form.category_ids.filter((x) => x !== c.id) : [...form.category_ids, c.id])}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Dátum zverejnenia" hint="Podľa neho sa článok radí; budúci dátum = zobrazí sa až vtedy.">
                <input type="datetime-local" value={toLocal(form.published_at)} onChange={(e) => set('published_at', e.target.value ? new Date(e.target.value).toISOString() : null)} className={inputCls} />
              </Field>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer self-end pb-3">
                <input type="checkbox" checked={!!form.pinned} onChange={(e) => set('pinned', e.target.checked)} className={checkboxCls} />
                <Pin size={14} className="text-amber-500" /> Pripnúť navrch
              </label>
            </div>
          </div>
        </div>

        <SimpleRichTextEditor label="Text článku" value={form.content ?? ''} onChange={(v) => set('content', v)} minHeight="360px" uploader={adminUploadDioceseImage} />

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" onClick={() => save(true)} disabled={pending || uploading} className={btnPrimary}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {form.published ? 'Uložiť' : 'Zverejniť'}
          </button>
          <button type="button" onClick={() => save(false)} disabled={pending || uploading} className={btnSecondary}>
            <Save size={14} /> {form.published ? 'Stiahnuť do konceptu' : 'Uložiť koncept'}
          </button>
          {post && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                confirm(`Naozaj zmazať „${post.title}“?`) &&
                start(async () => {
                  const res = await adminDeleteDiocesePost(post.id)
                  if (!res.success) return setMsg({ kind: 'error', text: res.error })
                  router.replace('/admin/web-dieceza/aktuality')
                })
              }
              className={`${btnSecondary} ml-auto hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700`}
            >
              <Trash2 size={14} /> Zmazať
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
