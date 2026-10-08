import Link from 'next/link'
import { Archive, FolderOpen, Lock, Search, Settings } from 'lucide-react'
import type { ZoneAccess } from '@/lib/clergy-zone/access'
import type { ZoneCategory } from '@/lib/clergy-zone/types'
import ZoneLogout from './ZoneLogout'

export type ZoneNavCategory = ZoneCategory & { current: number; archived: number }

/** Rámec kňazskej zóny: privítanie, vyhľadávanie, kategórie v bočnom menu. */
export default function ZoneShell({
  access,
  categories,
  activeSlug,
  query = '',
  children,
}: {
  access: ZoneAccess
  categories: ZoneNavCategory[]
  activeSlug?: string | null
  query?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative -mt-24 lg:-mt-32 bg-paper-warm min-h-screen text-ink pb-24">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-32 sm:pt-40">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-mute mb-4">
            <p>
              Vitajte, <b className="text-ink">{access.name}</b>
            </p>
            <div className="flex items-center gap-4">
              {access.canManage && (
                <Link href="/admin/knazska-zona" className="inline-flex items-center gap-1.5 font-bold text-blue hover:underline">
                  <Settings size={14} /> Spravovať dokumenty
                </Link>
              )}
              <ZoneLogout />
            </div>
          </div>
          <Link href="/knazska-zona" className="inline-block">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue mb-2 inline-flex items-center gap-1.5">
              <Lock size={12} /> Žilinská diecéza · neverejné
            </p>
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight">Kňazská zóna</h1>
          </Link>
          <form action="/knazska-zona/hladat" className="mt-6 relative max-w-3xl">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-mute" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Hľadať v obežníkoch, smerniciach a dokumentoch…"
              className="w-full pl-14 pr-32 py-4 rounded-2xl bg-white border border-blue/15 shadow-sm text-base focus:outline-none focus:ring-4 focus:ring-blue/10 focus:border-blue/40"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl bg-blue text-white font-extrabold text-sm hover:bg-blue/90 cursor-pointer">
              Hľadať
            </button>
          </form>
        </header>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8 items-start">
          <nav className="lg:sticky lg:top-28 rounded-2xl bg-white border border-blue/10 p-2 order-2 lg:order-1">
            <p className="px-3 pt-2 pb-1 text-[11px] font-black uppercase tracking-widest text-mute">Kategórie</p>
            <ul>
              {categories.map((c) => {
                const active = c.slug === activeSlug
                return (
                  <li key={c.id}>
                    <Link
                      href={`/knazska-zona/kategoria/${c.slug}`}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm ${active ? 'bg-blue text-white font-extrabold' : 'text-ink/85 hover:bg-blue-soft/30 font-bold'}`}
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <FolderOpen size={15} className={active ? 'text-white/80' : 'text-gold-ink'} />
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className={`text-xs ${active ? 'text-white/80' : 'text-mute'}`}>{c.current || ''}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            {categories.some((c) => c.archived > 0) && (
              <p className="px-3 py-2 text-xs text-mute inline-flex items-center gap-1.5">
                <Archive size={12} /> Archív nájdete v každej kategórii.
              </p>
            )}
          </nav>
          <div className="order-1 lg:order-2 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function NoZoneAccess() {
  return (
    <div className="relative -mt-24 lg:-mt-32 bg-paper-warm min-h-screen text-ink">
      <div className="max-w-xl mx-auto px-4 pt-40 pb-24 text-center">
        <Lock className="mx-auto text-gold-ink mb-4" size={36} />
        <h1 className="text-3xl font-light mb-3">Kňazská zóna</h1>
        <p className="text-mute leading-relaxed">
          Kňazská zóna je určená kňazom a diakonom Žilinskej diecézy. Váš účet do nej zatiaľ nemá prístup. Ak ste kňaz alebo diakon, požiadajte biskupský úrad o
          pozvánku na <a href="mailto:mojkrok@dcza.sk" className="text-blue font-bold hover:underline">mojkrok@dcza.sk</a>.
        </p>
      </div>
    </div>
  )
}
