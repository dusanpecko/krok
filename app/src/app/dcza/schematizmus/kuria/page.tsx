import type { Metadata } from 'next'
import Link from 'next/link'
import { listCuria } from '@/lib/diocese/schematizmus'
import SchemaNav from '@/components/dcza/SchemaNav'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Schematizmus – kúria', description: 'Biskupský úrad Žilina – biskup, generálny vikár, úrady, tribunál, rady a komisie.' }

/** Kúria zo súčasných diecéznych funkcií v registri kňazov. */
export default async function CuriaPage() {
  const sections = await listCuria()
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Schematizmus</p>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-6">Kúria</h1>
      <SchemaNav active="/schematizmus/kuria" />
      <p className="text-mute mb-8 max-w-3xl">Biskupský úrad Žilina, Jána Kalinčiaka 1, 010 01 Žilina. Kontakty na úrady nájdete v časti Kontakty.</p>
      <div className="grid md:grid-cols-2 gap-5">
        {sections.map((s) => (
          <section key={s.title} className="rounded-3xl bg-white border border-blue/10 p-6">
            <h2 className="text-xl font-light mb-4">{s.title}</h2>
            <ul className="space-y-2.5">
              {s.people.map((p) => (
                <li key={p.slug}>
                  <Link href={`/schematizmus/knazi/${p.slug}`} className="font-extrabold hover:text-blue">
                    {p.name}
                  </Link>
                  {!s.members && <p className="text-sm text-mute">{p.role}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
