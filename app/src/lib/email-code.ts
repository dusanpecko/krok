/**
 * Ochrana e-mailov pred zberačmi adries: do HTML ani do dát stránky (RSC) sa adresa nedostane čitateľne –
 * server pošle obrátený reťazec v base64, prehliadač ho poskladá až po načítaní (ProtectedEmail).
 */
export const encodeEmail = (email: string) => btoa(email.split('').reverse().join(''))

export function decodeEmail(code: string): string | null {
  try {
    const e = atob(code).split('').reverse().join('')
    return /^[^@\s]+@[^@\s]+$/.test(e) ? e : null
  } catch {
    return null
  }
}

// doména s ľubovoľnou koncovkou okrem prípon súborov (napr. obrazok@2x.png)
const EMAIL = '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.(?!(?:png|jpe?g|gif|webp|svg|avif|pdf|docx?|xlsx?|pptx?|js|css|html?)\\b)[A-Za-z]{2,10}\\b'
const PLACEHOLDER = 'e-mail'

/**
 * HTML obsahu (stránky, aktuality): odkazy mailto aj adresy v texte → <a data-ml="kód">; čitateľne
 * ich doplní až EmailDecoder v prehliadači. Adresy v iných atribútoch (src, href) sa nemenia.
 */
export function protectEmails(html: string): string {
  const anchor = new RegExp(`<a\\b([^>]*?)href=(["'])mailto:(${EMAIL})[^"']*\\2([^>]*)>([\\s\\S]*?)</a>`, 'gi')
  let out = html.replace(anchor, (_m, pre: string, _q, email: string, post: string, inner: string) => {
    const text = inner.replace(new RegExp(EMAIL, 'gi'), PLACEHOLDER)
    return `<a${pre}data-ml="${encodeEmail(email)}"${post}>${text}</a>`
  })
  // adresy v texte – len mimo značiek (medzi > a <)
  out = out.replace(/>([^<]+)</g, (_m, text: string) => `>${text.replace(new RegExp(EMAIL, 'gi'), (e) => `<a data-ml="${encodeEmail(e)}">${PLACEHOLDER}</a>`)}<`)
  return out
}

/** Čistý text (perex, meta popis, výsledky hľadania) – adresy sa vynechajú, odkaz je v obsahu stránky. */
export const hideEmails = <T extends string | null | undefined>(text: T): T =>
  (typeof text === 'string' ? text.replace(new RegExp(EMAIL, 'gi'), 'e-mail') : text) as T

/** Čistý text s adresami (napr. úvodný text farnosti) → bezpečné HTML s chránenými adresami. */
export const protectText = (text: string) =>
  protectEmails(`>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}<`).slice(1, -1)
