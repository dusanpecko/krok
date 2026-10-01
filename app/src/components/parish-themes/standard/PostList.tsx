import Link from 'next/link'
import type { ParishPostListProps } from '../types'
import Shell from './Shell'
import PostCard from './PostCard'

export default function PostList({ parish, type, posts, page, hasMore }: ParishPostListProps) {
  const path = `/farnosti/${parish.slug}/${type === 'announcement' ? 'oznamy' : 'aktuality'}`
  return (
    <Shell parish={parish} active={type} compact>
      <h2 className="text-3xl font-light mb-8">{type === 'announcement' ? 'Farské oznamy' : 'Aktuality'}</h2>
      {posts.length === 0 ? (
        <p className="text-blue-100/60 py-16 text-center">{type === 'announcement' ? 'Zatiaľ tu nie sú žiadne oznamy.' : 'Zatiaľ tu nie sú žiadne aktuality.'}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} href={`${path}/${p.slug}`} />
          ))}
        </div>
      )}
      {(page > 1 || hasMore) && (
        <div className="flex justify-between mt-10 text-sm font-extrabold">
          {page > 1 ? <Link href={`${path}?strana=${page - 1}`} className="text-gold-bright hover:underline">← Novšie</Link> : <span />}
          {hasMore && <Link href={`${path}?strana=${page + 1}`} className="text-gold-bright hover:underline">Staršie →</Link>}
        </div>
      )}
    </Shell>
  )
}
