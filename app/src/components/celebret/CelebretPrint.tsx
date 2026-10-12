import type { CelebretView } from '@/lib/clergy/celebret'
import { CELEBRET_TEXT as T, celebretDate, celebretRole, commendationText } from '@/lib/clergy/celebret-text'

export interface PrintableCelebret extends CelebretView {
  qrSvg: string
  url: string
}

const img = (src: string | null | undefined, cls: string, style?: React.CSSProperties) =>
  // eslint-disable-next-line @next/next/no-img-element
  src ? <img src={src} alt="" className={cls} style={style} /> : null

/** Líce karty 85 × 54 mm – fotka, meno, platnosť, QR. */
export function CardFront({ c }: { c: PrintableCelebret }) {
  return (
    <div className="cb-card flex gap-[3mm] p-[3.5mm]">
      <div className="flex flex-col items-center justify-between w-[24mm] shrink-0">
        {img(c.settings?.logo_url, 'h-[9mm] object-contain')}
        {c.photo_url ? img(c.photo_url, 'w-[22mm] h-[22mm] rounded-full object-cover') : <div className="w-[22mm] h-[22mm] rounded-full bg-gray-200" />}
        <p className="text-[6pt] font-black uppercase tracking-[0.2em] text-[#bf9b1b]">{celebretRole(c.category)}</p>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <p className="text-[5.5pt] font-bold uppercase tracking-[0.15em] text-gray-500 leading-tight">{T.diocese}</p>
        <p className="text-[5.5pt] font-black uppercase tracking-[0.15em] leading-tight">{T.title}</p>
        <p className="text-[13pt] font-light uppercase tracking-[0.2em] text-[#095096] leading-none mt-[1mm]">{T.celebret}</p>
        <p className="text-[8.5pt] font-extrabold leading-tight mt-[1.5mm]">{c.name}</p>
        <div className="mt-auto flex items-end justify-between gap-[2mm]">
          <div className="text-[6pt] leading-snug">
            <p><span className="italic text-gray-500">{T.ordination}:</span> {celebretDate(c.ordination_date)}</p>
            <p><span className="italic text-gray-500">{T.issued}:</span> {celebretDate(c.issued_on)}</p>
            <p className="font-black"><span className="italic font-normal text-gray-500">{T.validUntil}:</span> {celebretDate(c.valid_until)}</p>
            <p className="text-gray-500">№ {c.number}</p>
          </div>
          <div className="w-[17mm] h-[17mm] shrink-0 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: c.qrSvg }} />
        </div>
      </div>
    </div>
  )
}

/** Rub karty – text odporúčania, pečiatka, podpis, kontakt kúrie. */
export function CardBack({ c }: { c: PrintableCelebret }) {
  const s = c.settings
  return (
    <div className="cb-card flex flex-col p-[3.5mm]">
      <p className="text-[5.6pt] leading-[1.35] italic text-justify">{commendationText(c.confession_jurisdiction, c.category)}</p>
      <div className="mt-auto flex items-end justify-between gap-[2mm]">
        <div className="text-[5pt] leading-snug text-gray-600">
          <p className="font-bold uppercase tracking-wider text-gray-800">{T.edidit}</p>
          {s && (
            <>
              <p>{s.curia_address}</p>
              <p>{s.curia_phone} · {s.curia_email}</p>
            </>
          )}
        </div>
        <div className="flex items-end gap-[1mm] shrink-0">
          {img(s?.stamp_url, 'h-[15mm] w-[15mm] object-contain')}
          {s?.signature_url && (
            <div className="text-center">
              {img(s.signature_url, 'h-[9mm] max-w-[24mm] object-contain mx-auto')}
              <p className="border-t border-gray-400 text-[4.5pt] italic text-gray-500 px-[1mm]">{s.signer_name || T.subscriptio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Celebret na celú stranu A4 (cesty do zahraničia). */
export function A4Page({ c }: { c: PrintableCelebret }) {
  const s = c.settings
  const rows: [string, string][] = [
    [T.name, c.name],
    [T.birth, celebretDate(c.birth_date)],
    [T.ordination, celebretDate(c.ordination_date)],
    [T.issued, celebretDate(c.issued_on)],
    [T.validUntil, celebretDate(c.valid_until)],
    [T.number, c.number],
  ]
  return (
    <section className="cb-a4 flex flex-col items-center text-center px-[22mm] py-[18mm]">
      {img(s?.logo_url, 'h-[24mm] object-contain')}
      <p className="mt-[4mm] text-[10pt] font-bold uppercase tracking-[0.25em] text-gray-500">{T.diocese}</p>
      <p className="mt-[1mm] text-[12pt] font-black uppercase tracking-[0.3em]">{T.title}</p>
      <p className="text-[34pt] font-light uppercase tracking-[0.25em] text-[#095096] leading-none mt-[2mm]">{T.celebret}</p>
      <div className="mt-[8mm] flex items-center gap-[10mm] text-left">
        {c.photo_url ? img(c.photo_url, 'w-[42mm] h-[42mm] rounded-full object-cover') : <div className="w-[42mm] h-[42mm] rounded-full bg-gray-200" />}
        <div>
          <p className="text-[10pt] font-black uppercase tracking-[0.3em] text-[#bf9b1b]">{celebretRole(c.category)}</p>
          <dl className="mt-[2mm] text-[11pt] leading-relaxed">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-[3mm]">
                <dt className="italic text-gray-500 w-[42mm]">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="mt-[10mm] text-[13pt] leading-relaxed italic text-justify">{commendationText(c.confession_jurisdiction, c.category)}</p>
      <p className="mt-[10mm] text-[10pt] font-bold uppercase tracking-widest text-gray-600">{T.edidit}</p>
      <div className="mt-[4mm] w-full flex items-end justify-between">
        <div className="w-[30mm] h-[30mm] [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: c.qrSvg }} />
        <div className="flex items-end gap-[4mm]">
          {img(s?.stamp_url, 'h-[32mm] w-[32mm] object-contain')}
          {s?.signature_url && (
            <div className="text-center">
              {img(s.signature_url, 'h-[20mm] max-w-[60mm] object-contain mx-auto')}
              <p className="border-t border-gray-500 pt-[1mm] text-[9pt] italic text-gray-600">{s.signer_name || T.subscriptio}</p>
              {s.signer_function && <p className="text-[9pt] text-gray-600">{s.signer_function}</p>}
            </div>
          )}
        </div>
      </div>
      {s && (
        <p className="mt-auto pt-[6mm] text-[9pt] text-gray-600">
          <strong>{T.curia}:</strong> {s.curia_address} · {s.curia_phone} · {s.curia_email}
        </p>
      )}
      <p className="text-[8pt] text-gray-400 mt-[1mm]">{c.url}</p>
    </section>
  )
}
