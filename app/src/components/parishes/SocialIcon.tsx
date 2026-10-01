import { siFacebook, siGooglephotos, siInstagram, siSpotify, siThreads, siTiktok, siWhatsapp, siX, siYoutube } from 'simple-icons'
import { Link2 } from 'lucide-react'
import type { SocialKind } from '@/lib/parishes/social'

const ICONS: Partial<Record<SocialKind, { path: string; hex: string }>> = {
  facebook: siFacebook,
  instagram: siInstagram,
  youtube: siYoutube,
  tiktok: siTiktok,
  google_photos: siGooglephotos,
  whatsapp: siWhatsapp,
  x: siX,
  threads: siThreads,
  spotify: siSpotify,
}

/** Logo siete (simple-icons, CC0); `colored` = farba značky, inak currentColor. */
export default function SocialIcon({ kind, size = 18, colored = false }: { kind: SocialKind; size?: number; colored?: boolean }) {
  const icon = ICONS[kind]
  if (!icon) return <Link2 size={size} />
  return (
    <svg role="img" aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill={colored ? `#${icon.hex}` : 'currentColor'}>
      <path d={icon.path} />
    </svg>
  )
}
