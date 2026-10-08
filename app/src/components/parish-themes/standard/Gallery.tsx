import Link from 'next/link'
import type { ParishGalleryProps } from '../types'
import Shell from './Shell'
import AlbumCard from './AlbumCard'

export default function Gallery({ parish, albums, page, hasMore }: ParishGalleryProps) {
  const base = `/farnosti/${parish.slug}`
  return (
    <Shell parish={parish} active="gallery" compact>
      <h2 className="text-3xl font-light mb-8">Zo života farnosti</h2>
      {albums.length === 0 ? (
        <p className="text-mute py-16 text-center">Zatiaľ tu nie sú žiadne albumy.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((a) => (
            <AlbumCard key={a.id} album={a} base={base} />
          ))}
        </div>
      )}
      {(page > 1 || hasMore) && (
        <div className="flex justify-between mt-10 text-sm font-extrabold">
          {page > 1 ? <Link href={`${base}/galeria?strana=${page - 1}`} className="text-gold-ink hover:underline">← Novšie</Link> : <span />}
          {hasMore && <Link href={`${base}/galeria?strana=${page + 1}`} className="text-gold-ink hover:underline">Staršie →</Link>}
        </div>
      )}
    </Shell>
  )
}
