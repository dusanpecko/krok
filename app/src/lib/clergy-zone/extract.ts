import { extractText, getDocumentProxy } from 'unpdf'
import JSZip from 'jszip'

/**
 * Text zo súboru na fulltextové vyhľadávanie (PDF, DOCX, ODT, TXT). Starý formát .doc
 * a naskenované PDF (obrázky) text nemajú – nájdu sa len podľa názvu a popisu.
 * Text sa skráti, aby sa zmestil do indexu (tsvector má limit 1 MB).
 */
export const MAX_TEXT_CHARS = 300_000

export async function extractFileText(bytes: Uint8Array, fileName: string, mime: string | null): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  try {
    let text = ''
    if (ext === 'pdf' || mime === 'application/pdf') {
      const pdf = await getDocumentProxy(new Uint8Array(bytes))
      const res = await extractText(pdf, { mergePages: true })
      text = Array.isArray(res.text) ? res.text.join('\n') : res.text
    } else if (ext === 'docx' || ext === 'odt') {
      const zip = await JSZip.loadAsync(bytes)
      const xml = await zip.file(ext === 'docx' ? 'word/document.xml' : 'content.xml')?.async('string')
      if (xml) {
        text = xml
          .replace(/<\/(w:p|text:p|text:h)>/g, '\n')
          .replace(/<w:tab\/>|<text:tab\/>/g, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, '&')
      }
    } else if (ext === 'txt' || mime?.startsWith('text/')) {
      text = new TextDecoder().decode(bytes)
    }
    return text.replace(/[ \t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT_CHARS)
  } catch {
    return ''
  }
}
