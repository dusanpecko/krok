import { CheckCircle2, XCircle } from 'lucide-react'
import type { CelebretView } from '@/lib/clergy/celebret'
import ProtectedEmail from '@/components/ProtectedEmail'
import { encodeEmail } from '@/lib/email-code'
import { CELEBRET_TEXT as T, celebretDate, celebretRole, commendationText } from '@/lib/clergy/celebret-text'

/**
 * Celebret na overovacej stránke (QR) – stav platnosti veľkým písmom, údaje kňaza, latinský text,
 * pečiatka a podpis z verzie nastavení, ktorá platila pri vydaní (O57). Bez klientskeho JS.
 */
export default function CelebretDocument({ c, profileUrl }: { c: CelebretView; profileUrl: string | null }) {
  const s = c.settings
  const valid = c.state === 'valid'
  const rows: [string, string][] = [
    [T.name, c.name],
    [T.birth, celebretDate(c.birth_date)],
    [T.ordination, celebretDate(c.ordination_date)],
    [T.issued, celebretDate(c.issued_on)],
    [T.validUntil, celebretDate(c.valid_until)],
    [T.number, c.number],
  ]
  return (
    <article className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl shadow-blue/10 overflow-hidden border border-blue/10">
      {/* stav platnosti */}
      <div className={`px-6 py-5 text-center text-white ${valid ? 'bg-emerald-600' : 'bg-red-600'}`}>
        <p className="flex items-center justify-center gap-2 text-3xl font-black tracking-[0.15em]">
          {valid ? <CheckCircle2 size={30} /> : <XCircle size={30} />} {valid ? T.valid : T.invalid}
        </p>
        <p className="mt-1 text-sm font-bold text-white/90">
          {valid ? `${T.validUntil} ${celebretDate(c.valid_until)}` : c.state === 'revoked' ? T.revoked : T.expired}
        </p>
      </div>

      <div className="px-6 pt-6 pb-8 text-center">
        {s?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.logo_url} alt="" className="h-16 mx-auto object-contain" />
        )}
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-mute">{T.diocese}</p>
        <p className="mt-1 text-sm font-black uppercase tracking-[0.25em] text-ink">{T.title}</p>
        <h1 className="text-4xl font-light tracking-[0.2em] uppercase text-blue mt-1">{T.celebret}</h1>

        <div className="mt-6 flex flex-col items-center">
          {c.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.photo_url} alt={c.name} className="w-36 h-36 rounded-full object-cover border-4 border-white shadow-lg ring-1 ring-blue/10" />
          ) : (
            <div className="w-36 h-36 rounded-full bg-blue-soft/60" />
          )}
          <p className="mt-3 text-sm font-black uppercase tracking-[0.3em] text-gold-ink">{celebretRole(c.category)}</p>
          <p className="mt-1 text-2xl font-extrabold text-ink leading-tight">{c.name}</p>
        </div>

        <dl className="mt-6 divide-y divide-blue/10 text-left border-y border-blue/10">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-sm italic text-mute">{k}</dt>
              <dd className="text-sm font-bold text-ink text-right">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-[15px] leading-relaxed italic text-ink/85 text-justify">{commendationText(c.confession_jurisdiction, c.category)}</p>

        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-mute">{T.edidit}</p>
        <div className="mt-3 flex items-end justify-center gap-4 min-h-24">
          {s?.stamp_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.stamp_url} alt="" className="h-24 w-24 object-contain opacity-90" />
          )}
          {s?.signature_url && (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.signature_url} alt="" className="h-16 max-w-44 object-contain mx-auto" />
              <p className="border-t border-ink/30 mt-1 pt-1 text-[11px] italic text-mute">{s.signer_name || T.subscriptio}</p>
              {s.signer_function && <p className="text-[11px] text-mute">{s.signer_function}</p>}
            </div>
          )}
        </div>

        {profileUrl && (
          <a href={profileUrl} className="mt-6 inline-block text-sm font-bold text-blue hover:underline">
            {T.profile}
          </a>
        )}

        {s && (
          <div className="mt-6 rounded-2xl bg-paper-warm px-4 py-3 text-xs text-mute leading-relaxed">
            <p className="font-black uppercase tracking-widest text-ink/70 mb-1">{T.curia}</p>
            <p>{s.curia_address}</p>
            <p>
              {s.curia_phone} · <ProtectedEmail code={encodeEmail(s.curia_email)} icon={false} className="hover:text-blue" />
            </p>
          </div>
        )}
      </div>
    </article>
  )
}
