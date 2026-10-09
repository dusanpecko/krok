import Link from 'next/link'
import { ExternalLink, Images, Play } from 'lucide-react'
import type { PublicAlbumSummary } from '@/lib/parishes/gallery'
import { photoCount, videoCount } from '@/lib/parishes/format'
import { longDate } from '@/lib/diocese/format'

/** Dlaždica albumu galérie diecézy; externý album otvorí odkaz. */
export default function AlbumTile({ album }: { album: PublicAlbumSummary }) {
  const external = album.photo_count === 0 && album.video_count === 0 && album.external_url
  const body = (
    <>
      <div className="relative aspect-[4/3] bg-blue-soft/40 overflow-hidden">
        {album.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.cover_url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <Images size={36} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-blue/30" />
        )}
        <span className="absolute right-3 bottom-3 px-2.5 py-1 rounded-full bg-ink/60 text-white text-xs font-extrabold inline-flex items-center gap-1.5">
          {external ? (
            <>
              <ExternalLink size={12} /> Externý album
            </>
          ) : (
            <>
              {album.photo_count > 0 && (
                <>
                  <Images size={12} /> {photoCount(album.photo_count)}
                </>
              )}
              {album.video_count > 0 && (
                <>
                  <Play size={11} fill="currentColor" /> {videoCount(album.video_count)}
                </>
              )}
            </>
          )}
        </span>
      </div>
      <div className="p-4">
        <p className="font-extrabold leading-snug group-hover:text-blue">{album.title}</p>
        {album.event_date && <p className="text-sm text-mute mt-0.5">{longDate(album.event_date)}</p>}
      </div>
    </>
  )
  const cls = 'group block rounded-3xl bg-white border border-blue/10 overflow-hidden hover:shadow-lg hover:border-blue/20 transition-all'
  return external ? (
    <a href={album.external_url!} target="_blank" rel="noopener noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <Link href={`/galeria/${album.slug}`} className={cls}>
      {body}
    </Link>
  )
}
