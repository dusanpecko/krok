import { Metadata } from 'next'
import Link from 'next/link'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  FolderHeart,
  HeartHandshake,
  Award,
  Coins,
  CalendarRange,
  Users,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Podporené projekty | KROK – Pastoračný fond Žilinskej diecézy',
  description:
    'Prehľad projektov podporených pastoračným fondom KROK Žilinskej diecézy – rozdelených podľa rokov, vrátane grantovej a negrantovej podpory.',
  openGraph: {
    title: 'Podporené projekty | KROK',
    description:
      'Pozrite si, ktoré projekty a v akej výške podporil pastoračný fond KROK vďaka darcom.',
    type: 'website',
  },
}

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SupportedProject {
  id: string
  year: number
  name: string
  organizer: string | null
  realized_from: string | null
  realized_to: string | null
  description: string | null
  amount: number | null
  support_type: 'grant' | 'non_grant'
  sort_order: number
  image_url: string | null
  link_url: string | null
}

// Formátovanie sumy v slovenskom formáte: 16 400 €
function formatEur(amount: number) {
  return `${new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 0 }).format(amount)} €`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('sk-SK')
}

// Kicker – zlatý nadpis sekcie s líniou (vzor z homepage)
function Kicker({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 text-blue uppercase tracking-widest text-xs font-extrabold mb-4 ${
        center ? 'justify-center' : ''
      }`}
    >
      <span className="w-8 h-[2px] bg-gold rounded-full" />
      <span>{children}</span>
      {center && <span className="w-8 h-[2px] bg-gold rounded-full" />}
    </div>
  )
}

export default async function PodporeneProjektyPage() {
  const { data, error } = await supabaseAdmin
    .from('supported_projects')
    .select('*')
    .eq('visible', true)
    .order('year', { ascending: false })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Chyba pri načítaní podporených projektov:', error)
  }

  const projects = (data || []) as SupportedProject[]

  // Zoskupenie podľa rokov (zostupne)
  const years = [...new Set(projects.map((p) => p.year))]
  const byYear = years.map((year) => {
    const items = projects.filter((p) => p.year === year)
    const grant = items.filter((p) => p.support_type === 'grant')
    const nonGrant = items.filter((p) => p.support_type === 'non_grant')
    const sum = (arr: SupportedProject[]) =>
      arr.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    return {
      year,
      items,
      total: sum(items),
      grantCount: grant.length,
      grantSum: sum(grant),
      nonGrantCount: nonGrant.length,
      nonGrantSum: sum(nonGrant),
    }
  })

  return (
    <div className="relative -mt-24 lg:-mt-32 bg-paper-warm min-h-screen text-ink pb-24 overflow-hidden">
      {/* Dekoratívne svetelné pozadie */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-36 sm:pt-44">
        {/* Hlavička */}
        <header className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue mb-4">
            Vaša podpora v akcii
          </p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-5">
            Podporené projekty
          </h1>
          <p className="text-mute text-base sm:text-lg leading-relaxed">
            Každý dar do fondu KROK sa premieňa na konkrétne dielo v našej
            diecéze. Pozrite si projekty, ktoré sme vďaka vám mohli podporiť.
          </p>
        </header>

        {/* Navigácia po rokoch */}
        {years.length > 1 && (
          <nav className="flex flex-wrap justify-center gap-3 mb-16">
            {years.map((year) => (
              <a
                key={year}
                href={`#rok-${year}`}
                className="px-5 py-2.5 bg-white hover:bg-gold/15 border border-blue/10 hover:border-gold/40 rounded-xl text-sm font-extrabold text-ink/85 hover:text-gold-bright transition-all"
              >
                {year}
              </a>
            ))}
          </nav>
        )}

        {/* Sekcie podľa rokov */}
        {byYear.map(
          ({ year, items, total, grantCount, grantSum, nonGrantCount, nonGrantSum }) => (
            <section key={year} id={`rok-${year}`} className="mb-24 scroll-mt-32">
              {/* Nadpis roka */}
              <div className="flex items-center gap-5 mb-8">
                <span className="text-5xl sm:text-6xl font-extrabold text-gold-ink leading-none">
                  {year}
                </span>
                <div className="flex-1 h-[2px] bg-gradient-to-r from-gold/50 to-transparent rounded-full" />
              </div>

              {/* Súhrn roka */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <div className="bg-gradient-to-br from-gold/15 to-white/[0.04] border border-gold/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2 text-gold-ink">
                    <Coins size={18} />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      Spolu prerozdelené
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-ink">
                    {formatEur(total)}
                  </p>
                </div>
                <div className="bg-white/[0.04] border border-blue/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2 text-gold-ink/80">
                    <FolderHeart size={18} />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      Podporené projekty
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-ink">
                    {items.length}
                  </p>
                </div>
                <div className="bg-white/[0.04] border border-blue/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2 text-gold-ink/80">
                    <Award size={18} />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      Grantová výzva
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-ink">
                    {formatEur(grantSum)}
                  </p>
                  <p className="text-xs text-mute mt-1">
                    {grantCount}{' '}
                    {grantCount === 1
                      ? 'projekt'
                      : grantCount < 5
                        ? 'projekty'
                        : 'projektov'}
                  </p>
                </div>
                <div className="bg-white/[0.04] border border-blue/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2 text-gold-ink/80">
                    <HeartHandshake size={18} />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      Negrantová podpora
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-ink">
                    {formatEur(nonGrantSum)}
                  </p>
                  <p className="text-xs text-mute mt-1">
                    {nonGrantCount}{' '}
                    {nonGrantCount === 1
                      ? 'projekt'
                      : nonGrantCount < 5
                        ? 'projekty'
                        : 'projektov'}
                  </p>
                </div>
              </div>

              {/* Karty projektov */}
              <div className="grid md:grid-cols-2 gap-6">
                {items.map((p) => (
                  <article
                    key={p.id}
                    className="group flex flex-col bg-white/[0.04] hover:bg-white/[0.08] border border-blue/10 hover:border-gold/40 rounded-2xl overflow-hidden transition-all"
                  >
                    {/* Ilustračný obrázok */}
                    {p.image_url && (
                      <div className="overflow-hidden aspect-video border-b border-blue/10">
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="flex flex-col flex-1 p-6 sm:p-7">
                    {/* Typ podpory */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          p.support_type === 'grant'
                            ? 'bg-gold/10 border-gold/30 text-gold-ink'
                            : 'bg-white border-blue/15 text-mute'
                        }`}
                      >
                        {p.support_type === 'grant'
                          ? 'Grantová výzva'
                          : 'Negrantová podpora'}
                      </span>
                      {p.amount != null && (
                        <span className="text-lg font-extrabold text-gold-ink whitespace-nowrap">
                          {formatEur(Number(p.amount))}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-extrabold text-ink leading-snug mb-2 group-hover:text-blue transition-colors">
                      {p.name}
                    </h3>

                    {(p.organizer || p.realized_from || p.realized_to) && (
                      <div className="flex flex-col gap-1.5 mb-4">
                        {p.organizer && (
                          <div className="flex items-center gap-2 text-xs font-bold text-mute">
                            <Users size={14} className="text-gold-ink/60 shrink-0" />
                            <span>{p.organizer}</span>
                          </div>
                        )}
                        {(p.realized_from || p.realized_to) && (
                          <div className="flex items-center gap-2 text-xs font-bold text-mute">
                            <CalendarRange size={14} className="text-gold-ink/60 shrink-0" />
                            <span>
                              {p.realized_from ? formatDate(p.realized_from) : '…'}
                              {' – '}
                              {p.realized_to ? formatDate(p.realized_to) : '…'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {p.description && (
                      <p className="text-sm text-mute leading-relaxed">
                        {p.description}
                      </p>
                    )}

                    {p.link_url && (
                      <div className="mt-auto pt-4">
                        <a
                          href={p.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue/90 hover:text-gold-bright transition-colors"
                        >
                          Stránka projektu
                          <ExternalLink size={13} className="shrink-0" />
                        </a>
                      </div>
                    )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )
        )}

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="py-16 text-center border border-blue/10 rounded-2xl bg-white/[0.04] max-w-xl mx-auto px-6 mb-24">
            <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4 text-gold-ink/70">
              <FolderHeart className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-ink mb-1">
              Zoznam pripravujeme
            </h3>
            <p className="text-sm text-mute max-w-sm mx-auto leading-relaxed">
              Prehľad podporených projektov čoskoro zverejníme.
            </p>
          </div>
        )}

        {/* CTA */}
        <section className="text-center max-w-2xl mx-auto">
          <Kicker center>Pridajte sa</Kicker>
          <h2 className="text-2xl sm:text-3xl font-light leading-tight mb-4">
            Páčia sa vám projekty, ktoré sme podporili?
          </h2>
          <p className="text-mute leading-relaxed mb-8">
            Aj vy môžete pomôcť, aby takýchto projektov pribúdalo. Každý dar –
            malý či veľký – posúva pastoračné dielo našej diecézy vpred.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/#dar"
              className="px-8 py-4 bg-gold hover:bg-gold-bright text-blue-deep rounded-xl text-base font-extrabold shadow-2xl transition-all flex items-center justify-center gap-2 group"
            >
              Chcem podporiť{' '}
              <ArrowRight
                className="group-hover:translate-x-1 transition-transform"
                size={18}
              />
            </Link>
            <Link
              href="/granty"
              className="px-8 py-4 bg-white hover:bg-blue-soft/50 text-ink/85 rounded-xl text-base font-bold transition-all flex items-center justify-center border border-blue/10"
            >
              Grantové výzvy
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
