import Link from 'next/link'
import ParishBoxWidget from './ParishBoxWidget'
import {
  Bell, CalendarDays, Clock, ExternalLink, FileText, Globe, HandHeart, Mail, MapPin, Newspaper, Phone, Sparkles, Users, ArrowRight, Church, BookOpen, Images,
} from 'lucide-react'
import type { ParishHomeProps } from '../types'
import Shell, { SectionHeading, cardCls } from './Shell'
import ScheduleView from './ScheduleView'
import PostCard from './PostCard'
import PhotoGallery from './PhotoGallery'
import AlbumCard from './AlbumCard'
import SacramentsSection from './SacramentsSection'
import OfficeHours from './OfficeHours'
import SocialIcon from '@/components/parishes/SocialIcon'
import { socialLabel } from '@/lib/parishes/social'
import { parishSupportHref } from '@/lib/site-server'
import { clergyName, dayMonth, formatDateTime, googleMapsUrl, hasParishSchedule, validRange } from '@/lib/parishes/format'
import ProtectedEmail from '@/components/ProtectedEmail'
import { encodeEmail, protectText } from '@/lib/email-code'

export default async function Home({ parish, announcements, news, events, sacraments, churchPhotos, albums, initialPhoto }: ParishHomeProps) {
  const base = `/farnosti/${parish.slug}`
  const supportHref = await parishSupportHref(parish.slug)
  const latest = announcements[0]
  const feast = dayMonth(parish.feast_day)
  const adoration = dayMonth(parish.adoration_date)
  const hasGps = parish.latitude != null && parish.longitude != null
  const address = [parish.street, [parish.postal_code, parish.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const filials = parish.villages.filter((v) => !v.is_seat)
  const hasFeasts = Boolean(feast || parish.feast_day_note || adoration || parish.adoration_note)
  // základná stránka: bohoslužby len ak ich farnosť má vyplnené
  const showSchedule = !parish.basic || hasParishSchedule(parish)

  return (
    <Shell parish={parish} active="home" hideBackdrop={churchPhotos.length > 0}>
      {/* Kostol a farnosť – pás fotiek (§ 17, G1) */}
      {churchPhotos.length > 0 && (
        <div className="mb-12">
          <PhotoGallery photos={churchPhotos} variant="strip" title={parish.name} sharePath={base} initialIndex={initialPhoto} />
        </div>
      )}

      {/* Úvod + najnovší oznam (základná stránka bez vlastného textu ho nemá) */}
      {(parish.intro || !parish.basic || latest) && (
        <div className="grid lg:grid-cols-5 gap-6 mb-16">
          <div className={`${latest ? 'lg:col-span-3' : 'lg:col-span-5'} space-y-4`}>
            {parish.intro ? (
              <p className="text-lg text-ink/85 leading-relaxed whitespace-pre-line" dangerouslySetInnerHTML={{ __html: protectText(parish.intro) }} />
            ) : parish.basic ? null : (
              <p className="text-lg text-ink/85 leading-relaxed">
                Vitajte na stránke {parish.kind === 'chaplaincy' ? 'duchovnej správy' : 'farnosti'}. Nájdete tu rozpis bohoslužieb, farské oznamy a kontakt na farský úrad.
              </p>
            )}
          </div>
          {latest && (
            <Link href={`${base}/oznamy/${latest.slug}`} className={`${cardCls} lg:col-span-2 p-6 hover:border-gold/40 transition-colors group`}>
              <p className="text-xs font-black uppercase tracking-widest text-blue flex items-center gap-2 mb-3">
                <Bell size={14} /> Farské oznamy
              </p>
              <h3 className="text-xl font-light group-hover:text-blue">{latest.title}</h3>
              {validRange(latest.valid_from, latest.valid_to) && <p className="text-sm text-mute mt-1">{validRange(latest.valid_from, latest.valid_to)}</p>}
              {latest.excerpt && <p className="text-sm text-mute mt-3 line-clamp-3">{latest.excerpt}</p>}
              <p className="mt-4 text-sm font-extrabold text-blue inline-flex items-center gap-1">
                Čítať oznamy <ArrowRight size={14} />
              </p>
            </Link>
          )}
        </div>
      )}

      {/* Bohoslužby (základná stránka bez vyplneného rozpisu: len hody a poklona) */}
      {(showSchedule || hasFeasts) && (
        <section className="mb-16">
          {!showSchedule ? (
            <SectionHeading icon={<CalendarDays size={22} />}>Hody a výročná poklona</SectionHeading>
          ) : (
            <>
              <SectionHeading id="bohosluzby" icon={<Clock size={22} />}>Bohoslužby</SectionHeading>
              <ScheduleView schedules={parish.schedules} current={parish.currentSeason} />
            </>
          )}
          {hasFeasts && (
            <div className={`grid sm:grid-cols-2 gap-3 ${showSchedule ? 'mt-6' : ''}`}>
              {(feast || parish.feast_day_note) && (
                <div className={`${cardCls} p-4`}>
                  <p className="text-xs font-black uppercase tracking-widest text-mute mb-1">Hody</p>
                  <p className="font-extrabold">{feast ?? parish.feast_day_note}</p>
                  {feast && parish.feast_day_note && <p className="text-sm text-mute">{parish.feast_day_note}</p>}
                </div>
              )}
              {(adoration || parish.adoration_note) && (
                <div className={`${cardCls} p-4`}>
                  <p className="text-xs font-black uppercase tracking-widest text-mute mb-1">Výročná celodenná poklona</p>
                  <p className="font-extrabold">{adoration ?? parish.adoration_note}</p>
                  {adoration && parish.adoration_note && <p className="text-sm text-mute">{parish.adoration_note}</p>}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <OfficeHours parish={parish} />

      {/* Kontakt */}
      <section className="mb-16">
        <SectionHeading id="kontakt" icon={<MapPin size={22} />}>Farský úrad</SectionHeading>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className={`${cardCls} p-6 space-y-3`}>
            {address && (
              <p className="flex gap-3">
                <MapPin size={18} className="text-gold-ink shrink-0 mt-0.5" />
                <span>{address}</span>
              </p>
            )}
            {parish.phone && (
              <p className="flex gap-3">
                <Phone size={18} className="text-gold-ink shrink-0 mt-0.5" />
                <a href={`tel:${parish.phone.replace(/\s/g, '')}`} className="hover:text-gold-bright">{parish.phone}</a>
              </p>
            )}
            {parish.email && (
              <p className="flex gap-3">
                <Mail size={18} className="text-gold-ink shrink-0 mt-0.5" />
                <ProtectedEmail code={encodeEmail(parish.email)} icon={false} className="hover:text-gold-bright break-all" />
              </p>
            )}
            {parish.website && (
              <p className="flex gap-3">
                <Globe size={18} className="text-gold-ink shrink-0 mt-0.5" />
                <a href={parish.website.startsWith('http') ? parish.website : `https://${parish.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-gold-bright break-all">
                  {parish.website.replace(/^https?:\/\//, '')}
                </a>
              </p>
            )}
            <a href={googleMapsUrl(parish)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline pt-2">
              Navigovať <ExternalLink size={14} />
            </a>
            {filials.length > 0 && (
              <div className="pt-4 border-t border-blue/10">
                <p className="text-xs font-black uppercase tracking-widest text-mute mb-2">Filiálky</p>
                <ul className="text-sm text-ink/85 space-y-1">
                  {filials.map((v) => (
                    <li key={v.name}>
                      {v.name}
                      {v.church_name && <span className="text-mute"> – {v.church_name}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {hasGps ? (
            <iframe
              title={`Mapa – ${parish.name}`}
              className="w-full min-h-[320px] rounded-2xl border border-blue/10"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${parish.longitude! - 0.012},${parish.latitude! - 0.006},${parish.longitude! + 0.012},${parish.latitude! + 0.006}&layer=mapnik&marker=${parish.latitude},${parish.longitude}`}
            />
          ) : (
            <a href={googleMapsUrl(parish)} target="_blank" rel="noopener noreferrer" className={`${cardCls} min-h-[200px] flex flex-col items-center justify-center gap-2 text-mute hover:border-gold/40`}>
              <MapPin size={32} className="text-gold-ink" />
              <span className="font-extrabold">Zobraziť na mape</span>
            </a>
          )}
        </div>
        {parish.social_links.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-widest text-mute mb-3">Sledujte nás</p>
            <div className="flex flex-wrap gap-2">
              {parish.social_links.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-blue/10 text-sm font-extrabold hover:border-gold/40 hover:text-gold-bright transition-colors"
                >
                  <SocialIcon kind={l.kind} size={18} /> {socialLabel(l)}
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Pripravujeme */}
      {events.length > 0 && (
        <section className="mb-16">
          <SectionHeading icon={<CalendarDays size={22} />}>Pripravujeme</SectionHeading>
          <div className="grid sm:grid-cols-2 gap-3">
            {events.map((e) => (
              <Link key={e.id} href={`${base}/aktuality/${e.slug}`} className={`${cardCls} p-4 flex gap-4 items-start hover:border-gold/40`}>
                <CalendarDays className="text-gold-ink shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-extrabold">{e.title}</p>
                  <p className="text-sm text-mute first-letter:uppercase">{formatDateTime(e.event_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Aktuality */}
      {news.length > 0 && (
        <section className="mb-16">
          <SectionHeading icon={<Newspaper size={22} />}>Aktuality</SectionHeading>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {news.slice(0, 6).map((p) => (
              <PostCard key={p.id} post={p} href={`${base}/aktuality/${p.slug}`} />
            ))}
          </div>
          <Link href={`${base}/aktuality`} className="mt-5 inline-flex items-center gap-1 text-sm font-extrabold text-blue hover:underline">
            Všetky aktuality <ArrowRight size={14} />
          </Link>
        </section>
      )}

      {/* Zo života farnosti – 3 najnovšie albumy (§ 17) */}
      {albums.length > 0 && (
        <section className="mb-16">
          <SectionHeading icon={<Images size={22} />}>Zo života farnosti</SectionHeading>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums.map((a) => (
              <AlbumCard key={a.id} album={a} base={base} />
            ))}
          </div>
          <Link href={`${base}/galeria`} className="mt-5 inline-flex items-center gap-1 text-sm font-extrabold text-blue hover:underline">
            Všetky albumy <ArrowRight size={14} />
          </Link>
        </section>
      )}

      {/* Kňazi */}
      {parish.clergy.length > 0 && (
        <section className="mb-16">
          <SectionHeading icon={<Users size={22} />}>Kňazi vo farnosti</SectionHeading>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {parish.clergy.map((c, i) => (
              <div key={i} className={`${c.is_head ? 'bg-gold/[0.07] border border-gold/50 rounded-2xl' : cardCls} p-4 flex gap-4 items-start`}>
                <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center text-gold-ink shrink-0 ${c.is_head ? 'border-2 border-gold' : 'border border-blue/10'}`}>
                  <Church size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold">{clergyName(c)}</p>
                  {c.position && <p className={`text-sm ${c.is_head ? 'text-gold-ink font-bold' : 'text-mute'}`}>{c.position}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sviatosti */}
      {sacraments.length > 0 && (
        <section className="mb-16">
          <SectionHeading id="sviatosti" icon={<BookOpen size={22} />}>Sviatosti – čo treba vybaviť</SectionHeading>
          <SacramentsSection sacraments={sacraments} />
        </section>
      )}

      {/* Podpora: e-zvonček farnosti (ak ho diecéza zapla) + Pastoračný fond (O31) */}
      {parish.box ? (
        <section className="grid lg:grid-cols-2 gap-6 items-stretch">
          <ParishBoxWidget parishId={parish.id} parishName={parish.name} box={parish.box} />
          <div className="rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-6 sm:p-8 text-center flex flex-col items-center justify-center">
            <HandHeart className="text-gold-ink mb-4" size={36} />
            <h2 className="text-2xl font-light mb-3">Podporte pastoráciu v celej diecéze</h2>
            <p className="text-mute max-w-md mb-6">
              Pastoračný fond KROK podporuje kňazov, farnosti a diecézne diela. Pri registrácii bude predvolená {parish.kind === 'chaplaincy' ? 'táto duchovná správa' : 'táto farnosť'}.
            </p>
            <Link href={supportHref} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue text-white font-black hover:bg-blue-deep">
              <Sparkles size={18} /> Chcem podporiť Pastoračný fond
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-8 sm:p-10 text-center">
          <HandHeart className="mx-auto text-gold-ink mb-4" size={36} />
          <h2 className="text-2xl sm:text-3xl font-light mb-3">Podporte pastoráciu v našej diecéze</h2>
          <p className="text-mute max-w-xl mx-auto mb-6">
            Pastoračný fond KROK podporuje kňazov, farnosti a diecézne diela. Pri registrácii bude predvolená {parish.kind === 'chaplaincy' ? 'táto duchovná správa' : 'táto farnosť'}.
          </p>
          <Link href={supportHref} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-blue-deep font-black hover:bg-gold-bright">
            <Sparkles size={18} /> Chcem podporiť Pastoračný fond
          </Link>
        </section>
      )}

      {announcements.length > 1 && (
        <p className="mt-10 text-center text-sm">
          <Link href={`${base}/oznamy`} className="inline-flex items-center gap-1.5 font-extrabold text-gold-ink hover:underline">
            <FileText size={14} /> Archív farských oznamov
          </Link>
        </p>
      )}
    </Shell>
  )
}
