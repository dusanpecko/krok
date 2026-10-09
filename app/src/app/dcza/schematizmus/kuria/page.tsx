import type { Metadata } from 'next'
import Link from 'next/link'
import { listCuria, type CuriaBody } from '@/lib/diocese/schematizmus'
import { BODY_KIND_LABEL, isPlainMember, type BodyKind } from '@/lib/diocese/bodies'
import SchemaNav from '@/components/dcza/SchemaNav'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Schematizmus – kúria, rady a komisie',
  description: 'Biskupský úrad Žilina – biskup, generálny vikár, úrady, tribunál, rady, komisie a pastoračné úseky.',
}

const KINDS: BodyKind[] = ['kuria', 'rada', 'usek']
const KIND_ANCHOR: Record<BodyKind, string> = { kuria: 'dieceza-kuria', rada: 'rady-a-komisie', usek: 'pastoracne-useky' }

/** Kúria, rady a komisie – členovia z registra kňazov a členovia mimo registra (admin: Kňazi → Kúria, rady a komisie). */
export default async function CuriaPage() {
  const bodies = await listCuria()
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Schematizmus</p>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-6">Kúria, rady a komisie</h1>
      <SchemaNav active="/schematizmus/kuria" />
      <p className="text-mute mb-8 max-w-3xl">Biskupský úrad Žilina, Jána Kalinčiaka 1, 010 01 Žilina. Kontakty na úrady nájdete v časti Kontakty.</p>

      <nav aria-label="Orgány" className="mb-10 space-y-3">
        {KINDS.map((k) => {
          const list = bodies.filter((b) => b.kind === k && b.people.length > 0)
          if (!list.length) return null
          return (
            <div key={k} className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-sm">
              <a href={`#${KIND_ANCHOR[k]}`} className="font-black uppercase tracking-widest text-[11px] text-wine mr-1">{BODY_KIND_LABEL[k]}</a>
              {list.map((b) => (
                <a key={b.slug} href={`#${b.slug}`} className="text-blue hover:underline">{b.name}</a>
              ))}
            </div>
          )
        })}
      </nav>

      {KINDS.map((k) => {
        const list = bodies.filter((b) => b.kind === k && b.people.length > 0)
        if (!list.length) return null
        return (
          <section key={k} id={KIND_ANCHOR[k]} className="scroll-mt-32 mb-12">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight mb-5">{BODY_KIND_LABEL[k]}</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {list.map((b) => <BodyCard key={b.slug} body={b} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function BodyCard({ body }: { body: CuriaBody }) {
  return (
    <section id={body.slug} className="scroll-mt-32 rounded-3xl bg-white border border-blue/10 p-6">
      <h3 className="text-xl font-light mb-4">{body.name}</h3>
      <ul className="space-y-2.5">
        {body.people.map((p, i) => (
          <li key={`${p.slug ?? p.name}-${i}`}>
            {p.slug ? (
              <Link href={`/schematizmus/knazi/${p.slug}`} className="font-extrabold hover:text-blue">{p.name}</Link>
            ) : (
              <span className="font-extrabold">{p.name}</span>
            )}
            {(!isPlainMember(p.role) || p.note) && (
              <p className="text-sm text-mute">{[isPlainMember(p.role) ? null : p.role, p.note].filter(Boolean).join(' · ')}</p>
            )}
          </li>
        ))}
      </ul>
      {body.description && (
        <details className="mt-5 text-sm text-mute">
          <summary className="cursor-pointer font-bold text-blue">O orgáne</summary>
          <div className="mt-3 space-y-2">
            {body.description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
          </div>
        </details>
      )}
    </section>
  )
}
