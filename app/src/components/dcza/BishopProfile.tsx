/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Bishop } from '@/lib/diocese/bishops'

/** Profil biskupa: fotka, základné údaje, heslo, životopis, pôsobenie, erb + karta druhého biskupa. */
export default function BishopProfile({ bishop, other, otherLabel }: { bishop: Bishop; other?: Bishop; otherLabel?: string }) {
  return (
    <>
      <div className="grid sm:grid-cols-[220px_1fr] gap-8 items-start">
        <div className="rounded-3xl overflow-hidden bg-blue-soft/40 border border-blue/10 aspect-[4/5] flex items-center justify-center">
          {bishop.photo ? (
            <img src={bishop.photo} alt={bishop.name} className="w-full h-full object-cover" />
          ) : (
            <img src="/dcza/erb-240.png" alt="" className="w-28 h-auto opacity-80" />
          )}
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gold-ink">{bishop.kicker}</p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight leading-tight mt-2">{bishop.name}</h1>
          <p className="text-lg text-mute mt-2">{bishop.role}</p>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mt-6">
            {bishop.facts.map((f) => (
              <div key={f.label}>
                <dt className="text-[11px] font-black uppercase tracking-widest text-mute">{f.label}</dt>
                <dd className="font-bold mt-0.5">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {bishop.motto && (
        <blockquote className="mt-10 rounded-2xl bg-white border border-blue/10 border-l-4 border-l-gold px-6 py-5">
          <p className="text-[11px] font-black uppercase tracking-widest text-mute">Biskupské heslo</p>
          <p className="text-2xl font-light italic mt-1">{bishop.motto.latin}</p>
          {bishop.motto.slovak && <p className="text-mute mt-1">{bishop.motto.slovak}</p>}
        </blockquote>
      )}

      <div className="dcza-prose mt-10">
        {bishop.bio.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {bishop.career.length > 0 && (
          <>
            <h2>{bishop.careerTitle ?? 'Pôsobenie'}</h2>
            <ul>
              {bishop.career.map((c, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: c }} />
              ))}
            </ul>
          </>
        )}
        {(bishop.coatOfArms || bishop.coatOfArmsText) && (
          <>
            <h2>Erb</h2>
            {bishop.coatOfArmsText?.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {bishop.coatOfArms && (
              <figure>
                <img src={bishop.coatOfArms} alt={`Erb – ${bishop.shortName}`} className="max-w-xs mx-auto" />
              </figure>
            )}
          </>
        )}
      </div>

      {other && (
        <Link href={`/${other.path}`} className="group mt-12 flex items-center gap-5 rounded-2xl bg-white border border-blue/10 p-5 hover:border-gold/60 transition-colors">
          <div className="w-16 h-20 rounded-xl overflow-hidden bg-blue-soft/40 shrink-0 flex items-center justify-center">
            {other.photo ? <img src={other.photo} alt="" className="w-full h-full object-cover" /> : <img src="/dcza/erb-240.png" alt="" className="w-10 h-auto opacity-80" />}
          </div>
          <div className="min-w-0 flex-1">
            {otherLabel && <p className="text-[11px] font-black uppercase tracking-widest text-mute">{otherLabel}</p>}
            <p className="font-extrabold group-hover:text-blue">{other.shortName}</p>
            <p className="text-sm text-mute">{other.role}</p>
          </div>
          <ArrowRight size={18} className="text-mute group-hover:text-blue shrink-0" />
        </Link>
      )}
    </>
  )
}
