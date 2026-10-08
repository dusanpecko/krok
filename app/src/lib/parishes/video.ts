/**
 * Videá farností – len odkazy na YouTube a Vimeo, bez nahrávania (2026-10-08, O66).
 * Čisté funkcie (bez serverových závislostí) – používa ich aj formulár v zóne farnosti.
 */

export type VideoProvider = 'youtube' | 'vimeo'

export interface ParishVideo {
  provider: VideoProvider
  id: string
  /** súkromný (unlisted) Vimeo odkaz */
  hash?: string | null
  url: string
  title: string | null
  thumbnail: string | null
}

export const MAX_VIDEOS = 10

/** Rozpozná odkaz YouTube (watch, youtu.be, shorts, live, embed) alebo Vimeo (aj súkromný s kódom). */
export function parseVideoUrl(raw: string): Pick<ParishVideo, 'provider' | 'id' | 'hash'> | null {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return null
  }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '')
  const parts = u.pathname.split('/').filter(Boolean)
  const yt = (id: string | null | undefined) => (id && /^[\w-]{11}$/.test(id) ? { provider: 'youtube' as const, id, hash: null } : null)
  if (host === 'youtu.be') return yt(parts[0])
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'watch') return yt(u.searchParams.get('v'))
    if (['shorts', 'live', 'embed', 'v'].includes(parts[0])) return yt(parts[1])
    return null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const i = parts.findIndex((p) => /^\d+$/.test(p))
    if (i < 0) return null
    const next = parts[i + 1]
    const hash = u.searchParams.get('h') ?? (next && /^[0-9a-f]{6,}$/i.test(next) ? next : null)
    return { provider: 'vimeo', id: parts[i], hash }
  }
  return null
}

/** Adresa prehrávača – YouTube v režime bez cookies, spúšťa sa až po kliknutí. */
export function videoEmbedUrl(v: Pick<ParishVideo, 'provider' | 'id' | 'hash'>): string {
  if (v.provider === 'youtube') return `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`
  return `https://player.vimeo.com/video/${v.id}?autoplay=1&dnt=1${v.hash ? `&h=${v.hash}` : ''}`
}

export function videoWatchUrl(v: Pick<ParishVideo, 'provider' | 'id' | 'hash'>): string {
  if (v.provider === 'youtube') return `https://www.youtube.com/watch?v=${v.id}`
  return `https://vimeo.com/${v.id}${v.hash ? `/${v.hash}` : ''}`
}

/** Bezpečné načítanie uloženého poľa videí z DB. */
export function normalizeVideos(value: unknown): ParishVideo[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is ParishVideo => !!v && typeof v === 'object' && (v.provider === 'youtube' || v.provider === 'vimeo') && typeof v.id === 'string')
}
