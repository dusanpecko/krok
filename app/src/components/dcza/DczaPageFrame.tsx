import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { DiocesePageNode } from '@/lib/diocese/public'
import { locate, pageHref } from '@/lib/diocese/nav'

/** Rám obsahovej stránky webu diecézy: omrvinky + bočné menu sekcie (strom stránok). */
export default function DczaPageFrame({ tree, path, children }: { tree: DiocesePageNode[]; path: string; children: React.ReactNode }) {
  const { trail, section } = locate(tree, path)
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
        <article className="order-1 lg:order-2 min-w-0 max-w-3xl">{children}</article>
      </div>
    </div>
  )
}
