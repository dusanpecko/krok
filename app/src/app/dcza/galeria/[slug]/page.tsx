import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { dioceseDb } from '@/lib/diocese/public'
import { getDioceseAlbum } from '@/lib/diocese/gallery'
import { longDate } from '@/lib/diocese/format'
import { photoCount, videoCount } from '@/lib/parishes/format'
import PhotoGallery from '@/components/parish-themes/standard/PhotoGallery'
import VideoList from '@/components/parish-themes/standard/VideoList'
import ShareButton from '@/components/parishes/ShareButton'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ foto?: string }>
}

const photoIndex = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) - 1 : null)

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const album = await getDioceseAlbum(dioceseDb(), (await params).slug)
  if (!album) return { title: 'Album nenájdený' }
  const shared = album.photos[photoIndex((await searchParams).foto) ?? -1]
  const image = shared?.url ?? album.cover_url
  return { title: album.title, description: album.description ?? undefined, openGraph: { title: album.title, ...(image ? { images: [{ url: image }] } : {}) } }
}

export default async function DczaAlbum({ params, searchParams }: Props) {
  const { slug } = await params
  const album = await getDioceseAlbum(dioceseDb(), slug)
  if (!album) notFound()
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/galeria" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline mb-6">
        <ArrowLeft size={14} /> Galéria
      </Link>
      <h1 className="text-3xl sm:text-5xl font-light tracking-tight">{album.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-mute">
        <span>{[album.event_date ? longDate(album.event_date) : null, album.photo_count ? photoCount(album.photo_count) : null, album.video_count ? videoCount(album.video_count) : null].filter(Boolean).join(' · ')}</span>
        <ShareButton path={`/galeria/${album.slug}`} title={album.title} label="Zdieľať album" className="text-blue" />
      </div>
      {album.description && <p className="mt-5 max-w-3xl text-ink/85 leading-relaxed whitespace-pre-line">{album.description}</p>}
      {album.videos.length > 0 && (
        <div className="mt-8">
          <VideoList videos={album.videos} />
        </div>
      )}
      <div className="mt-8">
        <PhotoGallery photos={album.photos} title={album.title} sharePath={`/galeria/${album.slug}`} initialIndex={photoIndex((await searchParams).foto)} />
      </div>
    </div>
  )
}
