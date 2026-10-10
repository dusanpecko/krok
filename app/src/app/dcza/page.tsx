import Link from 'next/link'
import { ArrowRight, BookOpen, Church, ExternalLink, HandHeart, Lock, Search, ShieldAlert } from 'lucide-react'
import { dioceseDb, getMagazine, getPastEvents, getPosts, getUpcomingEvents, type DiocesePostSummary } from '@/lib/diocese/public'
import DczaHero from '@/components/dcza/DczaHero'
import { getTkkbsNews } from '@/lib/diocese/tkkbs'
import { getDioceseAlbums } from '@/lib/diocese/gallery'
import AlbumTile from '@/components/dcza/AlbumTile'
import { longDate } from '@/lib/diocese/format'
import PostCard from '@/components/dcza/PostCard'
import EventItem from '@/components/dcza/EventItem'
import LectioTodaySection from '@/components/public/LectioTodaySection'

export const dynamic = 'force-dynamic'

/** Úvod webu diecézy dcza.sk (§ 20, D2). */
export default async function DczaHome() {
  const db = dioceseDb()
  const [posts, upcoming, past, magazine, { count: parishes }, { count: deaneries }, { count: priests }] = await Promise.all([
    getPosts({ limit: 30 }),
    getUpcomingEvents(4),
    getPastEvents(4),
    getMagazine(4),
    db.from('parishes').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_demo', false).eq('kind', 'parish'),
    db.from('deaneries').select('id', { count: 'exact', head: true }),
    db.from('clergy').select('id', { count: 'exact', head: true }).in('category', ['priest', 'bishop']).eq('status', 'active'),
  ])
  const inCat = (p: (typeof posts)[number], slug: string) => p.categories.some((c) => c.slug === slug)
  const [invites, parishLife, tkkbs] = await Promise.all([getPosts({ limit: 4, category: 'pozvanky' }), getPosts({ limit: 4, category: 'zo-zivota-farnosti' }), getTkkbsNews()])
  const albums = await getDioceseAlbums(db, 4)
  const others = posts.filter((p) => !inCat(p, 'pozvanky') && !inCat(p, 'zo-zivota-farnosti')).slice(0, 4)

  return (
    <>
      <DczaHero parishes={parishes ?? 0} deaneries={deaneries ?? 0} priests={priests ?? 0} />

      {/* Aktuality v pásoch podľa sekcií (pripomienky Julie) */}
      <section id="aktuality" className="bg-white border-t border-blue/10 scroll-mt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-16">
          <NewsStrip title="Pozvánky" href="/aktuality?kategoria=pozvanky" posts={invites} />
          <NewsStrip title="Zo života farností" href="/aktuality?kategoria=zo-zivota-farnosti" posts={parishLife} />
          <NewsStrip title="Ďalšie aktuality" subtitle="Z diecézy, KROK – Pastoračný fond Žilinskej diecézy, homílie a zamyslenia" href="/aktuality" posts={others} />
        </div>
      </section>

      {/* Galéria (O75) */}
      {albums.length > 0 && (
        <section className="bg-white border-t border-blue/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <h2 className="text-3xl font-light tracking-tight">Galéria</h2>
              <Link href="/galeria" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline">
                Všetky albumy <ArrowRight size={15} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {albums.map((a) => (
                <AlbumTile key={a.id} album={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Farnosti + rýchle odkazy */}
      <section className="bg-paper-warm border-y border-blue/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
          <div>
            <h2 className="text-3xl font-light tracking-tight flex items-center gap-3">
              <Church className="text-gold-ink" size={28} /> Nájdite svoju farnosť
            </h2>
            <p className="text-mute mt-3 leading-relaxed">Sväté omše, spovedanie, farské oznamy a kontakty vo farnostiach Žilinskej diecézy – stačí zadať obec.</p>
            <form action="/farnosti" className="mt-6 relative max-w-xl">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
              <input name="q" placeholder="Obec alebo farnosť…" className="w-full pl-11 pr-28 py-3.5 rounded-2xl bg-white border border-blue/15 focus:outline-none focus:ring-4 focus:ring-blue/10" />
              <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2.5 rounded-xl bg-blue text-white text-sm font-extrabold hover:bg-blue/90 cursor-pointer">
                Hľadať
              </button>
            </form>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { href: '/o-nas/biskup', label: 'Biskup', text: 'Mons. Tomáš Galis', icon: BookOpen },
              { href: '/kuria/urady/nahlasovanie-zneuzivania', label: 'Nahlásenie zneužívania', text: 'Úrad pre ochranu maloletých', icon: ShieldAlert },
              { href: '/knazska-zona', label: 'Kňazská zóna', text: 'Dokumenty pre kňazov', icon: Lock },
              { href: 'https://mojkrok.sk', label: 'KROK', text: 'Pastoračný fond Žilinskej diecézy', icon: HandHeart },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="group rounded-2xl border border-blue/10 bg-white p-6 shadow-sm hover:shadow-md hover:border-gold/60 transition-all">
                <l.icon size={22} className="text-gold-ink mb-3" />
                <p className="font-extrabold group-hover:text-blue">{l.label}</p>
                <p className="text-sm text-mute mt-0.5">{l.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Lectio Divina na dnes – živé dáta z verejného API lectio.one */}
      <LectioTodaySection variant="dcza" />

      {/* Kalendár */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <h2 className="text-3xl font-light tracking-tight">Kalendár udalostí</h2>
          <Link href="/kalendar" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline">
            Celý kalendár <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-mute mb-3">Pripravujeme</p>
            {upcoming.length ? (
              <div className="space-y-3">
                {upcoming.map((e) => (
                  <EventItem key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-white border border-blue/10 p-6 text-mute">Momentálne nie sú zverejnené žiadne pripravované udalosti.</p>
            )}
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-mute mb-3">Už sme zažili</p>
            <div className="space-y-3">
              {past.map((e) => (
                <EventItem key={e.id} event={e} past />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Z Cirkvi na Slovensku – TK KBS (O76) */}
      {tkkbs.length > 0 && (
        <section className="bg-white border-t border-blue/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Správy TK KBS</p>
                <h2 className="text-3xl font-light tracking-tight">Z Cirkvi na Slovensku</h2>
              </div>
              <a href="https://www.tkkbs.sk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline">
                Všetky na tkkbs.sk <ExternalLink size={14} />
              </a>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {tkkbs.slice(0, 8).map((n) => (
                <a key={n.link} href={n.link} target="_blank" rel="noopener noreferrer" className="group rounded-2xl bg-white border border-blue/10 p-5 hover:border-gold/60 hover:shadow-md transition-all flex flex-col">
                  {n.date && <p className="text-xs text-mute mb-1.5">{longDate(n.date)}</p>}
                  <p className="font-extrabold leading-snug group-hover:text-blue">{n.title}</p>
                  {n.excerpt && <p className="text-sm text-mute mt-2 line-clamp-3">{n.excerpt}</p>}
                  <p className="mt-auto pt-3 text-xs font-bold text-blue inline-flex items-center gap-1">
                    tkkbs.sk <ExternalLink size={11} />
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Časopis */}
      {magazine.length > 0 && (
        <section className="bg-blue-soft/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Časopis</p>
                <h2 className="text-3xl font-light tracking-tight">Naša Žilinská diecéza</h2>
              </div>
              <Link href="/casopis" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline">
                Všetky čísla <ArrowRight size={15} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {magazine.map((m) => (
                <a key={m.id} href={m.link_url ?? m.pdf_url ?? '#'} target="_blank" rel="noopener noreferrer" className="group">
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-white shadow-sm group-hover:shadow-xl transition-shadow">
                    {m.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.cover_url} alt={m.title} loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <p className="mt-3 text-xs font-bold text-mute">{m.issue_number}</p>
                  <p className="font-extrabold group-hover:text-blue inline-flex items-center gap-1">
                    {m.title.startsWith('Naša Žilinská diecéza') ? 'Kúpiť e-časopis' : m.title} <ExternalLink size={13} className="opacity-50" />
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

function NewsStrip({ title, subtitle, href, posts }: { title: string; subtitle?: string; href: string; posts: DiocesePostSummary[] }) {
  if (!posts.length) return null
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-light tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-mute mt-1">{subtitle}</p>}
        </div>
        <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline">
          Všetky <ArrowRight size={15} />
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </div>
  )
}
