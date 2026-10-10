'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Save, Trash2 } from 'lucide-react'
import type { HelpArticle } from '@/lib/help'
import { HELP_ZONE_LABEL, helpHref, type HelpZone } from '@/lib/help-links'
import { deleteHelpArticle, saveHelpArticle } from '@/app/admin/pomoc/actions'
import SimpleRichTextEditor from '@/components/admin/SimpleRichTextEditor'

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-100'
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5'

/** Formulár návodu Pomoci – názov, adresa, zóna, poradie, zverejnenie a text v editore. */
export default function HelpArticleEditor({ article, defaultZone }: { article: HelpArticle | null; defaultZone: HelpZone }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    zone: article?.zone ?? defaultZone,
    slug: article?.slug ?? '',
    title: article?.title ?? '',
    summary: article?.summary ?? '',
    content: article?.content ?? '',
    sort_order: article?.sort_order ?? 0,
    published: article?.published ?? true,
  })
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setSaved(false)
    setForm((f) => ({ ...f, [k]: v }))
  }

  const save = () =>
    startTransition(async () => {
      setError(null)
      const res = await saveHelpArticle(article?.id ?? null, form)
      if (!res.ok) return setError(res.error)
      setSaved(true)
      if (!article) router.replace(`/admin/pomoc/sprava/${res.id}`)
      else router.refresh()
    })

  const remove = () => {
    if (!article || !confirm(`Naozaj zmazať návod „${article.title}“? Odkazy „?“, ktoré naň vedú, prestanú fungovať.`)) return
    startTransition(async () => {
      const res = await deleteHelpArticle(article.id)
      if (!res.ok) return setError(res.error ?? 'Chyba.')
      router.replace('/admin/pomoc/sprava')
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/admin/pomoc/sprava" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={15} /> Správa návodov
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-gray-900">{article ? 'Upraviť návod' : 'Nový návod'}</h1>
        {article?.published && (
          <Link href={helpHref(article.zone, article.slug)} className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline">
            Zobraziť <ExternalLink size={14} />
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Názov</label>
            <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ako pridať farský oznam" />
          </div>
          <div>
            <label className={labelCls}>Adresa (slug)</label>
            <input className={inputCls} value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="oznamy-a-aktuality" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Krátky popis (do zoznamu)</label>
            <input className={inputCls} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Jedna veta, o čom návod je" />
          </div>
          <div>
            <label className={labelCls}>Zóna</label>
            <select className={inputCls} value={form.zone} onChange={(e) => set('zone', e.target.value as HelpZone)}>
              {(['parish', 'admin'] as const).map((z) => (
                <option key={z} value={z}>{HELP_ZONE_LABEL[z]}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Poradie</label>
              <input type="number" className={inputCls} value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} />
            </div>
            <label className="flex items-center gap-2 mt-6 text-sm font-bold text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} className="w-4 h-4" /> Zverejnený
            </label>
          </div>
        </div>
        <SimpleRichTextEditor label="Text návodu" value={form.content} onChange={(v) => set('content', v)} minHeight="380px" />
      </div>

      {error && <p className="rounded-xl bg-red-50 text-red-700 text-sm font-bold px-4 py-3">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={save} disabled={pending} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
          <Save size={16} /> {pending ? 'Ukladám…' : 'Uložiť'}
        </button>
        {saved && <span className="text-sm font-bold text-green-700">Uložené</span>}
        {article && (
          <button type="button" onClick={remove} disabled={pending} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-600 font-bold hover:bg-red-50 cursor-pointer">
            <Trash2 size={16} /> Zmazať
          </button>
        )}
      </div>
    </div>
  )
}
