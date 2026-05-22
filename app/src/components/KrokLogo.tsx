'use client'

import Image from 'next/image'

// Skutočné rozmery logo súborov (302×175 px) — zachovanie správneho aspect ratio
const LOGO_WIDTH = 302
const LOGO_HEIGHT = 175

interface KrokLogoProps {
  /** 'color' = farebné logo (logo_c.webp), 'white' = biele logo (logo_w.webp) */
  variant?: 'color' | 'white'
  /** Výška loga v pixeloch (šírka sa prispôsobí automaticky podľa aspect ratio) */
  height?: number
  className?: string
}

export default function KrokLogo({
  variant = 'color',
  height = 40,
  className = '',
}: KrokLogoProps) {
  const src = variant === 'white' ? '/logo/logo_w.webp' : '/logo/logo_c.webp'
  // Šírka prepočítaná podľa skutočného aspect ratio
  const computedWidth = Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT)

  return (
    <Image
      src={src}
      alt="KROK – Pastoračný fond Žilinskej diecézy"
      width={computedWidth}
      height={height}
      // loading="eager" + priority = LCP optimalizácia (logo je vždy above the fold)
      className={className}
      priority
      loading="eager"
    />
  )
}
