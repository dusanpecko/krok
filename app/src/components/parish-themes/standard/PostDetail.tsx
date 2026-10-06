import Link from 'next/link'
import { ArrowLeft, CalendarDays, Download } from 'lucide-react'
import type { ParishPostDetailProps } from '../types'
import Shell from './Shell'
import PostCard from './PostCard'
import { formatDate, formatDateTime, validRange } from '@/lib/parishes/format'

export default function PostDetail({ parish, post, related }: ParishPostDetailProps) {
  const isAnn = post.type === 'announcement'
  const path = `/farnosti/${parish.slug}/${isAnn ? 'oznamy' : 'aktuality'}`
  return (
    <Shell parish={parish} active={post.type} compact>
      <article className="max-w-3xl">
        <Link href={path} className="inline-flex items-center gap-2 text-xs font-black text-mute hover:text-gold-bright uppercase tracking-widest mb-6">
          <ArrowLeft size={14} /> {isAnn ? 'Všetky oznamy' : 'Všetky aktuality'}
        </Link>
        <h2 className="text-3xl sm:text-4xl font-light leading-tight">{post.title}</h2>
        <p className="text-sm text-mute mt-3">
          {isAnn && validRange(post.valid_from, post.valid_to) ? `Platí ${validRange(post.valid_from, post.valid_to)}` : `Publikované ${formatDate(post.published_at)}`}
        </p>
        {post.event_at && (
          <p className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gold/10 border border-gold/30 text-blue text-sm font-bold first-letter:uppercase">
            <CalendarDays size={16} /> {formatDateTime(post.event_at)}
          </p>
        )}
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt={post.title} className="w-full rounded-2xl border border-blue/10 mt-8 aspect-video object-cover" />
        )}
        {post.content && (
          <div className="simple-rich-editor leading-relaxed mt-8 pt-6 border-t border-blue/10" dangerouslySetInnerHTML={{ __html: post.content }} />
        )}
        {post.attachment_url && (
          <a href={post.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gold text-blue-deep font-black text-sm hover:bg-gold-bright">
            <Download size={16} /> {post.attachment_name || 'Stiahnuť prílohu (PDF)'}
          </a>
        )}
      </article>
      {related.length > 0 && (
        <section className="mt-16">
          <h3 className="text-xl font-light mb-5">{isAnn ? 'Staršie oznamy' : 'Ďalšie aktuality'}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((p) => (
              <PostCard key={p.id} post={p} href={`${path}/${p.slug}`} />
            ))}
          </div>
        </section>
      )}
    </Shell>
  )
}
