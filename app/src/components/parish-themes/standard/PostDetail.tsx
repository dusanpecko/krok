import Link from 'next/link'
import { ArrowLeft, ArrowRight, CalendarDays, FileText, Images } from 'lucide-react'
import type { ParishPostDetailProps } from '../types'
import Shell from './Shell'
import PostCard from './PostCard'
import PhotoGallery from './PhotoGallery'
import VideoList from './VideoList'
import ShareButton from '@/components/parishes/ShareButton'
import { formatDate, formatDateTime, photoCount, validRange } from '@/lib/parishes/format'
import { protectEmails } from '@/lib/email-code'

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
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="text-sm text-mute">
            {isAnn && validRange(post.valid_from, post.valid_to) ? `Platí ${validRange(post.valid_from, post.valid_to)}` : `Publikované ${formatDate(post.published_at)}`}
          </p>
          {!parish.preview && <ShareButton path={`${path}/${post.slug}`} title={post.title} text={post.excerpt ? `${post.title}\n${post.excerpt}` : post.title} className="text-blue" />}
        </div>
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
          <div className="simple-rich-editor leading-relaxed mt-8 pt-6 border-t border-blue/10" dangerouslySetInnerHTML={{ __html: protectEmails(post.content) }} />
        )}
        {post.videos.length > 0 && (
          <div className="mt-8">
            <VideoList videos={post.videos} />
          </div>
        )}
        {post.attachment_url && (
          <a href={post.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gold text-blue-deep font-black text-sm hover:bg-gold-bright">
            <FileText size={16} /> {post.attachment_name || 'Otvoriť prílohu (PDF)'}
          </a>
        )}
      </article>
      {post.album && (
        <section className="mt-12">
          <h3 className="text-xl font-light mb-5 flex items-center gap-2">
            <Images size={20} className="text-gold-ink" /> {post.album.photo_count ? `Fotky – ${photoCount(post.album.photo_count)}` : 'Album'}
          </h3>
          {post.album.videos.length > 0 && (
            <div className="mb-4">
              <VideoList videos={post.album.videos} />
            </div>
          )}
          <PhotoGallery photos={post.album.photos} title={post.album.title} sharePath={`/farnosti/${parish.slug}/galeria/${post.album.slug}`} />
          <Link href={`/farnosti/${parish.slug}/galeria/${post.album.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-blue hover:underline">
            Album „{post.album.title}“ <ArrowRight size={14} />
          </Link>
        </section>
      )}
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
