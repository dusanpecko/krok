/**
 * Fáza K3 – doplní v registri kňazov väzby na farnosti/duchovné správy, ktoré nemajú aktuálneho kňaza
 * (v Exceli je farnosť napísaná inak, alebo kňaz duchovnej správy je vedený pod územnou farnosťou).
 * Zdroj: doterajší zoznam parish_clergy (schematizmus dcza.sk farností), prepojený cez clergy_id.
 *
 *   npx tsx scripts/link-clergy-parishes.ts          → dry-run
 *   npx tsx scripts/link-clergy-parishes.ts --apply  → zápis
 */
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const ORDER_RE = /\s+(SDB|OP|OFMCap|SVD|MS|MSSCC|SJ|OFM|CM)$/i

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const [{ data: parishes }, { data: pcs }, { data: asg }, { data: orders }] = await Promise.all([
    db.from('parishes').select('id, name, deanery_id').eq('is_active', true),
    db.from('parish_clergy').select('id, parish_id, full_name, title_before, title_after, position, clergy_id'),
    db.from('clergy_assignments').select('id, clergy_id, kind, role, parish_id, organization, is_primary').is('date_to', null).is('year_to', null),
    db.from('religious_orders').select('id, code'),
  ])
  const covered = new Set((asg ?? []).filter((a) => a.kind === 'parish' && a.parish_id).map((a) => a.parish_id))
  const missing = (parishes ?? []).filter((p) => !covered.has(p.id))
  const orderId = new Map((orders ?? []).map((o) => [o.code.toUpperCase(), o.id]))
  let converted = 0, added = 0, created = 0

  for (const p of missing) {
    for (const pc of (pcs ?? []).filter((x) => x.parish_id === p.id)) {
      const role = pc.position?.trim() || 'výpomocný duchovný'
      let clergyId = pc.clergy_id as string | null
      if (!clergyId) {
        const m = pc.full_name.match(ORDER_RE)
        const base = pc.full_name.replace(ORDER_RE, '').trim().split(/\s+/)
        const last = base[0], first = base.slice(1).join(' ')
        // rehoľné a krstné meno býva v Exceli v inom poradí („Ivan Leopold“ × „Leopold Ivan“) → zhoda priezviska + aspoň jedného mena
        const { data: same } = await db.from('clergy').select('id, first_name').eq('last_name', last)
        const firstTokens = new Set(first.toLowerCase().split(/\s+/))
        const hit = (same ?? []).find((c) => c.first_name.toLowerCase().split(/\s+/).some((t: string) => firstTokens.has(t)))
        if (hit) {
          console.log(`= spárované s registrom: ${pc.full_name} → ${hit.first_name} ${last}`)
          clergyId = hit.id
          if (APPLY) await db.from('parish_clergy').update({ clergy_id: clergyId }).eq('id', pc.id)
        }
      }
      if (!clergyId) {
        // kňaz zo schematizmu farnosti, ktorý v Exceli kúrie nie je → založiť na kontrolu
        console.log(`+ založiť: ${pc.full_name} (${role}) → ${p.name}`)
        created++
        if (APPLY) {
          const { data: c, error } = await db.from('clergy').insert({
            first_name: first || last, last_name: last, title_before: pc.title_before, title_after: pc.title_after,
            category: 'priest', status: 'active', religious_order_id: m ? orderId.get(m[1].toUpperCase()) ?? null : null,
            source: 'schematizmus-farnosti', note: 'Doplnené zo schematizmu farnosti dcza.sk (nie je v Exceli kúrie) – skontrolovať údaje.',
          }).select('id').single()
          if (error) throw new Error(error.message)
          clergyId = c.id
          await db.from('parish_clergy').update({ clergy_id: clergyId }).eq('id', pc.id)
        } else continue
      }
      const mine = (asg ?? []).filter((a) => a.clergy_id === clergyId)
      const other = mine.find((a) => a.kind === 'other')
      if (other) {
        console.log(`~ napojiť: ${pc.full_name}: „${other.role} @ ${other.organization}“ → ${p.name}`)
        converted++
        if (APPLY) await db.from('clergy_assignments').update({ kind: 'parish', parish_id: p.id, deanery_id: p.deanery_id, organization: null, updated_at: new Date().toISOString() }).eq('id', other.id)
      } else {
        console.log(`+ pridať pôsobenie: ${pc.full_name}: ${role} @ ${p.name}${mine.some((a) => a.kind === 'parish') ? ' (popri pôsobení v územnej farnosti)' : ''}`)
        added++
        if (APPLY) await db.from('clergy_assignments').insert({ clergy_id: clergyId, kind: 'parish', role, parish_id: p.id, deanery_id: p.deanery_id, is_primary: !mine.length, source: 'schematizmus-farnosti' })
      }
    }
  }
  if (APPLY) await db.from('clergy_change_log').insert({ entity: 'import', action: 'link-parishes', changes: { converted, added, created } })
  console.log(`\n${APPLY ? 'Zapísané' : 'Dry-run'}: napojené ${converted}, pridané pôsobenia ${added}, nové osoby ${created}. Farnosti bez kňaza v registri: ${missing.length}`)
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
