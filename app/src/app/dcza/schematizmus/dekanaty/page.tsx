import type { Metadata } from 'next'
import Link from 'next/link'
import { listPublicDeaneries } from '@/lib/diocese/schematizmus'
import SchemaNav from '@/components/dcza/SchemaNav'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Schematizmus – dekanáty' }

export default async function DeaneriesPage() {
  const deaneries = await listPublicDeaneries()
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Schematizmus</p>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-6">Dekanáty</h1>
      <SchemaNav active="/schematizmus/dekanaty" />
      <div className="grid md:grid-cols-2 gap-5">
        {deaneries.map((d) => (
          <section key={d.id} id={`dekanat-${d.id}`} className="scroll-mt-32 rounded-3xl bg-white border border-blue/10 p-6">
            <h2 className="text-2xl font-light">Dekanát {d.name}</h2>
            <p className="text-sm text-mute mt-1">
              {d.dean ? (
                <>
                  Dekan:{' '}
                  {d.dean.slug ? (
                    <Link href={`/schematizmus/knazi/${d.dean.slug}`} className="font-bold text-blue hover:underline">
                      {d.dean.name}
                    </Link>
                  ) : (
                    d.dean.name
                  )}
                </>
              ) : (
                'Dekan: —'
              )}
              {' · '}
              {d.parishes.length} farností · {d.clergyCount} kňazov a diakonov
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {d.parishes.map((p) => (
                <li key={p.name}>
                  {p.slug ? (
                    <Link href={`/farnosti/${p.slug}`} className="inline-block px-3 py-1.5 rounded-xl bg-paper-warm border border-blue/10 text-sm font-bold hover:border-gold/60">
                      {p.name}
                    </Link>
                  ) : (
                    <span className="inline-block px-3 py-1.5 rounded-xl bg-paper-warm text-sm">{p.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
