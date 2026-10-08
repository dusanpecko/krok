import Link from 'next/link'
import { ExternalLink, Images, Play } from 'lucide-react'
import type { PublicAlbumSummary } from '@/lib/parishes/gallery'
import { photoCount, videoCount } from '@/lib/parishes/format'
import { cardCls } from './Shell'

const fmtDate = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }) : null)

/** Dlaždica albumu „Zo života farnosti“; externý album (G6) otvorí odkaz v novom okne. */
export default function AlbumCard({ album, base }: { album: PublicAlbumSummary; base: string }) {
  const external = album.photo_count === 0 && album.video_count === 0 && album.external_url
  const body = (
    <>
      <div className="relative aspect-[4/3] bg-blue-soft/20 overflow-hidden">
        {album.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.cover_url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-blue/40">
            <Images size={40} />
          </div>
        )}
        <span className="absolute right-3 bottom-3 px-2.5 py-1 rounded-full bg-ink/60 text-white text-xs font-extrabold inline-flex items-center gap-1.5">
          {external ? (
            <>
              <ExternalLink size={12} /> Externý album
            </>
          ) : album.photo_count ? (
            <>
              <Images size={12} /> {photoCount(album.photo_count)}
              {album.video_count > 0 && (
                <>
                  {' · '}
                  <Play size={11} fill="currentColor" /> {album.video_count}
                </>
              )}
            </>
          ) : (
            <>
              <Play size={11} fill="currentColor" /> {videoCount(album.video_count)}
            </>
          )}
        </span>
      </div>
      <div className="p-4">
        <p className="font-extrabold group-hover:text-blue">{album.title}</p>
        {fmtDate(album.event_date) && <p className="text-sm text-mute mt-0.5">{fmtDate(album.event_date)}</p>}
      </div>
    </>
  )
  const cls = `${cardCls} overflow-hidden group hover:border-gold/40 transition-colors block`
  return external ? (
    <a href={album.external_url!} target="_blank" rel="noopener noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <Link href={`${base}/galeria/${album.slug}`} className={cls}>
      {body}
    </Link>
  )
}
