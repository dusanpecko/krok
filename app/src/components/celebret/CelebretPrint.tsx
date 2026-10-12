import { AtSign, Globe, MapPin, Nfc, Phone } from 'lucide-react'
import type { CelebretView } from '@/lib/clergy/celebret'
import { CELEBRET_TEXT as T, celebretDate, celebretRole, commendationText } from '@/lib/clergy/celebret-text'

export interface PrintableCelebret extends CelebretView {
  qrSvg: string
  url: string
}

const img = (src: string | null | undefined, cls: string, style?: React.CSSProperties) =>
  // eslint-disable-next-line @next/next/no-img-element
  src ? <img src={src} alt="" className={cls} style={style} /> : null

const INK = '#3b4486' // indigo zo vzoru diecéznej karty

/** Líce plastovej karty CR80 (85,6 × 54 mm) podľa vzoru diecézy – fotka, názov, erb, meno, číslo, dátumy. */
export function CardFront({ c }: { c: PrintableCelebret }) {
  return (
    <div className="cb-card flex flex-col px-[3mm] pt-[2.6mm] pb-[2.2mm]" style={{ color: INK }}>
      <div className="flex gap-[2.5mm]">
        {c.photo_url ? img(c.photo_url, 'w-[23mm] h-[29mm] rounded-[2mm] object-cover shrink-0') : <div className="w-[23mm] h-[29mm] rounded-[2mm] bg-gray-100 shrink-0" />}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start gap-[1.5mm]">
            <div className="flex-1 text-center font-extrabold leading-[1.25]">
              <p className="text-[6.3pt] whitespace-nowrap">Diœcesis Žilinensis – Slovachia</p>
              <p className="text-[6.6pt] uppercase mt-[1.2mm]">Litteræ commendatitiæ</p>
              <p className="text-[6.6pt] uppercase">Celebret</p>
            </div>
            {img(c.settings?.logo_url, 'w-[15mm] h-[13mm] object-contain shrink-0')}
          </div>
          <div className="mt-auto">
            <div className="flex items-baseline justify-between gap-[2mm] font-bold">
              <p className="text-[6.4pt]">Nomen et cognomen</p>
              <p className="text-[6.4pt] whitespace-nowrap">no: {c.number}</p>
            </div>
            <p className="text-[10.5pt] font-extrabold leading-tight mt-[0.6mm]">{c.name}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 text-center font-bold mt-[2.6mm] leading-tight">
        {[
          ['Dies editionis', c.issued_on],
          ['Dies nativitatis', c.birth_date],
          ['Dies ordinationis', c.ordination_date],
        ].map(([label, date]) => (
          <div key={label}>
            <p className="text-[6.4pt]">{label}</p>
            <p className="text-[7.2pt] font-extrabold mt-[0.4mm]">{celebretDate(date).replace(/ /g, '')}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between">
        <p className="text-[6pt] font-bold pl-[11mm]">Edidit:&nbsp; Curia dioecesana Žilinensis</p>
        <span className="flex flex-col items-center leading-none font-black text-[5.2pt]">
          <Nfc size={11} strokeWidth={2.4} /> NFC
        </span>
      </div>
    </div>
  )
}

/** Rub karty – text odporúčania, QR, pečiatka, podpis, kontakt kúrie (čierna ako na vzore). */
export function CardBack({ c }: { c: PrintableCelebret }) {
  const s = c.settings
  const contact: [React.ReactNode, string][] = s
    ? [
        [<MapPin key="a" size={7} strokeWidth={2.6} />, s.curia_address.replace(/,\s*/, '\n')],
        [<Phone key="p" size={7} strokeWidth={2.6} />, s.curia_phone],
        [<AtSign key="e" size={7} strokeWidth={2.6} />, s.curia_email],
        [<Globe key="w" size={7} strokeWidth={2.6} />, s.curia_web],
      ]
    : []
  return (
    <div className="cb-card flex flex-col px-[3mm] pt-[2.6mm] pb-[2.2mm] text-black">
      <div className="flex gap-[2.5mm]">
        <p className="flex-1 text-[6.7pt] font-bold leading-[1.27] text-justify">{commendationText(c.confession_jurisdiction, c.category)}</p>
        <div className="w-[23mm] h-[23mm] shrink-0 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: c.qrSvg }} />
      </div>
      <div className="mt-auto flex items-end gap-[2mm]">
        <div className="w-[17mm] h-[17mm] shrink-0 rounded-full flex items-center justify-center" style={s?.stamp_url ? undefined : { border: '0.35mm solid #000' }}>
          {img(s?.stamp_url, 'w-full h-full object-contain')}
        </div>
        <div className="flex-1 text-center">
          {s?.signature_url ? img(s.signature_url, 'h-[10mm] max-w-[28mm] object-contain mx-auto') : <div className="h-[10mm]" />}
          <p className="border-t-[0.3mm] border-black pt-[0.6mm] text-[5.8pt] font-bold">{s?.signer_name || T.subscriptio}</p>
        </div>
        <ul className="w-[27mm] shrink-0 space-y-[0.7mm] text-[5.4pt] font-bold leading-tight">
          {contact.map(([icon, text], i) => (
            <li key={i} className="flex gap-[1mm] items-start whitespace-pre-line">
              <span className="mt-[0.2mm] shrink-0">{icon}</span> {text}
            </li>
          ))}
        </ul>
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
