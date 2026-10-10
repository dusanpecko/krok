import { Eye, MapPin } from 'lucide-react'
import type { PublicParish } from '@/lib/parishes/public'
import { hasParishSchedule, officeHoursFor, parishDisplayName } from '@/lib/parishes/format'
import ParishHeader, { type ParishNavItem } from './ParishHeader'
import ParishFooter from './ParishFooter'
import MobileBar from './MobileBar'
import ShareButton from '@/components/parishes/ShareButton'
import DczaHeader from '@/components/dcza/DczaHeader'
import DczaFooter from '@/components/dcza/DczaFooter'
import { getSite, parishSupportHref } from '@/lib/site-server'
import { getPageTree } from '@/lib/diocese/public'
import { mainNav } from '@/lib/diocese/nav'
import { listCuriaLinks } from '@/lib/diocese/schematizmus'

type Section = 'home' | 'announcement' | 'news' | 'gallery'

/**
 * Rámec štandardného motívu: hlavička farnosti (návrh A), obsah, pätička farnosti, mobilná lišta.
 * Na dcza.sk navyše hlavička diecézy nad lištou farnosti a pätička diecézy pod pätičkou farnosti (§ 20, D2).
 */
export default async function Shell({
  parish,
  active,
  children,
  compact = false,
  hideBackdrop = false,
}: {
  parish: PublicParish
  active: Section
  children: React.ReactNode
  compact?: boolean
  /** farnosť má pás fotiek kostola – stmavená titulná fotka v pozadí odpadá (O59) */
  hideBackdrop?: boolean
}) {
  const base = `/farnosti/${parish.slug}`
  const dcza = (await getSite()) === 'dcza'
  const nav = dcza ? mainNav(await getPageTree(), await listCuriaLinks()) : null
  const supportHref = await parishSupportHref(parish.slug)
  const hasOffice = officeHoursFor(parish).items.length > 0
  // základná stránka (nezverejnená): bez oznamov, aktualít a sviatostí, bohoslužby len ak sú vyplnené
  const hasSchedule = !parish.basic || hasParishSchedule(parish)
  const items: ParishNavItem[] = [
    ...(hasSchedule ? [{ label: 'Bohoslužby', href: `${base}#bohosluzby` }] : []),
    ...(hasOffice ? [{ label: 'Úradné hodiny', href: `${base}#uradne-hodiny` }] : []),
    ...(parish.basic
      ? []
      : [
          { label: 'Oznamy', href: `${base}/oznamy`, page: true, active: active === 'announcement' },
          { label: 'Aktuality', href: `${base}/aktuality`, page: true, active: active === 'news' },
          ...(parish.hasAlbums ? [{ label: 'Galéria', href: `${base}/galeria`, page: true, active: active === 'gallery' }] : []),
          { label: 'Sviatosti', href: `${base}#sviatosti` },
        ]),
    { label: 'Kontakt', href: `${base}#kontakt` },
  ]
  const name = parishDisplayName(parish)
  // podnadpis bez opakovania názvu (Belá · Belá): patrocínium, obec ak sa líši, inak dekanát
  const city = parish.city && !name.toLowerCase().includes(parish.city.toLowerCase()) ? parish.city : null
  const subtitle = [parish.patrocinium, city].filter(Boolean).join(' · ') || (parish.deanery_name ? `Dekanát ${parish.deanery_name}` : null)

  return (
    <>
      {nav && <DczaHeader nav={nav} sticky={false} />}
      <ParishHeader
        name={name}
        subtitle={subtitle}
        imageUrl={parish.image_url}
        logoUrl={parish.logo_url}
        homeHref={base}
        items={items}
        supportHref={supportHref}
        manageUrl={parish.manageUrl}
        showMassTimes={hasSchedule}
        krokStrip={!dcza}
      />
      <main className="relative flex-grow bg-paper-warm text-ink pb-16 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />
        {parish.image_url && !compact && !hideBackdrop && (
          <div className="absolute inset-x-0 top-0 h-[460px] pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={parish.image_url} alt="" className="w-full h-full object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-b from-paper-warm/30 via-paper-warm/80 to-paper-warm" />
          </div>
        )}

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
          {parish.preview && (
            <div className="mb-8 flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-400/15 border border-amber-300/40 text-amber-900 text-sm font-bold">
              <Eye size={16} className="shrink-0" /> Náhľad – stránka farnosti zatiaľ nie je zverejnená. Vidíte ju len vy a biskupský úrad.
            </div>
          )}

          {!compact && (
            <header className="mb-10">
              <h1 className="text-4xl sm:text-5xl font-light tracking-tight">{parishDisplayName(parish)}</h1>
              <p className="mt-3 text-mute flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {parish.patrocinium && <span>{parish.patrocinium}</span>}
                {parish.deanery_name && <span>Dekanát {parish.deanery_name}</span>}
                {parish.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} /> {parish.city}
                  </span>
                )}
                {!parish.preview && <ShareButton path={base} title={parishDisplayName(parish)} className="text-blue" />}
              </p>
            </header>
          )}

          {children}
        </div>
      </main>
      <ParishFooter parish={parish} operator={!dcza} />
      {nav && (
        <div className="bg-blue-deep pb-16 lg:pb-0">
          <DczaFooter nav={nav} />
        </div>
      )}
      <MobileBar base={base} phone={parish.phone} massTimes={hasSchedule} posts={!parish.basic} supportHref={supportHref} />
    </>
  )
}

export function SectionHeading({ id, children, icon }: { id?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-32 flex items-center gap-3 text-xl sm:text-2xl font-light tracking-tight mb-6">
      {icon && <span className="text-gold-ink">{icon}</span>}
      {children}
      <span className="flex-1 h-px bg-blue-soft/60 ml-2" />
    </h2>
  )
}

export const cardCls = 'bg-white/[0.04] border border-blue/10 rounded-2xl'
