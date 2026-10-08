import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ParishAlbumProps } from '../types'
import { photoCount, videoCount } from '@/lib/parishes/format'
import Shell from './Shell'
import PhotoGallery from './PhotoGallery'
import VideoList from './VideoList'
import ShareButton from '@/components/parishes/ShareButton'

export default function AlbumDetail({ parish, album, initialPhoto }: ParishAlbumProps) {
  const base = `/farnosti/${parish.slug}`
  const date = album.event_date ? new Date(`${album.event_date}T12:00:00`).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  return (
    <Shell parish={parish} active="gallery" compact>
      <Link href={`${base}/galeria`} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline mb-6">
        <ArrowLeft size={14} /> Všetky albumy
      </Link>
      <h2 className="text-3xl sm:text-4xl font-light tracking-tight">{album.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="text-sm text-mute">{[date, album.photo_count ? photoCount(album.photo_count) : null, album.video_count ? videoCount(album.video_count) : null].filter(Boolean).join(' · ')}</p>
        {!parish.preview && <ShareButton path={`${base}/galeria/${album.slug}`} title={album.title} label="Zdieľať album" className="text-blue" />}
      </div>
      {album.description && <p className="mt-4 max-w-3xl text-ink/85 leading-relaxed whitespace-pre-line">{album.description}</p>}
      {album.videos.length > 0 && (
        <div className="mt-8">
          <VideoList videos={album.videos} />
        </div>
      )}
      <div className="mt-8">
        <PhotoGallery photos={album.photos} title={album.title} sharePath={`${base}/galeria/${album.slug}`} initialIndex={initialPhoto} />
      </div>
    </Shell>
  )
}
