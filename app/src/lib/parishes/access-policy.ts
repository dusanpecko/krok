/**
 * Kto môže dostať prístup do zóny farnosti (rozhodnutie 2026-10-10): len diecézne adresy @dcza.sk
 * (Google Workspace – prihlásenie cez Google, bez hesla). Výnimky len vymenované (testovací účet).
 * Čisté funkcie – používa ich server aj formulár v admine.
 */
export const ACCESS_EMAIL_DOMAIN = 'dcza.sk'
export const ACCESS_EMAIL_EXCEPTIONS = ['dusan@pecko.me']

/** Diecézna adresa v Google Workspace – prihlasuje sa cez Google. */
export const isWorkspaceEmail = (email: string) => email.trim().toLowerCase().endsWith(`@${ACCESS_EMAIL_DOMAIN}`)

/** Chybová hláška, ak adresa nesmie dostať prístup do zóny farnosti; inak null. */
export function accessEmailError(email: string): string | null {
  const e = email.trim().toLowerCase()
  if (isWorkspaceEmail(e) || ACCESS_EMAIL_EXCEPTIONS.includes(e)) return null
  return `Prístup do zóny farnosti môže dostať len diecézna adresa @${ACCESS_EMAIL_DOMAIN} (prihlásenie cez Google).`
}
