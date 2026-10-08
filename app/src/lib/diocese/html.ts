import sanitizeHtml from 'sanitize-html'

/**
 * Sanitizácia obsahu webu diecézy – to, čo vie editor (ako sanitizeRichHtml) + prvky z importu
 * (figure, figcaption, h5, Vimeo). Serverový modul.
 */
export function sanitizeDioceseHtml(html: string | null | undefined): string {
  if (!html) return ''
  const clean = sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'blockquote', 'hr',
      'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'colgroup', 'col', 'div', 'iframe',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'class'],
      img: ['src', 'alt', 'title', 'class', 'style', 'data-align'],
      p: ['style'], h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'], h5: ['style'],
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
    allowedIframeHostnames: ['www.youtube-nocookie.com', 'www.youtube.com', 'youtube.com', 'player.vimeo.com'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}) },
      }),
    },
  })
  return clean.trim() === '<p></p>' ? '' : clean
}
