/**
 * Umami analytics – vlastné eventy. Skript sa načítava v root layoute
 * (cloud.umami.is), tu je len tenký wrapper, ktorý bez skriptu nič nerobí.
 */

/** ID webu v Umami Cloud – verejný údaj (je v HTML stránky). Prepísateľný cez NEXT_PUBLIC_UMAMI_WEBSITE_ID. */
export const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || 'bd55db02-e225-436f-9095-645bec96ed34'

/** Meria sa len produkcia (Vercel production), nie localhost ani náhľadové nasadenia. */
export const UMAMI_ENABLED = process.env.VERCEL_ENV === 'production' || process.env.NEXT_PUBLIC_UMAMI_FORCE === '1'

type UmamiEventData = Record<string, string | number | boolean>

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: UmamiEventData) => void
    }
  }
}

/** Pošle event do Umami (na klientovi). Ak Umami nie je načítané, ticho preskočí. */
export function trackEvent(name: string, data?: UmamiEventData): void {
  if (typeof window === 'undefined') return
  try {
    window.umami?.track(name, data)
  } catch {
    // analytika nesmie nikdy rozbiť stránku
  }
}
