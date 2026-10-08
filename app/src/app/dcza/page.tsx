import Link from 'next/link'
import { ArrowRight, BookOpen, Church, ExternalLink, HandHeart, Lock, Search, ShieldAlert } from 'lucide-react'
import { dioceseDb, getMagazine, getPastEvents, getPosts, getUpcomingEvents } from '@/lib/diocese/public'
import DczaHero from '@/components/dcza/DczaHero'
import PostCard from '@/components/dcza/PostCard'
import EventItem from '@/components/dcza/EventItem'

export const dynamic = 'force-dynamic'

/** Úvod webu diecézy dcza.sk (§ 20, D2). */
export default async function DczaHome() {
  const db = dioceseDb()
  const [posts, upcoming, past, magazine, { count: parishes }, { count: deaneries }, { count: priests }] = await Promise.all([
    getPosts({ limit: 7 }),
    getUpcomingEvents(4),
    getPastEvents(4),
    getMagazine(3),
    db.from('parishes').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('kind', 'parish'),
    db.from('deaneries').select('id', { count: 'exact', head: true }),
    db.from('clergy').select('id', { count: 'exact', head: true }).in('category', ['priest', 'bishop']).eq('status', 'active'),
  ])
  const [lead, ...rest] = posts

  return (
    <>
      <DczaHero parishes={parishes ?? 0} deaneries={deaneries ?? 0} priests={priests ?? 0} />

      {/* Najnovšie */}
      <section id="aktuality" className="relative overflow-hidden bg-white border-t border-blue/10 scroll-mt-28">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Aktuality</p>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight">Z diecézy</h2>
            </div>
            <Link href="/aktuality" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline">
              Všetky aktuality <ArrowRight size={15} />
            </Link>
          </div>
          {lead && (
            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
              <PostCard post={lead} big />
              <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-5">
                {rest.slice(0, 2).map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          )}
          {rest.length > 2 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
              {rest.slice(2, 6).map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Farnosti + rýchle odkazy */}
      <section className="bg-paper-warm border-y border-blue/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <h2 className="text-3xl font-light tracking-tight flex items-center gap-3">
              <Church className="text-gold-ink" size={28} /> Nájdite svoju farnosť
            </h2>
            <p className="text-mute mt-2">Sväté omše, spovedanie, farské oznamy a kontakty vo farnostiach Žilinskej diecézy – stačí zadať obec.</p>
            <form action="/farnosti" className="mt-5 relative max-w-xl">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
              <input name="q" placeholder="Obec alebo farnosť…" className="w-full pl-11 pr-28 py-3.5 rounded-2xl bg-paper-warm border border-blue/15 focus:outline-none focus:ring-4 focus:ring-blue/10" />
              <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2.5 rounded-xl bg-blue text-white text-sm font-extrabold hover:bg-blue/90 cursor-pointer">
                Hľadať
              </button>
            </form>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { href: '/o-nas/biskup/zivotopis', label: 'Biskup', text: 'Mons. Tomáš Galis', icon: BookOpen },
              { href: '/kuria/urady/nahlasovanie-zneuzivania', label: 'Nahlásenie zneužívania', text: 'Úrad pre ochranu maloletých', icon: ShieldAlert },
              { href: '/knazska-zona', label: 'Kňazská zóna', text: 'Dokumenty pre kňazov', icon: Lock },
              { href: 'https://mojkrok.sk', label: 'KROK', text: 'Pastoračný fond diecézy', icon: HandHeart },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="group rounded-2xl border border-blue/10 bg-paper-warm p-4 hover:border-gold/60 transition-colors">
                <l.icon size={20} className="text-gold-ink mb-2" />
                <p className="font-extrabold group-hover:text-blue">{l.label}</p>
                <p className="text-xs text-mute">{l.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 max-w-4xl">
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
                    {m.title} <ExternalLink size={13} className="opacity-50" />
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
