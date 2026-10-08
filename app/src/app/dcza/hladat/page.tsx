import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { dioceseDb } from '@/lib/diocese/public'
import { pageHref } from '@/lib/diocese/nav'
import { longDate } from '@/lib/diocese/format'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Hľadať', robots: { index: false } }

/** Jednoduché hľadanie v článkoch a stránkach webu diecézy (názov a perex). */
export default async function DczaSearch({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = String((await searchParams).q ?? '').trim().slice(0, 100)
  const like = `%${q.replace(/[%_,()]/g, ' ')}%`
  const [posts, pages] =
    q.length >= 2
      ? await Promise.all([
          dioceseDb().from('diocese_posts').select('slug, title, excerpt, published_at').eq('published', true).or(`title.ilike.${like},excerpt.ilike.${like}`).order('published_at', { ascending: false }).limit(30),
          dioceseDb().from('diocese_pages').select('path, title, excerpt').eq('published', true).or(`title.ilike.${like},content.ilike.${like}`).limit(20),
        ])
      : [{ data: [] }, { data: [] }]
  const total = (posts.data?.length ?? 0) + (pages.data?.length ?? 0)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-4xl font-light tracking-tight mb-6">Hľadať</h1>
      <form className="relative mb-8">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
        <input name="q" defaultValue={q} autoFocus placeholder="Hľadať na stránke diecézy…" className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-blue/15 focus:outline-none focus:ring-4 focus:ring-blue/10" />
      </form>
      {q.length >= 2 && total === 0 && <p className="text-mute">Nič sa nenašlo.</p>}
      <ul className="space-y-3">
        {(pages.data ?? []).map((p) => (
          <li key={p.path}>
            <Link href={pageHref(p.path)} className="block rounded-2xl bg-white border border-blue/10 p-4 hover:border-gold/60">
              <p className="text-xs font-black uppercase tracking-wider text-wine">Stránka</p>
              <p className="font-extrabold">{p.title}</p>
            </Link>
          </li>
        ))}
        {(posts.data ?? []).map((p) => (
          <li key={p.slug}>
            <Link href={`/aktuality/${p.slug}`} className="block rounded-2xl bg-white border border-blue/10 p-4 hover:border-gold/60">
              <p className="text-xs text-mute">{longDate(p.published_at)}</p>
              <p className="font-extrabold">{p.title}</p>
              {p.excerpt && <p className="text-sm text-mute line-clamp-2 mt-1">{p.excerpt}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
