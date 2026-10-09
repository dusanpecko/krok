/**
 * Pripomienky Julie k webu dcza.sk (2026-10-09) – úpravy obsahu a štruktúry stránok.
 *   npx tsx scripts/dcza/fix-julia-1.ts            → dry-run
 *   npx tsx scripts/dcza/fix-julia-1.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const log: string[] = []

type Page = { id: string; parent_id: string | null; path: string; slug: string; title: string; content: string | null; published: boolean; sort_order: number }
async function page(path: string): Promise<Page> {
  const { data } = await db.from('diocese_pages').select('id, parent_id, path, slug, title, content, published, sort_order').eq('path', path).single()
  return data as Page
}
async function update(path: string, patch: Partial<Page>, note: string) {
  log.push(`${path}: ${note}`)
  if (APPLY) {
    const { error } = await db.from('diocese_pages').update({ ...patch, updated_at: new Date().toISOString() }).eq('path', path)
    if (error) throw new Error(`${path}: ${error.message}`)
  }
}
async function redirect(from: string, to: string) {
  log.push(`presmerovanie /${from} → ${to}`)
  if (APPLY) await db.from('diocese_redirects').upsert({ from_path: `/${from}`, to_path: to }, { onConflict: 'from_path' })
}
const strip = (h: string | null) => (h ?? '').replace(/(\n\s*){3,}/g, '\n\n').trim()

/** WordPress blok súboru: <a>názov</a><a>Stiahnuť</a> → jeden odkaz s čitateľným názvom */
function fixFileLinks(html: string): string {
  return html.replace(/<a href="([^"]+)">([^<]+)<\/a><a href="\1">Stiahnuť<\/a>/g, (_, href, name) => `<a href="${href}">${name.replace(/_/g, ' ').trim()}</a>`)
}

async function main() {
  // 1. Biskup – životopis a erb spolu
  const [bis, bisZ, bisE] = await Promise.all([page('o-nas/biskup'), page('o-nas/biskup/zivotopis'), page('o-nas/biskup/erb')])
  await update('o-nas/biskup', { content: `${strip(bisZ.content)}\n<h2>Erb</h2>\n${strip(bisE.content)}` }, 'zlúčený životopis + erb')
  await update('o-nas/biskup/zivotopis', { published: false }, 'skrytá (je na stránke Biskup)')
  await update('o-nas/biskup/erb', { published: false }, 'skrytá (je na stránke Biskup)')
  await redirect('o-nas/biskup/zivotopis', '/o-nas/biskup')
  await redirect('o-nas/biskup/erb', '/o-nas/biskup#erb')
  void bis

  // 2. Diecéza – erb a patróni spolu
  const [dE, dP] = await Promise.all([page('o-nas/dieceza/erb'), page('o-nas/dieceza/patroni')])
  await update('o-nas/dieceza', { content: `<h2>Erb</h2>\n${strip(dE.content)}\n<h2>Patróni</h2>\n${strip(dP.content)}` }, 'zlúčený erb + patróni')
  await update('o-nas/dieceza/erb', { published: false }, 'skrytá (je na stránke Diecéza)')
  await update('o-nas/dieceza/patroni', { published: false }, 'skrytá (je na stránke Diecéza)')
  await redirect('o-nas/dieceza/erb', '/o-nas/dieceza')
  await redirect('o-nas/dieceza/patroni', '/o-nas/dieceza')

  // 3. Projekty: Kúria → Činnosť
  const cin = await page('cinnost')
  await update('kuria/projekty', { parent_id: cin.id, path: 'cinnost/projekty', sort_order: 60 }, 'presun do Činnosť → Projekty')
  await redirect('kuria/projekty', '/cinnost/projekty')

  // 4. Činnosť: Charita (web charity), KROK, Lectio divina – odkazy sú v lib/diocese/nav.ts
  await update('cinnost/krok', { published: true, title: 'KROK – Pastoračný fond', sort_order: 70 }, 'zverejnená (odkaz na mojkrok.sk)')
  log.push('cinnost/lectio-divina: nová stránka (odkaz na lectio.one)')
  if (APPLY) {
    const { data: ex } = await db.from('diocese_pages').select('id').eq('path', 'cinnost/lectio-divina').maybeSingle()
    if (!ex) await db.from('diocese_pages').insert({ parent_id: cin.id, slug: 'lectio-divina', path: 'cinnost/lectio-divina', title: 'Lectio divina', excerpt: 'Evanjelizácia – modlitba so Svätým písmom', content: null, sort_order: 80, published: true, source: 'krok' })
  }

  // 5. Pastorácia: Chorí, Deti, Mládež, Miništranti, Rodiny a snúbenci
  await update('cinnost/pastoracia/chori', { sort_order: 10 }, 'poradie 1')
  await update('cinnost/pastoracia/deti', { sort_order: 20 }, 'poradie 2')
  await update(
    'cinnost/pastoracia/mladez-a-studenti',
    { title: 'Mládež', sort_order: 30, content: '<p>Informácie o pastorácii mládeže nájdete na samostatnej stránke <a href="https://mladez.dcza.sk/" target="_blank">mladez.dcza.sk</a>.</p>' },
    'premenovaná na Mládež (bez miništrantov)'
  )
  await update(
    'cinnost/pastoracia/ministranti',
    { published: true, sort_order: 40, content: '<p>Informácie o pastorácii miništrantov nájdete na samostatnej stránke <a href="https://ministranti.dcza.sk" target="_blank">ministranti.dcza.sk</a>.</p>' },
    'zverejnená samostatne'
  )
  await update('cinnost/pastoracia/rodiny-a-snubenci', { sort_order: 50 }, 'poradie 5')

  // 6. Pútnické miesta – Lednické Rovne odkazovalo na turistický portál
  const pm = await page('o-nas/chramy/putnicke-miesta')
  await update(
    'o-nas/chramy/putnicke-miesta',
    { content: (pm.content ?? '').replace(/<a href="https:\/\/www\.turistika\.cz[^"]*"[^>]*>Lednické Rovne<\/a>/, 'Lednické Rovne') },
    'Lednické Rovne bez zlého odkazu'
  )

  // 7. Rady a komisie – názvy rád ako nadpisy, preklep „rádz“
  const rk = await page('kuria/rady-a-komisie')
  let html = (rk.content ?? '').replace(/<\/?p>\s*(?=<\/?p>|\s*Diecézna ekonomicka)/g, '')
  html = html.replace('rádz', 'rády').replace('Diecézna ekonomicka rada', 'Diecézna ekonomická rada')
  html = html.replace(/(^|>|\n)\s*([A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][^<>\n]{3,80}?)\s*\n?\s*(?=<ul>)/g, (_, pre, t) => `${pre}\n<h3>${t.replace(/:$/, '')}</h3>\n`)
  html = html.replace(/(^|>|\n)\s*(Pastoračné úseky):?\s*\n/g, (_, pre, t) => `${pre}\n<h2>${t}</h2>\n`)
  html = html.replace(/<p>(Pastorácia [^<]+)<\/p>/g, '<h4>$1</h4>').replace('<h3>Pastorácia miništrantov</h3>', '<h4>Pastorácia miništrantov</h4>')
  html = html.replace(/\n\s*(Diecézny biskup určil[^<\n]+)\n/, '\n<p>$1</p>\n')
  html = html.replace(/<\/p>\s*(?=\n*<h3>)/g, '').replace(/^\s*<\/p>\s*$/gm, '')
  html = html.replace(/<p>\s*<\/p>/g, '').replace(/(\n\s*){3,}/g, '\n\n')
  await update('kuria/rady-a-komisie', { content: html }, 'nadpisy rád + preklep')

  // 8. Prílohy na stiahnutie – všetky stránky a články
  const [{ data: pages }, { data: posts }] = await Promise.all([
    db.from('diocese_pages').select('path, content').like('content', '%>Stiahnuť</a>%'),
    db.from('diocese_posts').select('id, slug, content').like('content', '%>Stiahnuť</a>%'),
  ])
  for (const p of pages ?? []) await update(p.path, { content: fixFileLinks(p.content) }, 'prílohy – jeden odkaz')
  for (const p of posts ?? []) {
    log.push(`článok ${p.slug}: prílohy – jeden odkaz`)
    if (APPLY) await db.from('diocese_posts').update({ content: fixFileLinks(p.content) }).eq('id', p.id)
  }

  // 9. Úrady zo živého dcza.sk
  await update(
    'kuria/urady/skolsky',
    { title: 'Diecézny školský úrad', published: true, content: '<p>Diecézny školský úrad Žilinskej diecézy má vlastnú webovú stránku:</p>\n<p><a href="https://www.dsuza.sk" target="_blank">www.dsuza.sk</a></p>' },
    'obsah zo živého webu'
  )
  await update(
    'kuria/urady/katecheticky',
    { title: 'Diecézny katechetický úrad', published: true, content: '<p>Diecézny katechetický úrad Žilinskej diecézy má vlastnú webovú stránku:</p>\n<p><a href="https://www.dkuza.sk" target="_blank">www.dkuza.sk</a></p>' },
    'obsah zo živého webu'
  )
  await update(
    'kuria/urady/nahlasovanie-zneuzivania',
    {
      title: 'Úrad pre nahlásenie zneužívania v Cirkvi',
      published: true,
      content: [
        '<h3>Nahlasovanie prípadov sexuálneho zneužívania</h3>',
        '<p>(v zmysle Motu proprio pápeža Františka „Vos estis lux mundi“, čl. 2, § 1)</p>',
        '<h4>Kontaktné osoby</h4>',
        '<p><strong>Prof. ThDr. ICLic. RNDr. Jana Moricová, PhD.</strong><br />e-mail: <a href="mailto:nahlaseniezneuzivania@dcza.sk">nahlaseniezneuzivania@dcza.sk</a><br />tel.: <a href="tel:+421415002215">041 / 500 22 15</a></p>',
        '<p><strong>CsiDr. ThLic. Martin Kramara</strong><br />e-mail: <a href="mailto:gvikar@dcza.sk">gvikar@dcza.sk</a></p>',
        '<h4>Konzultačné hodiny v kancelárii č. 208</h4>',
        '<ul><li>Streda: 12:00 – 15:00</li><li>Piatok: 9:00 – 12:00</li></ul>',
        '<p><a href="https://nahlaseniezneuzivania.kbs.sk/" target="_blank">Web stránka pre nahlasovanie zneužívania Komisie KBS pre ochranu maloletých v Cirkvi</a></p>',
      ].join('\n'),
    },
    'obsah zo živého webu'
  )

  console.log(log.join('\n'))
  console.log(APPLY ? '\nZapísané.' : '\nDry-run – spustite s --apply.')
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
