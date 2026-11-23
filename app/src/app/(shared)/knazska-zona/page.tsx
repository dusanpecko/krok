import Link from 'next/link'
import { ArrowRight, FolderOpen, Sparkles } from 'lucide-react'
import { requireZonePage } from '@/lib/clergy-zone/access'
import { listCategories, listRecentDocs } from '@/lib/clergy-zone/docs'
import { NEW_DAYS, docCount, isNewDoc } from '@/lib/clergy-zone/types'
import ZoneShell, { NoZoneAccess } from '@/components/clergy-zone/ZoneShell'
import DocCard from '@/components/clergy-zone/DocCard'

export const dynamic = 'force-dynamic'

/** Kňazská zóna – úvod: nové dokumenty a kategórie (krok_navrh_farnosti.md § 15). */
export default async function ClergyZonePage() {
  const access = await requireZonePage('/knazska-zona')
  if (!access) return <NoZoneAccess />
  const [categories, recent] = await Promise.all([listCategories(access.db), listRecentDocs(access.db, 6)])
  const fresh = recent.filter((d) => isNewDoc(d.published_at))

  return (
    <ZoneShell access={{ name: access.name, canManage: access.canManage }} categories={categories}>
      <section className="mb-12">
        <h2 className="flex items-center gap-2 text-xl font-light mb-4">
          <Sparkles size={20} className="text-gold-ink" /> {fresh.length ? `Nové za posledných ${NEW_DAYS} dní` : 'Naposledy pridané'}
        </h2>
        {recent.length === 0 ? (
          <p className="rounded-2xl bg-white border border-blue/10 p-8 text-center text-mute">Zatiaľ tu nie sú žiadne dokumenty.</p>
        ) : (
          <div className="space-y-3">
            {(fresh.length ? fresh : recent).map((d) => (
              <DocCard key={d.id} doc={d} showCategory />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-light mb-4">Kategórie</h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {categories.map((c) => (
            <Link key={c.id} href={`/knazska-zona/kategoria/${c.slug}`} className="group rounded-2xl bg-white border border-blue/10 p-5 hover:border-gold/50 transition-colors">
              <FolderOpen size={22} className="text-gold-ink mb-3" />
              <p className="font-extrabold group-hover:text-blue">{c.name}</p>
              {c.description && <p className="text-sm text-mute mt-1 line-clamp-2">{c.description}</p>}
              <p className="text-xs text-mute mt-2 inline-flex items-center gap-1">
                {c.current ? docCount(c.current) : 'zatiaľ prázdne'}
                {c.archived > 0 && ` · archív ${c.archived}`} <ArrowRight size={12} className="opacity-0 group-hover:opacity-100" />
              </p>
            </Link>
          ))}
        </div>
      </section>
    </ZoneShell>
  )
}
