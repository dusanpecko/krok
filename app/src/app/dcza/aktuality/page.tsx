import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategories, getPosts } from '@/lib/diocese/public'
import PostCard from '@/components/dcza/PostCard'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Aktuality' }

const PER_PAGE = 12

export default async function DczaNews({ searchParams }: { searchParams: Promise<{ kategoria?: string; strana?: string }> }) {
  const { kategoria, strana } = await searchParams
  const page = Math.max(1, Number.parseInt(strana ?? '1', 10) || 1)
  const [categories, rows] = await Promise.all([getCategories(), getPosts({ category: kategoria ?? null, limit: PER_PAGE + 1, offset: (page - 1) * PER_PAGE })])
  const active = categories.find((c) => c.slug === kategoria)
  const link = (o: { kategoria?: string | null; strana?: number }) => {
    const p = new URLSearchParams()
    if (o.kategoria) p.set('kategoria', o.kategoria)
    if (o.strana && o.strana > 1) p.set('strana', String(o.strana))
    return p.size ? `/aktuality?${p}` : '/aktuality'
  }
  const chip = (on: boolean) => `px-3.5 py-1.5 rounded-full text-sm font-bold ${on ? 'bg-blue text-white' : 'bg-white border border-blue/15 text-ink/80 hover:border-blue/40'}`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Žilinská diecéza</p>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-6">{active ? active.name : 'Aktuality'}</h1>
      <div className="flex flex-wrap gap-2 mb-8">
        <Link href={link({})} className={chip(!active)}>
          Všetko
        </Link>
        {categories.map((c) => (
          <Link key={c.slug} href={link({ kategoria: c.slug })} className={chip(active?.slug === c.slug)}>
            {c.name}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-mute py-16 text-center">Zatiaľ tu nie sú žiadne články.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.slice(0, PER_PAGE).map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
      {(page > 1 || rows.length > PER_PAGE) && (
        <div className="flex justify-between mt-10 text-sm font-extrabold">
          {page > 1 ? <Link href={link({ kategoria, strana: page - 1 })} className="text-blue hover:underline">← Novšie</Link> : <span />}
          {rows.length > PER_PAGE && <Link href={link({ kategoria, strana: page + 1 })} className="text-blue hover:underline">Staršie →</Link>}
        </div>
      )}
    </div>
  )
}
