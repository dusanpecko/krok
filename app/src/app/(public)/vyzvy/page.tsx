import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, HandHeart } from 'lucide-react'
import { getPublicProjects } from '@/lib/projects/public'
import { isProjectOpen } from '@/lib/projects/mappers'
import { PROJECT_CATEGORIES, categoryLabel, formatEur, isProjectCategory } from '@/lib/projects/types'
import ProjectCard from '@/components/public/ProjectCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Výzvy na podporu | KROK – Pastoračný fond Žilinskej diecézy',
  description:
    'Konkrétne projekty, ktoré môžete podporiť: charita, školy, farnosti a mládež v Žilinskej diecéze. Darujte online alebo prevodom a sledujte, ako projekt rastie.',
  openGraph: {
    title: 'Výzvy na podporu | KROK',
    description: 'Vyberte si výzvu, ktorá vám leží na srdci, a podporte ju jednorazovo alebo pravidelne.',
    type: 'website',
  },
}

interface PageProps {
  searchParams: Promise<{ kategoria?: string }>
}

export default async function VyzvyPage({ searchParams }: PageProps) {
  const { kategoria } = await searchParams
  const category = kategoria && isProjectCategory(kategoria) ? kategoria : null

  const all = await getPublicProjects()
  const usedCategories = PROJECT_CATEGORIES.filter((c) => all.some((p) => p.category === c.value))
  const filtered = category ? all.filter((p) => p.category === category) : all

  const active = filtered.filter((p) => p.status === 'active')
  const open = active.filter((p) => isProjectOpen(p))
  const closed = active.filter((p) => !isProjectOpen(p))
  const completed = filtered.filter((p) => p.status === 'completed')

  const totalCollected = all.reduce((acc, p) => acc + p.stats.collected_amount, 0)
  const totalSupporters = all.reduce((acc, p) => acc + p.stats.supporters_count, 0)

  return (
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep min-h-screen text-white pb-24 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-36 sm:pt-44">
        <header className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold-bright mb-4">Váš KROK má konkrétny cieľ</p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-5">Výzvy na podporu</h1>
          <p className="text-blue-100/70 text-base sm:text-lg leading-relaxed">
            Každá výzva má svoj cieľ, rozpočet a garanta. Dar sa priradí priamo k nej a vy vidíte, ako sa napĺňa.
          </p>
          {all.length > 0 && (
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm">
              <span className="text-zinc-300">
                <strong className="text-white text-lg font-extrabold">{formatEur(totalCollected)}</strong> vyzbieraných
              </span>
              <span className="text-zinc-300">
                <strong className="text-white text-lg font-extrabold">{totalSupporters}</strong> darcov
              </span>
              <span className="text-zinc-300">
                <strong className="text-white text-lg font-extrabold">{open.length}</strong> otvorených výziev
              </span>
            </div>
          )}
        </header>

        {usedCategories.length > 1 && (
          <nav className="flex flex-wrap justify-center gap-2.5 mb-14">
            <Link
              href="/vyzvy"
              className={`px-4 py-2 rounded-xl text-sm font-extrabold border transition-all ${
                !category ? 'bg-gold/15 border-gold text-gold-bright' : 'bg-white/5 border-white/10 text-blue-50 hover:border-gold/40 hover:text-gold-bright'
              }`}
            >
              Všetky
            </Link>
            {usedCategories.map((c) => (
              <Link
                key={c.value}
                href={`/vyzvy?kategoria=${c.value}`}
                className={`px-4 py-2 rounded-xl text-sm font-extrabold border transition-all ${
                  category === c.value ? 'bg-gold/15 border-gold text-gold-bright' : 'bg-white/5 border-white/10 text-blue-50 hover:border-gold/40 hover:text-gold-bright'
                }`}
              >
                {c.label}
              </Link>
            ))}
          </nav>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-24 bg-white/5 border border-white/10 rounded-3xl">
            <HandHeart size={40} className="mx-auto text-gold/50 mb-4" />
            <p className="text-zinc-300">
              {category ? `V kategórii ${categoryLabel(category)} zatiaľ nie je žiadna výzva.` : 'Zatiaľ nie je zverejnená žiadna výzva.'}
            </p>
          </div>
        )}

        {open.length > 0 && (
          <section className="mb-20">
            <SectionHeading title="Otvorené výzvy" subtitle="Práve teraz môžete prispieť" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {open.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
        )}

        {closed.length > 0 && (
          <section className="mb-20">
            <SectionHeading title="Po termíne" subtitle="Zbierka skončila, projekt sa realizuje" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {closed.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <SectionHeading title="Podarilo sa" subtitle="Ukončené výzvy a čo z nich vzniklo" icon={<CheckCircle2 size={16} className="text-emerald-300" />} />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completed.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function SectionHeading({ title, subtitle, icon }: { title: string; subtitle: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 text-gold-bright uppercase tracking-widest text-xs font-extrabold mb-2">
        <span className="w-8 h-[2px] bg-gold rounded-full" />
        {icon}
        <span>{subtitle}</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-light tracking-tight">{title}</h2>
    </div>
  )
}
