/**
 * Jednorazové naplnenie kúrie, rád a komisií (051):
 *   1. orgány (upsert podľa slug),
 *   2. súčasné diecézne funkcie z registra → body_id + body_role (podľa názvu funkcie),
 *   3. členovia zo stránky bety „Rady a komisie“ – kňazi z registra ako menovanie, ostatní ako členovia mimo registra.
 *
 *   npx tsx scripts/dcza/seed-bodies.ts          # len výpis
 *   npx tsx scripts/dcza/seed-bodies.ts --apply  # zápis
 */
import { createClient } from '@supabase/supabase-js'
import { assignmentRoleText, type BodyKind } from '../../src/lib/diocese/bodies'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface Seed { slug: string; name: string; gen: string | null; kind: BodyKind; re?: RegExp; web?: string[] }
const BODIES: Seed[] = [
  { slug: 'diecezny-biskup', name: 'Diecézny biskup', gen: null, kind: 'kuria', re: /^diecézny biskup/i },
  { slug: 'generalny-vikar', name: 'Generálny vikár', gen: null, kind: 'kuria', re: /^generálny vikár/i },
  { slug: 'kancelaria', name: 'Kancelária biskupského úradu', gen: null, kind: 'kuria', re: /kancelár|notár|tajomník a ceremoniár/i },
  { slug: 'ekonomicky-urad', name: 'Ekonomický úrad', gen: null, kind: 'kuria', re: /ekonóm/i },
  { slug: 'tribunal', name: 'Tribunál Žilinskej diecézy', gen: null, kind: 'kuria', re: /s[uú]dny vikár|sudca|obhajca|promo?tor/i },
  { slug: 'urady-a-poverenia', name: 'Úrady, sekcie a poverenia', gen: null, kind: 'kuria', re: /riaditeľ (DKÚ|Diecézneho|sekcie|Pastoračného fondu)|hovorca|penitenciár|biskupský delegát|správca Katedrálneho/i },
  { slug: 'kolegium-konzultorov', name: 'Kolégium konzultorov', gen: 'Kolégia konzultorov', kind: 'rada', re: /Kolégia konzultorov/i },
  { slug: 'presbyterska-rada', name: 'Presbyterská rada', gen: 'Presbyterskej rady', kind: 'rada', re: /Presbyterskej rady/i },
  { slug: 'ekonomicka-rada', name: 'Diecézna ekonomická rada', gen: 'Diecéznej ekonomickej rady', kind: 'rada', re: /ekonomickej rady/i, web: ['Diecézna ekonomická rada'] },
  { slug: 'pastoracna-rada', name: 'Diecézna pastoračná rada', gen: 'Diecéznej pastoračnej rady', kind: 'rada', re: /pastoračnej rady/i, web: ['Diecézna pastoračná rada'] },
  { slug: 'liturgicka-komisia', name: 'Liturgická komisia', gen: 'Diecéznej liturgickej komisie', kind: 'rada', re: /liturgickej komisie/i, web: ['Liturgická komisia'] },
  { slug: 'komisia-pre-posvatne-rady', name: 'Komisia pre posvätné rády a ministériá', gen: 'Komisie pre posvätné rády a ministériá', kind: 'rada', re: /posvätné r[áa]dy/i, web: ['Komisia pre posvätné rády a ministériá'] },
  { slug: 'permanentna-formacia', name: 'Permanentná formácia kňazov', gen: 'komisie pre permanentnú formáciu kňazov', kind: 'rada', web: ['Permanentná formácia kňazov'] },
  { slug: 'pastoracia-povolani', name: 'Rada pre pastoráciu povolaní', gen: 'Rady pre pastoráciu povolaní', kind: 'rada', web: ['Rada pre pastoráciu povolaní'] },
  { slug: 'papezske-misijne-diela', name: 'Pápežské misijné diela', gen: 'Pápežských misijných diel', kind: 'rada', re: /misijn/i, web: ['Pápežské misijné diela'] },
  { slug: 'cenzor', name: 'Cenzor Žilinskej diecézy', gen: null, kind: 'rada', re: /cenzor/i, web: ['Cenzor Žilinskej diecézy'] },
  { slug: 'pastoracia-rodin', name: 'Pastorácia rodín a príprava snúbencov', gen: null, kind: 'usek', web: ['Pastorácia rodín a príprava snúbencov'] },
  { slug: 'pastoracia-mladeze', name: 'Pastorácia mládeže', gen: null, kind: 'usek', web: ['Pastorácia mládeže'] },
  { slug: 'pastoracia-deti', name: 'Pastorácia detí (eRko)', gen: null, kind: 'usek', web: ['Pastorácia detí (eRko)'] },
  { slug: 'pastoracia-ministrantov', name: 'Pastorácia miništrantov', gen: null, kind: 'usek', web: ['Pastorácia miništrantov'] },
  { slug: 'koordinatori', name: 'Koordinátori pastoračných oblastí', gen: null, kind: 'usek' },
]

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const text = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const lis = (ul: string) => [...ul.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]))
const TITLE = /^(?:[A-Za-zÁ-ž]+\.|ICLic|ThLic|CSIDr|CsiDr|PSLic)$/
const GENERIC = /^(člen|členka|predseda|podpredseda|tajomník|moderátor|konzultant)\b/i

/** „Mgr. Ing. Peter Dubec, PhD. – predseda“ → časti mena a funkcia. */
function parsePerson(raw: string) {
  if (/^[–-]/.test(raw.trim())) return null
  const [namePart, ...roleParts] = raw.split(/\s+[–-]\s+/)
  let role = roleParts.join(' – ').trim() || 'člen'
  let name = namePart.trim()
  let titleAfter: string | null = null
  const comma = name.match(/^(.*?),\s*(.+)$/)
  if (comma) {
    if (/^(Ph\.?D\.|Th\.?D\.|PhD\.)$/i.test(comma[2])) titleAfter = comma[2]
    else if (role === 'člen') role = comma[2]
    name = comma[1]
  }
  const tokens = name.split(/\s+/).filter(Boolean)
  const before: string[] = []
  while (tokens.length > 2 && TITLE.test(tokens[0])) before.push(tokens.shift()!)
  let affiliation: string | null = null
  if (tokens.length > 2 && /^[A-Z]{2,5}$/.test(tokens[tokens.length - 1])) affiliation = tokens.pop()!
  const prefix = before.filter((t) => t === 'sr.')
  if (prefix.length) affiliation = 'rehoľná sestra'
  const tb = before.filter((t) => t !== 'sr.' && t !== 'vsdp.')
  return { title_before: tb.join(' ') || null, first_name: tokens.slice(0, -1).join(' ') || null, last_name: tokens[tokens.length - 1], title_after: titleAfter, affiliation, role }
}

async function main() {
  const { data: pages } = await db.from('diocese_pages').select('path, content').like('path', 'kuria/rady-a-komisie%')
  const page = (p: string) => pages?.find((x) => x.path === p)?.content ?? ''
  const main = page('kuria/rady-a-komisie')

  // ---- sekcie hlavnej stránky
  const web = new Map<string, string[]>()
  const parts = main.split(/<h[234]>([\s\S]*?)<\/h[234]>/)
  for (let i = 1; i < parts.length; i += 2) {
    const ul = parts[i + 1].match(/<ul>[\s\S]*?<\/ul>/)
    if (ul) web.set(text(parts[i]), lis(ul[0]))
  }
  const coord = main.match(/Diecézny biskup určil[\s\S]*?(<ul>[\s\S]*?<\/ul>)/)
  const kol = page('kuria/rady-a-komisie/kolegium-konzultorov')
  const kolUls = [...kol.matchAll(/<ul>[\s\S]*?<\/ul>/g)].map((m) => m[0])
  const presb = page('kuria/rady-a-komisie/presbyterska-rada')
  const desc = (ul: string | undefined, extra: string[] = []) => [...(ul ? lis(ul) : []), ...extra].join('\n\n') || null

  const descriptions: Record<string, string | null> = {
    'kolegium-konzultorov': desc(kolUls[0], ['Kolégium konzultorov Žilinskej diecézy menoval diecézny biskup dňa 1. 10. 2023 na obdobie piatich rokov.']),
    'presbyterska-rada': desc(presb.match(/<ul>[\s\S]*?<\/ul>/)?.[0]),
    koordinatori: coord ? 'Diecézny biskup určil kňazov zodpovedných za koordináciu špecifických pastoračných oblastí na úrovni diecézy.' : null,
  }
  const webMembers: Record<string, string[]> = { 'kolegium-konzultorov': kolUls[1] ? lis(kolUls[1]) : [], koordinatori: coord ? lis(coord[1]) : [] }
  for (const b of BODIES) for (const h of b.web ?? []) webMembers[b.slug] = web.get(h) ?? []
  // koordinátori: „Meno – oblasť“ → funkcia = oblasť

  // ---- 1. orgány
  const ids = new Map<string, string>()
  for (const [i, b] of BODIES.entries()) {
    const row = { slug: b.slug, name: b.name, name_genitive: b.gen, kind: b.kind, sort_order: (i + 1) * 10, description: descriptions[b.slug] ?? null }
    if (!APPLY) { ids.set(b.slug, b.slug); continue }
    const { data, error } = await db.from('diocese_bodies').upsert(row, { onConflict: 'slug' }).select('id').single()
    if (error) throw error
    ids.set(b.slug, data.id)
  }
  console.log(`orgány: ${BODIES.length}`)

  // ---- 2. register → body_id
  const { data: asg } = await db.from('clergy_assignments').select('id, clergy_id, role, body_id, date_to, year_to').eq('kind', 'diocese').is('body_id', null).is('date_to', null).is('year_to', null)
  const linked: { id: string; clergy_id: string; body: string; body_role: string; current: boolean }[] = []
  const order = [...BODIES.filter((b) => b.kind !== 'kuria'), ...BODIES.filter((b) => b.kind === 'kuria')]
  for (const a of asg ?? []) {
    const role = (a.role ?? '').trim().replace(/^[–-]\s*/, '')
    const b = order.find((s) => s.re?.test(role))
    if (!b) continue
    const g = role.match(GENERIC)
    const bodyRole = b.kind === 'kuria' || !g ? role : g[1].toLowerCase()
    linked.push({ id: a.id, clergy_id: a.clergy_id, body: b.slug, body_role: bodyRole, current: !a.date_to && a.year_to == null })
  }
  console.log(`register → orgán: ${linked.length} menovaní`)
  for (const l of linked) {
    console.log(`  [${l.body}] ${l.body_role}${l.current ? '' : ' (ukončené)'}`)
    if (APPLY) await db.from('clergy_assignments').update({ body_id: ids.get(l.body), body_role: l.body_role }).eq('id', l.id)
  }

  // ---- 3. web bety → členovia
  const { data: clergy } = await db.from('clergy').select('id, first_name, last_name, status')
  const byName = new Map<string, { id: string; status: string }[]>()
  for (const c of clergy ?? []) {
    const k = norm(`${c.first_name} ${c.last_name}`)
    byName.set(k, [...(byName.get(k) ?? []), c])
  }
  for (const b of BODIES) {
    const body = { name: b.name, name_genitive: b.gen, kind: b.kind }
    for (const raw of webMembers[b.slug] ?? []) {
      const p = parsePerson(raw)
      if (!p || !p.last_name || !p.first_name) continue
      const hits = byName.get(norm(`${p.first_name} ${p.last_name}`)) ?? []
      const c = hits.find((h) => h.status === 'active') ?? hits[0]
      if (c) {
        const existing = linked.find((l) => l.clergy_id === c.id && l.body === b.slug && l.current)
        if (existing) {
          if (p.role !== 'člen' && existing.body_role === 'člen') {
            console.log(`  [${b.slug}] ${raw} → funkcia ${p.role}`)
            if (APPLY) await db.from('clergy_assignments').update({ body_role: p.role, role: assignmentRoleText(p.role, body) }).eq('id', existing.id)
          }
          continue
        }
        console.log(`  [${b.slug}] + kňaz ${raw} (${p.role})`)
        linked.push({ id: '', clergy_id: c.id, body: b.slug, body_role: p.role, current: true })
        if (APPLY)
          await db.from('clergy_assignments').insert({
            clergy_id: c.id, kind: 'diocese', role: assignmentRoleText(p.role, body), organization: b.name,
            body_id: ids.get(b.slug), body_role: p.role, is_primary: false, source: 'web',
          })
      } else {
        console.log(`  [${b.slug}] + mimo registra ${raw} → ${JSON.stringify(p)}`)
        if (APPLY)
          await db.from('diocese_body_members').insert({
            body_id: ids.get(b.slug), title_before: p.title_before, first_name: p.first_name, last_name: p.last_name,
            title_after: p.title_after, affiliation: p.affiliation, body_role: p.role,
          })
      }
    }
  }
  console.log(APPLY ? 'Zapísané.' : 'Len výpis – spustite s --apply.')
}

main().catch((e) => { console.error(e); process.exit(1) })
