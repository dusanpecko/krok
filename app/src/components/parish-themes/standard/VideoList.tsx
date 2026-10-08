'use client'

import { useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'
import { videoEmbedUrl, videoWatchUrl, type ParishVideo } from '@/lib/parishes/video'

/**
 * Videá YouTube / Vimeo (O66). Prehrávač sa načíta až po kliknutí – dovtedy sa nič neposiela
 * na YouTube ani Vimeo (GDPR, rýchlosť stránky). YouTube v režime bez cookies.
 */
export default function VideoList({ videos }: { videos: ParishVideo[] }) {
  if (!videos.length) return null
  return (
    <div className={`grid gap-4 ${videos.length > 1 ? 'md:grid-cols-2' : ''}`}>
      {videos.map((v) => (
        <VideoItem key={`${v.provider}-${v.id}`} video={v} />
      ))}
    </div>
  )
}

function VideoItem({ video }: { video: ParishVideo }) {
  const [playing, setPlaying] = useState(false)
  const name = video.provider === 'youtube' ? 'YouTube' : 'Vimeo'
  return (
    <figure>
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-ink">
        {playing ? (
          <iframe
            src={videoEmbedUrl(video)}
            title={video.title ?? `Video ${name}`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 w-full h-full cursor-pointer" aria-label={`Prehrať video${video.title ? ` ${video.title}` : ''}`}>
            {video.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.thumbnail} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/95 text-ink flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Play size={28} className="ml-1" fill="currentColor" />
            </span>
            {video.title && <span className="absolute left-4 right-4 bottom-3 text-left text-white font-bold text-sm line-clamp-2">{video.title}</span>}
          </button>
        )}
      </div>
      <figcaption className="mt-2 text-xs text-mute flex items-center justify-between gap-3">
        <span>{playing ? '' : `Po kliknutí sa video načíta zo služby ${name}.`}</span>
        <a href={videoWatchUrl(video)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold hover:text-blue shrink-0">
          {name} <ExternalLink size={12} />
        </a>
      </figcaption>
    </figure>
  )
}
