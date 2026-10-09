import Link from 'next/link'
import { requireZonePage } from '@/lib/clergy-zone/access'
import { listCategories, searchDocs } from '@/lib/clergy-zone/docs'
import ZoneShell, { NoZoneAccess } from '@/components/clergy-zone/ZoneShell'
import DocCard from '@/components/clergy-zone/DocCard'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string; kategoria?: string; strana?: string }>
}

export default async function ZoneSearchPage({ searchParams }: PageProps) {
  const { q = '', kategoria, strana } = await searchParams
  const query = String(q).slice(0, 200)
  const access = await requireZonePage(`/knazska-zona/hladat?q=${encodeURIComponent(query)}`)
  if (!access) return <NoZoneAccess />
  const categories = await listCategories(access.db)
  const cat = categories.find((c) => c.slug === kategoria) ?? null
  const page = Math.max(1, Number.parseInt(strana ?? '1', 10) || 1)
  const { hits, hasMore, terms } = await searchDocs(access.db, query, { categoryId: cat?.id, page })
  const link = (o: { kategoria?: string | null; strana?: number }) => {
    const p = new URLSearchParams({ q: query })
    if (o.kategoria) p.set('kategoria', o.kategoria)
    if (o.strana && o.strana > 1) p.set('strana', String(o.strana))
    return `/knazska-zona/hladat?${p}`
  }
  const chip = (active: boolean) => `px-3 py-1.5 rounded-full text-sm font-bold ${active ? 'bg-blue text-white' : 'bg-white border border-blue/15 text-ink/80 hover:border-blue/40'}`

  return (
    <ZoneShell access={{ name: access.name, canManage: access.canManage }} categories={categories} activeSlug={cat?.slug} query={query}>
      <h2 className="text-2xl font-light mb-1">{terms.length ? <>Výsledky pre „{query}“</> : 'Hľadanie'}</h2>
      <p className="text-sm text-mute mb-5">
        {terms.length
          ? 'Hľadá sa v názvoch, popisoch aj v texte priložených PDF a Word súborov – bez ohľadu na diakritiku; stačí aj začiatok slova.'
          : 'Zadajte aspoň jedno slovo (min. 2 znaky).'}
      </p>
      {terms.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href={link({})} className={chip(!cat)}>
            Všetky kategórie
          </Link>
          {categories
            .filter((c) => c.current + c.archived > 0)
            .map((c) => (
              <Link key={c.id} href={link({ kategoria: c.slug })} className={chip(cat?.id === c.id)}>
                {c.name}
              </Link>
            ))}
        </div>
      )}
      {terms.length > 0 && hits.length === 0 && (
        <p className="rounded-2xl bg-white border border-blue/10 p-8 text-center text-mute">Nič sa nenašlo. Skúste iné alebo menej slov.</p>
      )}
      <div className="space-y-3">
        {hits.map((h) => (
          <DocCard key={h.id} doc={h} showCategory />
        ))}
      </div>
      {(page > 1 || hasMore) && (
        <div className="flex justify-between mt-8 text-sm font-extrabold">
          {page > 1 ? <Link href={link({ kategoria: cat?.slug, strana: page - 1 })} className="text-blue hover:underline">← Predchádzajúce</Link> : <span />}
          {hasMore && <Link href={link({ kategoria: cat?.slug, strana: page + 1 })} className="text-blue hover:underline">Ďalšie →</Link>}
        </div>
      )}
    </ZoneShell>
  )
}
