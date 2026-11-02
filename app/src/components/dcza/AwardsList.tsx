import Link from 'next/link'
import { Images } from 'lucide-react'
import { AWARD_GRANTOR_LABEL, type AwardGrantor, type PublicAward } from '@/lib/diocese/awards'

const GRANTORS: AwardGrantor[] = ['papez', 'biskup']

/** Ocenenia a vyznamenania (063) – pod obsahom stránky Diecéza → Ocenenia; admin: Web diecézy → Ocenenia. */
export default function AwardsList({ awards }: { awards: PublicAward[] }) {
  if (!awards.length) return null
  return (
    <div className="mt-10 space-y-12">
      {GRANTORS.map((g) => {
        const list = awards.filter((a) => a.grantor === g)
        if (!list.length) return null
        return (
          <section key={g}>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight mb-5">{AWARD_GRANTOR_LABEL[g]}</h2>
            <div className="space-y-5">
              {list.map((a) => <AwardCard key={a.slug} award={a} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function AwardCard({ award }: { award: PublicAward }) {
  return (
    <section id={award.slug} className="scroll-mt-32 rounded-3xl bg-white border border-blue/10 p-6">
      <div className="flex gap-5 items-start">
        {award.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={award.image_url} alt="" loading="lazy" className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0" />
        )}
        <div className="min-w-0">
          <h3 className="text-xl font-light">{award.name}</h3>
          {award.description && (
            <div className="mt-3 space-y-2 text-sm text-mute">
              {award.description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
            </div>
          )}
        </div>
      </div>
      {award.recipients.length > 0 && (
        <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {award.recipients.map((r, i) => (
            <li key={`${r.name}-${i}`}>
              {r.profileSlug ? (
                <Link href={`/schematizmus/knazi/${r.profileSlug}`} className="font-extrabold hover:text-blue">{r.name}</Link>
              ) : (
                <span className="font-extrabold">{r.name}</span>
              )}
              {r.deceased && <span className="text-mute" title="zosnulý"> †</span>}
              {(r.year || r.note) && <span className="text-sm text-mute"> · {[r.year, r.note].filter(Boolean).join(' · ')}</span>}
            </li>
          ))}
        </ul>
      )}
      {award.album && (
        <Link href={`/galeria/${award.album.slug}`} className="mt-5 flex items-center gap-4 rounded-2xl border border-blue/10 p-3 hover:border-gold/60 transition-colors group">
          {award.album.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={award.album.cover_url} alt="" loading="lazy" className="w-24 h-16 rounded-xl object-cover shrink-0" />
          )}
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-wine">
              <Images size={13} /> Fotogaléria
            </span>
            <span className="block font-extrabold group-hover:text-blue truncate">{award.album.title}</span>
            <span className="block text-xs text-mute">{award.album.photo_count} fotografií</span>
          </span>
        </Link>
      )}
    </section>
  )
}
