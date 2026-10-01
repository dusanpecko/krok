/** Sociálne siete farnosti (migrácia 036) – typy, popisy a validácia. Bez serverových závislostí. */

export const SOCIAL_KINDS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://www.facebook.com/farnost…' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/…' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://www.youtube.com/@…' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://www.tiktok.com/@…' },
  { key: 'google_photos', label: 'Fotogaléria (Google Fotky)', placeholder: 'https://photos.app.goo.gl/…' },
  { key: 'whatsapp', label: 'WhatsApp kanál', placeholder: 'https://whatsapp.com/channel/…' },
  { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/…' },
  { key: 'threads', label: 'Threads', placeholder: 'https://www.threads.net/@…' },
  { key: 'spotify', label: 'Spotify / podcast', placeholder: 'https://open.spotify.com/…' },
  { key: 'other', label: 'Iný odkaz', placeholder: 'https://…' },
] as const

export type SocialKind = (typeof SOCIAL_KINDS)[number]['key']

export interface SocialLink {
  kind: SocialKind
  url: string
  /** vlastný popis – povinný pri „Iný odkaz“, inak nepovinný */
  label: string | null
}

export const MAX_SOCIAL_LINKS = 12

export const socialLabel = (l: SocialLink) => l.label || SOCIAL_KINDS.find((k) => k.key === l.kind)?.label || 'Odkaz'

/** Druh podľa adresy – pre predvyplnenie pri vložení odkazu. */
export function guessSocialKind(url: string): SocialKind | null {
  const u = url.toLowerCase()
  if (/facebook\.com|fb\.(me|com)/.test(u)) return 'facebook'
  if (/instagram\.com/.test(u)) return 'instagram'
  if (/youtube\.com|youtu\.be/.test(u)) return 'youtube'
  if (/tiktok\.com/.test(u)) return 'tiktok'
  if (/photos\.(app\.goo\.gl|google\.com)/.test(u)) return 'google_photos'
  if (/whatsapp\.com/.test(u)) return 'whatsapp'
  if (/(^|\/\/|\.)(x|twitter)\.com/.test(u)) return 'x'
  if (/threads\.(net|com)/.test(u)) return 'threads'
  if (/spotify\.com/.test(u)) return 'spotify'
  return null
}

/** Overí a vyčistí zoznam odkazov (server aj klient). */
export function normalizeSocialLinks(input: unknown): { value: SocialLink[]; error?: string } {
  if (!Array.isArray(input)) return { value: [], error: 'Neplatný zoznam odkazov.' }
  const out: SocialLink[] = []
  for (const raw of input) {
    const r = raw as Partial<SocialLink>
    let url = String(r?.url ?? '').trim()
    if (!url) continue
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return { value: out, error: `Neplatná adresa: ${url}` }
    }
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes('.')) return { value: out, error: `Neplatná adresa: ${url}` }
    const known = SOCIAL_KINDS.some((k) => k.key === r.kind) && r.kind !== 'other'
    const kind = (known ? r.kind : guessSocialKind(url) ?? 'other') as SocialKind
    const label = String(r?.label ?? '').trim().slice(0, 40) || null
    if (kind === 'other' && !label) return { value: out, error: 'Pri „Iný odkaz“ vyplňte popis.' }
    out.push({ kind, url: parsed.toString().slice(0, 500), label })
  }
  if (out.length > MAX_SOCIAL_LINKS) return { value: out, error: `Najviac ${MAX_SOCIAL_LINKS} odkazov.` }
  return { value: out }
}
