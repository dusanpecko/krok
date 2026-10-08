import Link from 'next/link'
import type { DiocesePostSummary } from '@/lib/diocese/public'
import { longDate } from '@/lib/diocese/format'

/** Karta článku webu diecézy. */
export default function PostCard({ post, big = false }: { post: DiocesePostSummary; big?: boolean }) {
  return (
    <Link href={post.href} className="group flex flex-col rounded-3xl bg-white border border-blue/10 overflow-hidden hover:shadow-lg hover:border-blue/20 transition-all h-full">
      <div className={`relative bg-blue-soft/40 overflow-hidden ${big ? 'aspect-[16/9] lg:aspect-auto lg:flex-1 lg:min-h-[340px]' : 'aspect-[16/10]'}`}>
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/dcza/erb-240.png" alt="" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-20 opacity-25" />
        )}
      </div>
      <div className={`p-5 flex flex-col gap-2 ${big ? '' : 'flex-1'}`}>
        <p className="text-xs text-mute flex flex-wrap gap-x-2">
          <span>{longDate(post.published_at)}</span>
          {post.categories[0] && <span className="font-black uppercase tracking-wider text-wine">{post.categories[0].name}</span>}
        </p>
        <h3 className={`font-extrabold leading-snug group-hover:text-blue ${big ? 'text-2xl' : 'text-lg'}`}>{post.title}</h3>
        {post.excerpt && <p className={`text-sm text-mute ${big ? 'line-clamp-3' : 'line-clamp-2'}`}>{post.excerpt}</p>}
      </div>
    </Link>
  )
}
