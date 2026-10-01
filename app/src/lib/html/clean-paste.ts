/**
 * Čistenie HTML vloženého zo schránky – najmä z Wordu (návrh farností O30).
 * Word pridáva podmienené komentáre, `mso-*` štýly, triedy `Mso…`, `<o:p>`, `<font>`
 * a prázdne spany; zoznamy posiela ako odseky s „·“ alebo „1.“ v `<!--[if !supportLists]-->`.
 * Zachová sa len štruktúra (odseky, nadpisy, tučné/kurzíva, zoznamy, odkazy, tabuľky)
 * a zarovnanie textu. Funguje v prehliadači (DOMParser) – volá sa z TipTap `transformPastedHTML`.
 */

const KEEP_TAGS = new Set([
  'P', 'BR', 'H1', 'H2', 'H3', 'H4', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SUB', 'SUP',
  'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'IMG', 'HR',
])
const DROP_WITH_CONTENT = new Set(['STYLE', 'SCRIPT', 'META', 'LINK', 'TITLE', 'XML', 'HEAD', 'OBJECT', 'IFRAME'])
const KEEP_ATTRS: Record<string, string[]> = { A: ['href'], IMG: ['src', 'alt'], TD: ['colspan', 'rowspan'], TH: ['colspan', 'rowspan'] }

export function isWordHtml(html: string): boolean {
  return /class="?Mso|urn:schemas-microsoft-com|<o:p>|mso-/i.test(html)
}

/** Odstráni podmienené komentáre Wordu (`<!--[if …]>…<![endif]-->`) a ostatné komentáre. */
function stripComments(html: string): string {
  return html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
}

/** Odseky Wordu so zoznamovou triedou → <ul>/<ol><li>. */
function rebuildWordLists(doc: Document) {
  const paras = Array.from(doc.body.querySelectorAll('p'))
  let list: HTMLElement | null = null
  for (const p of paras) {
    const cls = p.getAttribute('class') ?? ''
    const style = p.getAttribute('style') ?? ''
    const isItem = /MsoListParagraph/i.test(cls) || /mso-list:/i.test(style)
    if (!isItem) {
      list = null
      continue
    }
    const text = p.textContent ?? ''
    const ordered = /^\s*(\d+|[a-z])[.)]\s/i.test(text)
    // odstránenie odrážky / čísla na začiatku
    const first = p.firstChild
    if (first && first.nodeType === 3) first.textContent = (first.textContent ?? '').replace(/^\s*([·•▪o§-]|\d+[.)]|[a-z][.)])\s+/i, '')
    const prev = p.previousElementSibling
    if (!list || prev !== list) {
      list = doc.createElement(ordered ? 'ol' : 'ul')
      p.before(list)
    }
    const li = doc.createElement('li')
    while (p.firstChild) li.appendChild(p.firstChild)
    list.appendChild(li)
    p.remove()
  }
}

function cleanNode(node: Element) {
  for (const child of Array.from(node.children)) {
    const tag = child.tagName.toUpperCase()
    if (DROP_WITH_CONTENT.has(tag) || (tag.includes(':') && tag !== 'O:P')) {
      child.remove()
      continue
    }
    cleanNode(child)
    if (tag === 'O:P') {
      child.replaceWith(...Array.from(child.childNodes))
      continue
    }
    if (!KEEP_TAGS.has(tag)) {
      // span, font, div… – nechá sa obsah; div sa zmení na odsek, aby nezlepil riadky
      if (tag === 'DIV' && child.textContent?.trim()) {
        const p = node.ownerDocument.createElement('p')
        while (child.firstChild) p.appendChild(child.firstChild)
        child.replaceWith(p)
      } else {
        child.replaceWith(...Array.from(child.childNodes))
      }
      continue
    }
    const align = (child as HTMLElement).style?.textAlign
    const keep = KEEP_ATTRS[tag] ?? []
    for (const attr of Array.from(child.attributes)) {
      if (!keep.includes(attr.name.toLowerCase())) child.removeAttribute(attr.name)
    }
    if (align && ['center', 'right', 'justify'].includes(align) && /^(P|H[1-4])$/.test(tag)) {
      child.setAttribute('style', `text-align: ${align}`)
    }
    if (tag === 'IMG' && /^file:|^data:/i.test(child.getAttribute('src') ?? '')) child.remove()
  }
}

export function cleanPastedHtml(html: string): string {
  if (typeof window === 'undefined' || !html) return html
  const doc = new DOMParser().parseFromString(stripComments(html), 'text/html')
  rebuildWordLists(doc)
  cleanNode(doc.body)
  // prázdne odseky (Word ich vkladá ako medzery) – nechá sa najviac jeden za sebou
  for (const p of Array.from(doc.body.querySelectorAll('p'))) {
    const empty = !(p.textContent ?? '').replace(/ /g, ' ').trim() && !p.querySelector('img,br')
    if (empty) {
      const prev = p.previousElementSibling
      if (!prev || (prev.tagName === 'P' && !(prev.textContent ?? '').trim())) p.remove()
      else p.innerHTML = ''
    }
  }
  return doc.body.innerHTML.replace(/ /g, ' ')
}
