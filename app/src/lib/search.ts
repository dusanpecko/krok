/**
 * Očista vstupov pred vložením do PostgREST `.or()` / `.ilike()` filtrov.
 *
 * V PostgREST reťazci filtra majú znaky ako `,`, `(`, `)`, `"` špeciálny
 * význam (oddeľujú podmienky, uzatvárajú skupiny). Neošetrený používateľský
 * vstup by mohol rozbiť dotaz alebo doňho vložiť ďalšie podmienky. Wildcardy
 * `%`/`*` by zase umožnili vyhľadať „všetko". Preto ich odstraňujeme.
 */

/** Očistí vyhľadávací výraz pre použitie v `col.ilike.%<term>%`. */
export function sanitizeSearchTerm(input: string | null | undefined, maxLen = 100): string {
  return (input ?? '')
    .replace(/[,()"'\\%*]/g, ' ') // PostgREST rezervované znaky + wildcardy → medzera
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

/** Očistí presnú hodnotu (napr. variabilný symbol) pre použitie v `col.eq.<value>`. */
export function sanitizeFilterValue(input: string | null | undefined): string {
  return (input ?? '').replace(/[^0-9A-Za-z_-]/g, '')
}
