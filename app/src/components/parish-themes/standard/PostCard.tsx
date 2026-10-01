import Link from 'next/link'
import { CalendarDays, FileText, Pin } from 'lucide-react'
import type { PublicPostSummary } from '@/lib/parishes/public'
import { formatDate, formatDateTime, validRange } from '@/lib/parishes/format'
import { cardCls } from './Shell'

export default function PostCard({ post, href }: { post: PublicPostSummary; href: string }) {
  const meta = post.type === 'announcement' ? validRange(post.valid_from, post.valid_to) ?? formatDate(post.published_at) : formatDate(post.published_at)
  return (
    <Link href={href} className={`${cardCls} overflow-hidden flex flex-col hover:border-gold/40 transition-colors group`}>
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.image_url} alt="" className="w-full aspect-video object-cover" />
      )}
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-xs text-blue-100/50 font-bold flex items-center gap-2 mb-2">
          {post.pinned && <Pin size={12} className="text-gold" />}
          {meta}
          {post.attachment_url && <FileText size={12} className="text-gold" />}
        </p>
        <h3 className="font-extrabold leading-snug group-hover:text-gold-bright">{post.title}</h3>
        {post.event_at && (
          <p className="text-sm text-gold-bright mt-1 flex items-center gap-1.5 first-letter:uppercase">
            <CalendarDays size={14} /> {formatDateTime(post.event_at)}
          </p>
        )}
        {post.excerpt && <p className="text-sm text-blue-100/70 mt-2 line-clamp-3">{post.excerpt}</p>}
      </div>
    </Link>
  )
}
