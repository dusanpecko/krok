import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { dioceseDb, findRedirect, getPage, getPageTree } from '@/lib/diocese/public'
import { locate, pageHref } from '@/lib/diocese/nav'
import { protectEmails } from '@/lib/email-code'
import { AWARDS_PAGE_PATH, getPublicAwards } from '@/lib/diocese/awards'
import AwardsList from '@/components/dcza/AwardsList'
import DczaPageFrame from '@/components/dcza/DczaPageFrame'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ path: string[] }>
}

const joinPath = (parts: string[]) => parts.map((p) => decodeURIComponent(p)).join('/').replace(/^index\.php\//, '')

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage(joinPath((await params).path))
  return page ? { title: page.title, description: page.excerpt ?? undefined } : { title: 'Stránka nenájdená' }
}

/** Obsahové stránky webu diecézy (strom z bety) + presmerovania starých adries živého webu (/sk/…). */
export default async function DczaPage({ params }: Props) {
  const parts = (await params).path
  const path = joinPath(parts)
  // starý schematizmus dcza.sk → schematizmus z registra (profily podľa pôvodného slugu)
  const legacy = `/${path}`
  const schema =
    legacy.match(/^\/sk\/schematizmus\/knazi\/([^/]+)/)?.[1] ? `/schematizmus/knazi/${legacy.split('/')[4]}`
    : /^\/sk\/(schematizmus\/knazi|dokumenty\/knazi)/.test(legacy) || legacy === '/sk/schematizmus' ? '/schematizmus/knazi'
    : /^\/sk\/schematizmus\/dekanaty/.test(legacy) ? '/schematizmus/dekanaty'
    : /^\/sk\/schematizmus\/(farnosti|filialky)|^\/sk\/dokumenty\/dieceza\/dekanaty-a-farnosti/.test(legacy) ? '/farnosti'
    : /^\/sk\/schematizmus\/zomreli/.test(legacy) ? '/schematizmus/zomreli'
    : null
  if (schema) permanentRedirect(schema)
  // rady a komisie – jedna stránka v schematizme s kotvami (051)
  if (path === 'kuria/rady-a-komisie' || path.startsWith('kuria/rady-a-komisie/')) permanentRedirect(pageHref(path))
  if (parts[0] === 'sk' || parts[0] === 'index.php') {
    const to = parts[0] === 'sk' ? await findRedirect(`/${path}`) : `/${path}`
    if (to) permanentRedirect(to)
    // stará adresa bez presného páru – na zoznam aktualít (O73)
    if (parts[0] === 'sk') permanentRedirect('/aktuality')
  }
  const [page, tree, awards] = await Promise.all([getPage(path), getPageTree(), path === AWARDS_PAGE_PATH ? getPublicAwards(dioceseDb()) : null])
  if (!page) {
    // zlúčené alebo presunuté stránky (napr. /o-nas/biskup/zivotopis → /o-nas/biskup)
    const to = await findRedirect(`/${path}`)
    if (to) permanentRedirect(to)
    notFound()
  }
  const { trail } = locate(tree, path)
  const current = trail[trail.length - 1]
  const children = current?.children ?? []

  return (
    <DczaPageFrame tree={tree} path={path}>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight leading-tight">{page.title}</h1>
      {page.content ? (
        <div className="dcza-prose dcza-page mt-8" dangerouslySetInnerHTML={{ __html: protectEmails(page.content) }} />
      ) : (
        children.length === 0 && !awards?.length && <p className="mt-8 text-mute">Obsah pripravujeme.</p>
      )}
      {awards && <AwardsList awards={awards} />}
      {children.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3 mt-10">
          {children.map((c) => (
            <Link key={c.id} href={pageHref(c.path)} className="group rounded-2xl bg-white border border-blue/10 p-5 hover:border-gold/60 transition-colors">
              <p className="font-extrabold group-hover:text-blue">{c.title}</p>
              {c.children.length > 0 && <p className="text-xs text-mute mt-1">{c.children.map((g) => g.title).join(' · ')}</p>}
            </Link>
          ))}
        </div>
      )}
    </DczaPageFrame>
  )
}
