import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Kňazi farnosti z registra kňazov (krok_navrh_farnosti.md § 16, fáza K3, O49): aktuálne pôsobenia
 * s druhom „farnosť“. Menovanie robí diecéza v /admin/knazi – stránky farností ukážu zmenu hneď.
 * Verejne len meno s titulmi a funkcia (O47); kontakty a fotky sa nezobrazujú.
 */

export interface ParishClergyEntry {
  clergy_id: string
  /** „Meno Priezvisko“ bez titulov */
  full_name: string
  title_before: string | null
  title_after: string | null
  position: string
  category: string
  /** vedie farnosť / duchovnú správu – na stránke prvý a zvýraznený */
  is_head: boolean
  since: string | null
}

const HEAD_RE = /^(farár|farský administrátor|administrátor|duchovný správca|rektor)/i

function rank(position: string, category: string): number {
  const p = position.toLowerCase()
  if (HEAD_RE.test(p)) return 0
  if (p.includes('vikár') || p.includes('kaplán')) return 1
  if (p.includes('výpomocn')) return 2
  if (category === 'deacon' || category === 'permanent_deacon' || p.includes('diakon')) return 3
  return 4
}

type Row = {
  clergy_id: string
  role: string
  date_from: string | null
  year_from: number | null
  clergy: { first_name: string; last_name: string; title_before: string | null; title_after: string | null; category: string; status: string } | null
}

export async function loadParishClergy(db: SupabaseClient, parishId: string): Promise<ParishClergyEntry[]> {
  const { data } = await db
    .from('clergy_assignments')
    .select('clergy_id, role, date_from, year_from, clergy(first_name, last_name, title_before, title_after, category, status)')
    .eq('parish_id', parishId)
    .eq('kind', 'parish')
    .is('date_to', null)
    .is('year_to', null)

  const seen = new Set<string>()
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.clergy && !['left', 'deceased', 'suspended'].includes(r.clergy.status))
    .filter((r) => (seen.has(r.clergy_id) ? false : (seen.add(r.clergy_id), true)))
    .map((r) => ({
      clergy_id: r.clergy_id,
      full_name: `${r.clergy!.first_name} ${r.clergy!.last_name}`,
      title_before: r.clergy!.title_before,
      title_after: r.clergy!.title_after,
      position: r.role,
      category: r.clergy!.category,
      is_head: HEAD_RE.test(r.role),
      since: r.date_from ?? (r.year_from ? String(r.year_from) : null),
    }))
    .sort((a, b) => rank(a.position, a.category) - rank(b.position, b.category) || a.full_name.localeCompare(b.full_name, 'sk'))
}
