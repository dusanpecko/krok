import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Church, MapPin } from 'lucide-react'
import ProtectedEmail from '@/components/dcza/ProtectedEmail'
import { getPublicClergy } from '@/lib/diocese/schematizmus'
import { shortDate } from '@/lib/diocese/format'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await getPublicClergy((await params).slug)
  if (!c) return { title: 'Osoba nenájdená' }
  const fn = c.functions[0]
  return { title: c.name, description: [fn ? `${fn.role}${fn.place ? ` – ${fn.place}` : ''}` : null, 'Schematizmus Žilinskej diecézy'].filter(Boolean).join(' · ') }
}

/** Profil v schematizme (O47) – bez fotky a súkromných kontaktov; len diecézny e-mail. */
export default async function ClergyProfile({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getPublicClergy((await params).slug)
  if (!c) notFound()
  const sacrament = (label: string, s: { date: string | null; place: string | null } | null) =>
    s && (
      <div className="rounded-2xl bg-white border border-blue/10 p-4">
        <p className="text-xs font-black uppercase tracking-wider text-mute">{label}</p>
        <p className="font-extrabold mt-1">{[s.date ? shortDate(s.date) : null, s.place].filter(Boolean).join(', ')}</p>
      </div>
    )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/schematizmus/knazi" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline mb-6">
        <ArrowLeft size={14} /> Kňazi a diakoni
      </Link>
      <h1 className="text-3xl sm:text-5xl font-light tracking-tight leading-tight">{c.name}</h1>
      {c.honorary.length > 0 && <p className="text-mute mt-2">{c.honorary.join(' · ')}</p>}
      {c.retired ? (
        <p className="mt-4 text-lg text-ink/80">Na odpočinku</p>
      ) : (
        c.functions.length > 0 && (
          <ul className="mt-5 space-y-1.5">
            {c.functions.map((f, i) => (
              <li key={i} className="text-lg">
                <span className="font-extrabold">{f.role}</span>
                {f.place &&
                  (f.parishSlug ? (
                    <>
                      {' – '}
                      <Link href={`/farnosti/${f.parishSlug}`} className="text-blue font-bold hover:underline">
                        {f.place}
                      </Link>
                    </>
                  ) : (
                    ` – ${f.place}`
                  ))}
              </li>
            ))}
          </ul>
        )
      )}
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        {c.emailCode && (
          <ProtectedEmail code={c.emailCode} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-soft/50 text-blue font-bold hover:underline" />
        )}
        {c.deanery && (
          <Link href={`/schematizmus/dekanaty#dekanat-${c.deanery.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-soft/50 text-blue font-bold">
            <Church size={14} /> Dekanát {c.deanery.name}
          </Link>
        )}
        {c.origin && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue/10 font-bold">
            <MapPin size={14} className="text-gold-ink" /> Pochádza: {c.origin}
          </span>
        )}
      </div>
      {(c.diaconate || c.ordination) && (
        <div className="grid sm:grid-cols-2 gap-3 mt-8">
          {sacrament('Diakonská vysviacka', c.diaconate)}
          {sacrament('Kňazská vysviacka', c.ordination)}
        </div>
      )}
      {c.history.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-light mb-4">Pôsobenie</h2>
          <ol className="relative border-l-2 border-blue/10 ml-2 space-y-3">
            {c.history.map((h, i) => (
              <li key={i} className="pl-5 relative">
                <span className={`absolute -left-[7px] top-2 w-3 h-3 rounded-full ${h.current ? 'bg-gold' : 'bg-blue/20'}`} />
                <span className="text-sm font-black text-mute tabular-nums">{h.years}</span>
                <p className={h.current ? 'font-extrabold' : ''}>
                  {h.parishSlug ? (
                    <Link href={`/farnosti/${h.parishSlug}`} className="hover:text-blue">
                      {h.text}
                    </Link>
                  ) : (
                    h.text
                  )}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
