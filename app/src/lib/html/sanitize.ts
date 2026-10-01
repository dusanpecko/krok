import sanitizeHtml from 'sanitize-html'

/**
 * Sanitizácia HTML z editora TipTap pred uložením (obsah od farností je externý vstup – návrh § 11.4).
 * Povolí len to, čo editor vie vytvoriť: text, nadpisy, zoznamy, odkazy, obrázky (KrokImage),
 * tabuľky a YouTube video. Serverový modul.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return ''
  const clean = sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'blockquote', 'hr',
      'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'colgroup', 'col', 'div', 'iframe',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'class'],
      img: ['src', 'alt', 'title', 'class', 'style', 'data-align'],
      p: ['style'], h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'],
      td: ['colspan', 'rowspan', 'colwidth', 'style'], th: ['colspan', 'rowspan', 'colwidth', 'style'],
      col: ['style'], table: ['class', 'style'],
      div: ['class', 'data-youtube-video'],
      iframe: ['src', 'width', 'height', 'allowfullscreen', 'allow', 'frameborder', 'class'],
    },
    allowedStyles: {
      '*': {
        'text-align': [/^(left|right|center|justify)$/],
        width: [/^\d+(\.\d+)?(px|%)$/],
        'min-width': [/^\d+(\.\d+)?px$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['https', 'http'] },
    allowedIframeHostnames: ['www.youtube-nocookie.com', 'www.youtube.com', 'youtube.com'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer nofollow' } : {}) },
      }),
    },
  })
  return clean.trim() === '<p></p>' ? '' : clean
}

/** Čistý text z HTML (perex, meta description). */
export function htmlToText(html: string | null | undefined, max = 200): string {
  if (!html) return ''
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim()
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}
