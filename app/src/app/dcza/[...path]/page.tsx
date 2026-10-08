import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { findRedirect, getPage, getPageTree } from '@/lib/diocese/public'
import { locate, pageHref } from '@/lib/diocese/nav'

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
  if (parts[0] === 'sk' || parts[0] === 'index.php') {
    const to = parts[0] === 'sk' ? await findRedirect(`/${path}`) : `/${path}`
    if (to) permanentRedirect(to)
    // stará adresa bez presného páru – na zoznam aktualít (O73)
    if (parts[0] === 'sk') permanentRedirect('/aktuality')
  }
  const [page, tree] = await Promise.all([getPage(path), getPageTree()])
  if (!page) notFound()
  const { trail, section } = locate(tree, path)
  const current = trail[trail.length - 1]
  const children = current?.children ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-mute mb-6">
        <Link href="/" className="hover:text-blue">Domov</Link>
        {trail.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1">
            <ChevronRight size={13} />
            {t.path === path ? <span className="text-ink font-bold">{t.title}</span> : <Link href={pageHref(t.path)} className="hover:text-blue">{t.title}</Link>}
          </span>
        ))}
      </nav>
      <div className={`grid gap-10 ${section && section.children.length ? 'lg:grid-cols-[260px_1fr]' : ''}`}>
        {section && section.children.length > 0 && (
          <aside className="lg:sticky lg:top-32 self-start rounded-2xl bg-white border border-blue/10 p-2 order-2 lg:order-1">
            <Link href={pageHref(section.path)} className="block px-3 pt-2 pb-1 text-[11px] font-black uppercase tracking-widest text-mute hover:text-blue">
              {section.title}
            </Link>
            {section.children.map((c) => (
              <div key={c.id}>
                <Link href={pageHref(c.path)} className={`block px-3 py-2 rounded-xl text-sm font-bold ${trail.some((t) => t.id === c.id) ? 'bg-blue text-white' : 'text-ink/85 hover:bg-blue-soft/40'}`}>
                  {c.title}
                </Link>
                {trail.some((t) => t.id === c.id) &&
                  c.children.map((g) => (
                    <Link key={g.id} href={pageHref(g.path)} className={`block pl-6 pr-3 py-1.5 rounded-lg text-[13px] ${g.path === path ? 'text-blue font-extrabold' : 'text-mute hover:text-blue'}`}>
                      {g.title}
                    </Link>
                  ))}
              </div>
            ))}
          </aside>
        )}
        <article className="order-1 lg:order-2 min-w-0 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight leading-tight">{page.title}</h1>
          {page.content ? (
            <div className="dcza-prose mt-8" dangerouslySetInnerHTML={{ __html: page.content }} />
          ) : (
            children.length === 0 && <p className="mt-8 text-mute">Obsah pripravujeme.</p>
          )}
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
        </article>
      </div>
    </div>
  )
}
