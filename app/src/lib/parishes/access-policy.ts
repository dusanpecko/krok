/**
 * Kto môže dostať prístup do správy farskej stránky a kňazskej zóny (rozhodnutie 2026-10-10): diecézne adresy @dcza.sk
 * (Google Workspace – prihlásenie cez Google, bez hesla). Výnimky (biskupi, rehoľníci, testovací účet) sú v databáze
 * (075, lib/parishes/access-exceptions) a prihlasujú sa e-mailom a heslom. Čisté funkcie.
 */
export const ACCESS_EMAIL_DOMAIN = 'dcza.sk'

/** Diecézna adresa v Google Workspace – prihlasuje sa cez Google. */
export const isWorkspaceEmail = (email: string) => email.trim().toLowerCase().endsWith(`@${ACCESS_EMAIL_DOMAIN}`)

/** Chybová hláška, ak adresa nesmie dostať prístup; inak null. `exceptions` = povolené adresy mimo @dcza.sk. */
export function accessEmailError(email: string, zone = 'správy farskej stránky', exceptions: ReadonlySet<string> = new Set()): string | null {
  const e = email.trim().toLowerCase()
  if (isWorkspaceEmail(e) || exceptions.has(e)) return null
  return `Prístup do ${zone} môže dostať len diecézna adresa @${ACCESS_EMAIL_DOMAIN} (prihlásenie cez Google). Inú adresu treba najprv pridať medzi výnimky (Kňazská zóna → Výnimky).`
}
