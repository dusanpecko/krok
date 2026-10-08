'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Eye, EyeOff, ImageOff, Pencil, Pin, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { adminDeleteDioceseCategory, adminMoveDioceseCategory, adminSaveDioceseCategory } from '@/app/admin/web-dieceza/actions'
import type { AdminDioceseCategory, AdminDiocesePost } from '@/lib/diocese/posts-admin'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null
const PER_PAGE = 50
const fmt = (iso: string) => new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' })

/** Aktuality webu diecézy – zoznam a kategórie (§ 20, D3). */
export default function DiocesePostsAdmin({ posts, categories }: { posts: AdminDiocesePost[]; categories: AdminDioceseCategory[] }) {
  const [tab, setTab] = useState<'posts' | 'categories'>('posts')
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Web diecézy dcza.sk</p>
          <h1 className="text-2xl font-black text-gray-900">Aktuality</h1>
          <p className="text-sm text-gray-500 mt-1">Aktuality Kroku sa na dcza.sk pridávajú samy (kategória KROK) – spravujú sa vo Web KROK → Aktuality.</p>
        </div>
        <Link href="/admin/web-dieceza/aktuality/novy" className={btnPrimary}>
          <Plus size={16} /> Nový článok
        </Link>
      </div>
      <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        {(
          [
            ['posts', `Články (${posts.length})`],
            ['categories', `Kategórie (${categories.length})`],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer ${tab === k ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'posts' ? <PostsTab posts={posts} categories={categories} /> : <CategoriesTab categories={categories} />}
    </div>
  )
}

function PostsTab({ posts, categories }: { posts: AdminDiocesePost[]; categories: AdminDioceseCategory[] }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [state, setState] = useState<'all' | 'published' | 'draft' | 'pinned'>('all')
  const [page, setPage] = useState(1)
  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return posts.filter((p) => {
      if (cat !== 'all' && !p.category_ids.includes(cat)) return false
      if (state === 'published' && !p.published) return false
      if (state === 'draft' && p.published) return false
      if (state === 'pinned' && !p.pinned) return false
      return !needle || p.title.toLowerCase().includes(needle)
    })
  }, [posts, q, cat, state])
  const shown = list.slice(0, page * PER_PAGE)

  return (
    <div className={`${cardCls} space-y-4`}>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder="Hľadať v nadpisoch" className={`${inputCls} !pl-9`} />
        </div>
        <select value={cat} onChange={(e) => (setCat(e.target.value), setPage(1))} className={`${inputCls} !w-auto`}>
          <option value="all">Všetky kategórie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.post_count})
            </option>
          ))}
        </select>
        <select value={state} onChange={(e) => (setState(e.target.value as typeof state), setPage(1))} className={`${inputCls} !w-auto`}>
          <option value="all">Všetky</option>
          <option value="published">Zverejnené</option>
          <option value="draft">Koncepty</option>
          <option value="pinned">Pripnuté</option>
        </select>
      </div>
      <p className="text-xs text-gray-400">{list.length} článkov</p>
      <ul className="divide-y divide-gray-100">
        {shown.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/web-dieceza/aktuality/${p.id}`} className="py-3 px-2 -mx-2 rounded-xl flex items-center gap-4 hover:bg-gray-50">
              <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <ImageOff size={16} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                  {p.pinned && <Pin size={13} className="text-amber-500 shrink-0" />}
                  {p.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {fmt(p.published_at)} · {p.category_ids.map((c) => catName.get(c)).filter(Boolean).join(', ') || 'bez kategórie'}
                </p>
              </div>
              {p.published ? (
                <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1">
                  <Eye size={13} /> Zverejnené
                </span>
              ) : (
                <span className="text-xs font-bold text-gray-400 inline-flex items-center gap-1">
                  <EyeOff size={13} /> Koncept
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {shown.length < list.length && (
        <button type="button" onClick={() => setPage((x) => x + 1)} className={`${btnSecondary} w-full`}>
          Zobraziť ďalšie ({list.length - shown.length})
        </button>
      )}
    </div>
  )
}

function CategoriesTab({ categories }: { categories: AdminDioceseCategory[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<{ id?: string; name: string; description: string; is_visible: boolean } | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok?: string) =>
    start(async () => {
      const res = await fn()
      setMsg(res.success ? (ok ? { kind: 'success', text: ok } : null) : { kind: 'error', text: res.error ?? 'Chyba' })
      if (res.success) router.refresh()
    })

  return (
    <div className={`${cardCls} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle title="Kategórie" description="Poradie filtrov v Aktualitách na dcza.sk. Skrytá kategória sa v zozname filtrov nezobrazí. Kategória KROK (aktuality Kroku) sa pridáva automaticky." />
        <button type="button" onClick={() => setEditing({ name: '', description: '', is_visible: true })} className={btnPrimary}>
          <Plus size={16} /> Nová kategória
        </button>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {editing && (
        <form
          className="flex flex-wrap items-end gap-2 p-4 rounded-2xl bg-gray-50"
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              const res = await adminSaveDioceseCategory(editing)
              if (res.success) setEditing(null)
              return res
            }, 'Uložené.')
          }}
        >
          <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Názov" className={`${inputCls} !w-64`} />
          <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Popis (nepovinné)" className={`${inputCls} flex-1 min-w-[220px]`} />
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 pb-3">
            <input type="checkbox" checked={editing.is_visible} onChange={(e) => setEditing({ ...editing, is_visible: e.target.checked })} className={checkboxCls} /> Viditeľná
          </label>
          <button type="submit" disabled={pending} className={btnPrimary}>
            <Save size={14} /> Uložiť
          </button>
          <button type="button" onClick={() => setEditing(null)} className={btnSecondary}>
            <X size={14} />
          </button>
        </form>
      )}
      <ul className="divide-y divide-gray-100">
        {categories.map((c, i) => (
          <li key={c.id} className="py-2.5 flex items-center gap-3">
            <div className="flex flex-col">
              <button type="button" disabled={pending || i === 0} onClick={() => run(() => adminMoveDioceseCategory(c.id, -1))} className="text-gray-300 hover:text-blue-600 disabled:opacity-30 cursor-pointer">
                <ArrowUp size={14} />
              </button>
              <button type="button" disabled={pending || i === categories.length - 1} onClick={() => run(() => adminMoveDioceseCategory(c.id, 1))} className="text-gray-300 hover:text-blue-600 disabled:opacity-30 cursor-pointer">
                <ArrowDown size={14} />
              </button>
            </div>
            <div className="flex-1">
              <p className={`font-bold ${c.is_visible ? 'text-gray-900' : 'text-gray-400'}`}>
                {c.name} {!c.is_visible && <EyeOff size={13} className="inline ml-1" />}
              </p>
              {c.description && <p className="text-xs text-gray-400">{c.description}</p>}
            </div>
            <span className="text-xs text-gray-400">{c.post_count} článkov</span>
            <button type="button" onClick={() => setEditing({ id: c.id, name: c.name, description: c.description ?? '', is_visible: c.is_visible })} className={btnSecondary}>
              <Pencil size={14} />
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => confirm(`Zmazať kategóriu „${c.name}“?`) && run(() => adminDeleteDioceseCategory(c.id), 'Zmazané.')}
              className={`${btnSecondary} hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700`}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
