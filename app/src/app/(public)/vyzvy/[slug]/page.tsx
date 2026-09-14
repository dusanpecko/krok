import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  ArrowLeft, Users, Coins, CalendarClock, MapPin, Building2, UserCheck, FileText, Download,
  CheckCircle2, Circle, Newspaper, ArrowRight, Share2, Mail, Landmark, PlayCircle,
} from 'lucide-react'
import { getPublicProjectBySlug } from '@/lib/projects/public'
import { daysLeft, isProjectOpen, toEmbedUrl } from '@/lib/projects/mappers'
import { BUDGET_STATUSES, MEDIA_PHASES, categoryLabel, formatDate, formatEur, type MediaPhase } from '@/lib/projects/types'
import { getSessionUser } from '@/lib/auth'
import { getMyOnlineSubscriptions } from '@/app/(public)/platby/actions'
import { KROK_IBAN } from '@/lib/bank/pay-by-square'
import { getBaseUrl } from '@/lib/mollie/client'
import ProjectDonationWidget from '@/components/public/ProjectDonationWidget'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const project = await getPublicProjectBySlug(slug)
  if (!project) return { title: 'Výzva nenájdená | KROK' }
  const description = project.subtitle ?? `Podporte výzvu ${project.name} pastoračného fondu KROK.`
  return {
    title: `${project.name} | Výzvy na podporu | KROK`,
    description,
    openGraph: {
      title: project.name,
      description,
      type: 'website',
      ...(project.image_url ? { images: [{ url: project.image_url }] } : {}),
    },
  }
}

const serviceClient = () =>
  createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export default async function VyzvaDetailPage({ params }: PageProps) {
  const { slug } = await params
  const project = await getPublicProjectBySlug(slug)
  if (!project) notFound()

  // Prihlásený darca: predvyplnenie a jeho pravidelné dary
  const user = await getSessionUser()
  let defaultEmail = ''
  let defaultName = ''
  let variableSymbol: string | null = null
  if (user) {
    defaultEmail = user.email ?? ''
    const { data: donor } = await serviceClient()
      .from('donors')
      .select('first_name, last_name, email, variable_symbol')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (donor) {
      defaultName = `${donor.first_name ?? ''} ${donor.last_name ?? ''}`.trim()
      defaultEmail = donor.email || defaultEmail
      variableSymbol = donor.variable_symbol ?? null
    }
  }
  const subscriptions = user ? await getMyOnlineSubscriptions() : []

  const open = isProjectOpen(project)
  const completed = project.status === 'completed'
  const pct = Math.min(100, project.stats.percent ?? 0)
  const left = daysLeft(project.end_date)
  const embed = toEmbedUrl(project.video_url)

  const images = project.media.filter((m) => m.kind === 'image')
  const videos = project.media.filter((m) => m.kind === 'video')
  const documents = project.media.filter((m) => m.kind === 'document')
  const phases = MEDIA_PHASES.filter((ph) => images.some((m) => m.phase === ph.value))
  const unphased = images.filter((m) => !m.phase)

  const plannedTotal = project.budget.reduce((acc, b) => acc + b.planned_amount, 0)
  const actualTotal = project.budget.reduce((acc, b) => acc + (b.actual_amount ?? 0), 0)
  const hasActual = project.budget.some((b) => b.actual_amount != null)
  const milestonesDone = project.milestones.filter((m) => m.completed_at).length

  const pageUrl = `${getBaseUrl()}/vyzvy/${project.slug}`
  const shareText = `Podporte výzvu ${project.name} – KROK, Pastoračný fond Žilinskej diecézy`

  return (
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep min-h-screen text-white pb-24 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-32 sm:pt-40">
        <Link href="/vyzvy" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-gold-bright transition-colors mb-6">
          <ArrowLeft size={16} /> Všetky výzvy
        </Link>

        {/* Hero */}
        <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-white/5 aspect-video relative">
          {embed ? (
            <iframe
              src={embed}
              title={project.name}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : project.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.image_url} alt={project.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue/40 to-blue-deep" />
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-10 mt-10">
          {/* Ľavý stĺpec */}
          <div className="lg:col-span-7 space-y-12">
            <header>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 text-gold-bright px-2.5 py-1 rounded-lg border border-white/10">
                  {categoryLabel(project.category)}
                </span>
                {completed && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-400/30">
                    <CheckCircle2 size={11} /> Podarilo sa
                  </span>
                )}
                {project.location && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400"><MapPin size={12} /> {project.location}</span>
                )}
              </div>
              <h1 className="text-3xl sm:text-5xl font-light tracking-tight leading-tight">{project.name}</h1>
              {project.subtitle && <p className="text-blue-100/70 text-lg leading-relaxed mt-4 font-light">{project.subtitle}</p>}
            </header>

            {/* Počítadlo */}
            <section className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Vyzbierané</p>
                  <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-bright to-white">
                    {formatEur(project.stats.collected_amount)}
                  </p>
                </div>
                {project.target_amount ? (
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Cieľ</p>
                    <p className="text-xl font-bold text-white">{formatEur(project.target_amount)}</p>
                  </div>
                ) : null}
              </div>
              {project.target_amount ? (
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gold to-gold-bright rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              ) : null}
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat icon={<Users size={16} />} value={String(project.stats.supporters_count)} label="darcov" />
                <Stat icon={<Coins size={16} />} value={project.target_amount ? `${pct.toFixed(0)} %` : '–'} label="splnené" />
                <Stat
                  icon={<CalendarClock size={16} />}
                  value={completed ? 'ukončená' : left === null ? 'priebežne' : left < 0 ? 'po termíne' : left === 0 ? 'dnes' : `${left} dní`}
                  label={completed ? 'stav' : left === null ? 'darovať' : 'do konca'}
                />
              </div>
            </section>

            {/* Záverečná správa */}
            {completed && project.closing_summary && (
              <section className="bg-emerald-500/10 border border-emerald-400/30 rounded-3xl p-6 sm:p-8">
                <SectionKicker>Ako to dopadlo</SectionKicker>
                <div className="theme-dark simple-rich-editor leading-relaxed" dangerouslySetInnerHTML={{ __html: project.closing_summary }} />
              </section>
            )}

            {/* Popis */}
            {project.content && (
              <section>
                <SectionKicker>O výzve</SectionKicker>
                <div className="theme-dark simple-rich-editor leading-relaxed max-w-none" dangerouslySetInnerHTML={{ __html: project.content }} />
              </section>
            )}

            {/* Rozpočet */}
            {project.budget.length > 0 && (
              <section>
                <SectionKicker>Na čo pôjdu peniaze</SectionKicker>
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                  <ul className="divide-y divide-white/5">
                    {project.budget.map((b) => {
                      const share = plannedTotal > 0 ? (b.planned_amount / plannedTotal) * 100 : 0
                      const st = BUDGET_STATUSES.find((s) => s.value === b.status)
                      return (
                        <li key={b.id} className="p-5 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-bold text-white">{b.title}</p>
                              {b.description && <p className="text-xs text-zinc-400 mt-0.5">{b.description}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-extrabold text-white">{formatEur(b.planned_amount)}</p>
                              {b.actual_amount != null && (
                                <p className="text-[11px] text-emerald-300">skutočnosť {formatEur(b.actual_amount)}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-gold/70 rounded-full" style={{ width: `${share}%` }} />
                            </div>
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                b.status === 'done' ? 'bg-emerald-500/20 text-emerald-200' : b.status === 'in_progress' ? 'bg-gold/20 text-gold-bright' : 'bg-white/10 text-zinc-300'
                              }`}
                            >
                              {st?.label}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="p-5 bg-white/5 flex items-center justify-between text-sm">
                    <span className="text-zinc-300 font-bold">Rozpočet spolu</span>
                    <span className="font-extrabold text-white">
                      {formatEur(plannedTotal)}
                      {hasActual && <span className="text-emerald-300 font-bold text-xs ml-2">· skutočnosť {formatEur(actualTotal)}</span>}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Harmonogram */}
            {project.milestones.length > 0 && (
              <section>
                <SectionKicker>Harmonogram · {milestonesDone} / {project.milestones.length} splnené</SectionKicker>
                <ol className="relative border-l border-white/10 ml-3 space-y-6">
                  {project.milestones.map((m) => (
                    <li key={m.id} className="pl-8 relative">
                      <span className={`absolute -left-[11px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${m.completed_at ? 'bg-emerald-500 text-blue-deep' : 'bg-blue-deep border-2 border-white/20 text-transparent'}`}>
                        {m.completed_at ? <CheckCircle2 size={14} /> : <Circle size={10} />}
                      </span>
                      <p className={`font-bold ${m.completed_at ? 'text-white' : 'text-zinc-300'}`}>{m.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {m.completed_at ? `Splnené ${formatDate(m.completed_at)}` : m.due_date ? `Plán ${formatDate(m.due_date)}` : ''}
                      </p>
                      {m.description && <p className="text-sm text-zinc-400 mt-1 font-light">{m.description}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Galéria */}
            {images.length > 0 && (
              <section className="space-y-8">
                <SectionKicker>Fotogaléria</SectionKicker>
                {phases.map((ph) => (
                  <Gallery key={ph.value} title={phaseTitle(ph.value)} items={images.filter((m) => m.phase === ph.value)} />
                ))}
                {unphased.length > 0 && <Gallery title={phases.length ? 'Ďalšie fotografie' : null} items={unphased} />}
              </section>
            )}

            {/* Videá */}
            {videos.length > 0 && (
              <section className="space-y-5">
                <SectionKicker>Videá</SectionKicker>
                <div className="grid sm:grid-cols-2 gap-4">
                  {videos.map((v) => {
                    const src = toEmbedUrl(v.url)
                    return (
                      <div key={v.id} className="space-y-2">
                        <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                          {src ? (
                            <iframe src={src} title={v.title ?? 'Video'} className="w-full h-full" allow="encrypted-media; picture-in-picture" allowFullScreen />
                          ) : (
                            <a href={v.url} target="_blank" rel="noreferrer" className="w-full h-full flex items-center justify-center text-gold-bright gap-2 text-sm font-bold">
                              <PlayCircle size={20} /> Otvoriť video
                            </a>
                          )}
                        </div>
                        {v.title && <p className="text-sm text-zinc-300">{v.title}</p>}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Správy */}
            {project.posts.length > 0 && (
              <section className="space-y-5">
                <SectionKicker>Ako pokračujeme</SectionKicker>
                <div className="space-y-3">
                  {project.posts.map((p) => (
                    <Link key={p.id} href={`/aktuality/${p.slug}`} className="flex gap-4 p-4 bg-white/5 border border-white/10 hover:border-gold/40 rounded-2xl transition-all group">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 shrink-0 flex items-center justify-center">
                        {p.featured_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.featured_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Newspaper size={22} className="text-gold/50" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-zinc-400">{formatDate(p.published_at)}</p>
                        <p className="font-bold text-white group-hover:text-gold-bright transition-colors leading-snug mt-0.5">{p.title}</p>
                        {p.excerpt && <p className="text-sm text-zinc-400 font-light line-clamp-2 mt-1">{p.excerpt}</p>}
                      </div>
                      <ArrowRight size={18} className="text-zinc-500 group-hover:text-gold-bright self-center shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Dokumenty */}
            {documents.length > 0 && (
              <section className="space-y-5">
                <SectionKicker>Dokumenty</SectionKicker>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {documents.map((d) => (
                    <li key={d.id}>
                      <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 hover:border-gold/40 rounded-2xl transition-all group">
                        <span className="w-10 h-10 rounded-xl bg-gold/10 text-gold-bright flex items-center justify-center shrink-0"><FileText size={18} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-white group-hover:text-gold-bright truncate">{d.title || d.url.split('/').pop()}</span>
                          {d.file_size ? <span className="text-[11px] text-zinc-400">{(d.file_size / 1024 / 1024).toFixed(1)} MB</span> : null}
                        </span>
                        <Download size={16} className="text-zinc-500 group-hover:text-gold-bright shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Pravý stĺpec */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28 space-y-6">
              <ProjectDonationWidget
                project={{
                  id: project.id,
                  name: project.name,
                  slug: project.slug,
                  allow_one_time: project.allow_one_time,
                  allow_recurring: project.allow_recurring,
                  suggested_amounts: project.suggested_amounts,
                  specific_symbol: project.specific_symbol,
                }}
                isOpen={open}
                isLoggedIn={!!user}
                defaultEmail={defaultEmail}
                defaultName={defaultName}
                variableSymbol={variableSymbol}
                iban={KROK_IBAN}
                subscriptions={subscriptions}
              />

              {(project.recipient_name || project.guarantor_name || project.parish_name) && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
                  {project.recipient_name && (
                    <InfoRow icon={<Building2 size={16} />} label="Príjemca daru">
                      <span className="text-white font-bold">{project.recipient_name}</span>
                      {project.recipient_address && <span className="block text-xs text-zinc-400">{project.recipient_address}</span>}
                    </InfoRow>
                  )}
                  {project.guarantor_name && (
                    <InfoRow icon={<UserCheck size={16} />} label="Garant projektu">
                      <span className="flex items-center gap-3">
                        {project.guarantor_photo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={project.guarantor_photo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                        )}
                        <span>
                          <span className="text-white font-bold block">{project.guarantor_name}</span>
                          {project.guarantor_role && <span className="text-xs text-zinc-400">{project.guarantor_role}</span>}
                        </span>
                      </span>
                    </InfoRow>
                  )}
                  {project.parish_name && (
                    <InfoRow icon={<Landmark size={16} />} label="Farnosť">
                      <span className="text-white font-bold">{project.parish_name}</span>
                    </InfoRow>
                  )}
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2"><Share2 size={12} /> Zdieľať výzvu</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-gold/40 text-xs font-bold text-zinc-200 hover:text-gold-bright transition-all"
                  >
                    Facebook
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n${pageUrl}`)}`}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-gold/40 text-xs font-bold text-zinc-200 hover:text-gold-bright transition-all inline-flex items-center gap-1.5"
                  >
                    <Mail size={12} /> E-mail
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function phaseTitle(phase: MediaPhase): string {
  return phase === 'before' ? 'Pred realizáciou' : phase === 'during' ? 'Počas realizácie' : 'Po realizácii'
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-gold-bright uppercase tracking-widest text-xs font-extrabold mb-5">
      <span className="w-8 h-[2px] bg-gold rounded-full" />
      <span>{children}</span>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl py-3 px-2">
      <div className="flex items-center justify-center gap-1.5 text-gold-bright mb-1">{icon}</div>
      <p className="text-base sm:text-lg font-extrabold text-white leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mt-1">{label}</p>
    </div>
  )
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-9 h-9 rounded-xl bg-white/5 text-gold-bright flex items-center justify-center shrink-0">{icon}</span>
      <div className="text-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}

function Gallery({ title, items }: { title: string | null; items: { id: string; url: string; thumbnail_url: string | null; title: string | null }[] }) {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-extrabold text-zinc-300 uppercase tracking-wider">{title}</h3>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((m) => (
          <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="group block aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-white/5 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.thumbnail_url || m.url} alt={m.title ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            {m.title && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-blue-deep/90 to-transparent text-[11px] text-white px-3 pt-6 pb-2 truncate">{m.title}</span>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
