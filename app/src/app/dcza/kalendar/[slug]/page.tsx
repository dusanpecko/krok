import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, ExternalLink, MapPin } from 'lucide-react'
import { getEvent } from '@/lib/diocese/public'
import { eventWhen } from '@/lib/diocese/format'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await getEvent((await params).slug)
  return { title: e?.title ?? 'Akcia nenájdená' }
}

export default async function DczaEvent({ params }: { params: Promise<{ slug: string }> }) {
  const e = await getEvent((await params).slug)
  if (!e) notFound()
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/kalendar" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline mb-6">
        <ArrowLeft size={14} /> Kalendár akcií
      </Link>
      <h1 className="text-3xl sm:text-5xl font-light tracking-tight leading-tight">{e.title}</h1>
      <div className="mt-5 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-soft/50 text-blue font-bold text-sm">
          <CalendarDays size={16} /> {eventWhen(e)}
        </span>
        {e.place && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-blue/10 font-bold text-sm">
            <MapPin size={16} className="text-gold-ink" /> {e.place}
          </span>
        )}
      </div>
      {e.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.image_url} alt="" className="mt-8 w-full rounded-3xl" />
      )}
      {e.content && <div className="dcza-prose mt-8" dangerouslySetInnerHTML={{ __html: e.content }} />}
      {e.link_url && (
        <a href={e.link_url} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue text-white font-extrabold">
          Viac informácií <ExternalLink size={15} />
        </a>
      )}
    </article>
  )
}
