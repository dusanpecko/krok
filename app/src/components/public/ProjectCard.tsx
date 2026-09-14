import Link from 'next/link'
import { ArrowRight, Users, CalendarClock, CheckCircle2, Megaphone } from 'lucide-react'
import { categoryLabel, formatEur, type ProjectRow, type ProjectStats } from '@/lib/projects/types'
import { daysLeft, isProjectOpen } from '@/lib/projects/mappers'

export interface ProjectCardData extends Pick<
  ProjectRow,
  'id' | 'name' | 'slug' | 'subtitle' | 'category' | 'status' | 'image_url' | 'target_amount' | 'end_date' | 'visible_on_web' | 'location'
> {
  stats: ProjectStats
}

/** Karta výzvy pre zoznam /vyzvy aj domovskú stránku (tmavý podklad). Bez hookov, použiteľná na serveri aj klientovi. */
export default function ProjectCard({ project }: { project: ProjectCardData }) {
  const open = isProjectOpen(project)
  const completed = project.status === 'completed'
  const pct = Math.min(100, project.stats.percent ?? 0)
  const left = daysLeft(project.end_date)

  return (
    <Link
      href={`/vyzvy/${project.slug}`}
      className="group flex flex-col bg-white/5 border border-white/10 hover:border-gold/40 rounded-3xl overflow-hidden shadow-xl hover:shadow-gold/10 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[16/9] bg-blue-deep overflow-hidden">
        {project.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.image_url} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue/40 to-blue-deep">
            <Megaphone size={40} className="text-gold/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-deep/80 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest bg-blue-deep/80 backdrop-blur text-gold-bright px-2.5 py-1 rounded-lg border border-white/10">
          {categoryLabel(project.category)}
        </span>
        {completed && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 backdrop-blur text-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-400/30">
            <CheckCircle2 size={11} /> Podarilo sa
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col p-5 sm:p-6 gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-white leading-snug group-hover:text-gold-bright transition-colors">{project.name}</h3>
          {project.location && <p className="text-[11px] text-zinc-400 mt-1">{project.location}</p>}
          {project.subtitle && <p className="text-sm text-zinc-300 font-light leading-relaxed mt-2 line-clamp-3">{project.subtitle}</p>}
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-end justify-between gap-3">
            <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-bright to-white">
              {formatEur(project.stats.collected_amount)}
            </span>
            {project.target_amount ? (
              <span className="text-xs text-zinc-400">z {formatEur(project.target_amount)}</span>
            ) : null}
          </div>
          {project.target_amount ? (
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-gold to-gold-bright rounded-full" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold">
            <span className="inline-flex items-center gap-1"><Users size={12} /> {project.stats.supporters_count} darcov</span>
            {completed ? (
              <span className="text-emerald-300">ukončená</span>
            ) : left !== null && left >= 0 ? (
              <span className="inline-flex items-center gap-1"><CalendarClock size={12} /> {left === 0 ? 'posledný deň' : `ešte ${left} dní`}</span>
            ) : open ? (
              <span>priebežne</span>
            ) : (
              <span className="text-zinc-500">uzavretá</span>
            )}
          </div>
        </div>

        <span className="inline-flex items-center gap-2 text-sm font-extrabold text-gold-bright group-hover:gap-3 transition-all">
          {open ? 'Podporiť výzvu' : 'Zobraziť výzvu'} <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  )
}
