import { MAX_VIDEOS, parseVideoUrl, videoWatchUrl, type ParishVideo } from './video'

/**
 * Overí odkazy na videá a doplní názov a náhľad cez oEmbed (YouTube / Vimeo). Serverový modul.
 * Ak oEmbed zlyhá (súkromné video, výpadok), video sa uloží aj tak – YouTube náhľad poznáme z ID.
 */
export async function resolveVideos(urls: string[] | null | undefined): Promise<{ success: true; videos: ParishVideo[] } | { success: false; error: string }> {
  const list = (urls ?? []).map((u) => u.trim()).filter(Boolean)
  if (list.length > MAX_VIDEOS) return { success: false, error: `Najviac ${MAX_VIDEOS} videí.` }
  const out: ParishVideo[] = []
  for (const url of list) {
    const parsed = parseVideoUrl(url)
    if (!parsed) return { success: false, error: `Odkaz „${url.slice(0, 80)}“ nie je video z YouTube ani Vimeo.` }
    if (out.some((v) => v.provider === parsed.provider && v.id === parsed.id)) continue
    const watch = videoWatchUrl(parsed)
    const endpoint =
      parsed.provider === 'youtube'
        ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`
        : `https://vimeo.com/api/oembed.json?width=1280&url=${encodeURIComponent(watch)}`
    let title: string | null = null
    let thumbnail: string | null = null
    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data = (await res.json()) as { title?: string; thumbnail_url?: string }
        title = data.title?.slice(0, 200) ?? null
        // YouTube oEmbed vracia náhľad 4:3 s čiernymi pruhmi – ten berieme len pri Vimeo
        if (parsed.provider === 'vimeo' && data.thumbnail_url?.startsWith('https://')) thumbnail = data.thumbnail_url
      }
    } catch {
      /* bez názvu a náhľadu */
    }
    if (parsed.provider === 'youtube') thumbnail = await youtubeThumbnail(parsed.id)
    out.push({ ...parsed, url: watch, title, thumbnail })
  }
  return { success: true, videos: out }
}

/** Náhľad YouTube 16:9 bez pruhov: maxresdefault (1280×720) ak existuje, inak mqdefault (320×180). */
async function youtubeThumbnail(id: string): Promise<string> {
  const max = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`
  try {
    const res = await fetch(max, { method: 'HEAD', signal: AbortSignal.timeout(4000) })
    if (res.ok) return max
  } catch {
    /* záložný náhľad */
  }
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
}
