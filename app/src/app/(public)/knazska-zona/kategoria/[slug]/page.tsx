import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Archive, FileText } from 'lucide-react'
import { requireZonePage } from '@/lib/clergy-zone/access'
import { categoryYears, listCategories, listCategoryDocs } from '@/lib/clergy-zone/docs'
import ZoneShell, { NoZoneAccess } from '@/components/clergy-zone/ZoneShell'
import DocCard from '@/components/clergy-zone/DocCard'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ archiv?: string; rok?: string }>
}

export default async function ZoneCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { archiv, rok } = await searchParams
  const access = await requireZonePage(`/knazska-zona/kategoria/${slug}`)
  if (!access) return <NoZoneAccess />
  const categories = await listCategories(access.db)
  const cat = categories.find((c) => c.slug === slug)
  if (!cat) notFound()
  const status = archiv === '1' ? 'archived' : 'current'
  const year = rok && /^\d{4}$/.test(rok) ? Number(rok) : null
  const [docs, years] = await Promise.all([listCategoryDocs(access.db, cat.id, status, year), categoryYears(access.db, cat.id, status)])
  const base = `/knazska-zona/kategoria/${slug}`
  const link = (o: { archiv?: boolean; rok?: number | null }) => {
    const p = new URLSearchParams()
    if (o.archiv) p.set('archiv', '1')
    if (o.rok) p.set('rok', String(o.rok))
    return p.size ? `${base}?${p}` : base
  }
  const chip = (active: boolean) => `px-3 py-1.5 rounded-full text-sm font-bold ${active ? 'bg-blue text-white' : 'bg-white border border-blue/15 text-ink/80 hover:border-blue/40'}`

  return (
    <ZoneShell access={access} categories={categories} activeSlug={slug}>
      <h2 className="text-3xl font-light">{cat.name}</h2>
      {cat.description && <p className="text-mute mt-1">{cat.description}</p>}
      <div className="flex flex-wrap items-center gap-2 mt-5 mb-6">
        <Link href={link({})} className={chip(status === 'current')}>
          <FileText size={13} className="inline mr-1 -mt-0.5" /> Aktuálne ({cat.current})
        </Link>
        <Link href={link({ archiv: true })} className={chip(status === 'archived')}>
          <Archive size={13} className="inline mr-1 -mt-0.5" /> Archív ({cat.archived})
        </Link>
        {years.length > 1 && <span className="w-px h-6 bg-blue/15 mx-1" />}
        {years.length > 1 && (
          <>
            <Link href={link({ archiv: status === 'archived' })} className={chip(!year)}>
              Všetky roky
            </Link>
            {years.map((y) => (
              <Link key={y} href={link({ archiv: status === 'archived', rok: y })} className={chip(year === y)}>
                {y}
              </Link>
            ))}
          </>
        )}
      </div>
      {docs.length === 0 ? (
        <p className="rounded-2xl bg-white border border-blue/10 p-8 text-center text-mute">
          {status === 'archived' ? 'V archíve tejto kategórie nie sú žiadne dokumenty.' : 'V tejto kategórii zatiaľ nie sú žiadne dokumenty.'}
        </p>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <DocCard key={d.id} doc={d} />
          ))}
        </div>
      )}
    </ZoneShell>
  )
}
