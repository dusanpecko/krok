/**
 * Umami analytics – vlastné eventy. Skript sa načítava v root layoute
 * (cloud.umami.is), tu je len tenký wrapper, ktorý bez skriptu nič nerobí.
 */

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
