import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ParishAlbumProps } from '../types'
import { photoCount } from '@/lib/parishes/format'
import Shell from './Shell'
import PhotoGallery from './PhotoGallery'

export default function AlbumDetail({ parish, album }: ParishAlbumProps) {
  const base = `/farnosti/${parish.slug}`
  const date = album.event_date ? new Date(`${album.event_date}T12:00:00`).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  return (
    <Shell parish={parish} active="gallery" compact>
      <Link href={`${base}/galeria`} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline mb-6">
        <ArrowLeft size={14} /> Všetky albumy
      </Link>
      <h2 className="text-3xl sm:text-4xl font-light tracking-tight">{album.title}</h2>
      <p className="text-sm text-mute mt-2">{[date, photoCount(album.photo_count)].filter(Boolean).join(' · ')}</p>
      {album.description && <p className="mt-4 max-w-3xl text-ink/85 leading-relaxed whitespace-pre-line">{album.description}</p>}
      <div className="mt-8">
        <PhotoGallery photos={album.photos} title={album.title} />
      </div>
    </Shell>
  )
}
