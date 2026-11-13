import Link from 'next/link'
import { Mail, Phone } from 'lucide-react'
import ProtectedEmail from '@/components/ProtectedEmail'
import { encodeEmail } from '@/lib/email-code'
import type { PublicContactBlock, PublicContactSection } from '@/lib/diocese/contacts'

/** „041/56 584 23“ → tel:+421415658423 */
function telHref(phone: string) {
  let d = phone.replace(/[^\d+]/g, '')
  if (d.startsWith('00')) d = `+${d.slice(2)}`
  else if (d.startsWith('0')) d = `+421${d.slice(1)}`
  return `tel:${d}`
}

const TOKEN = /([^\s@,;()]+@[^\s@,;()]+\.[a-z]{2,})|(https?:\/\/[^\s,;()]+)/gi

/** Riadok textu – e-maily chránené, odkazy klikateľné. */
function TextLine({ line }: { line: string }) {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of line.matchAll(TOKEN)) {
    const i = m.index ?? 0
    if (i > last) parts.push(line.slice(last, i))
    if (m[1]) parts.push(<ProtectedEmail key={i} code={encodeEmail(m[1])} icon={false} className="text-blue font-bold hover:underline" />)
    else parts.push(<a key={i} href={m[2]} target="_blank" rel="noopener" className="text-blue font-bold hover:underline">{m[2].replace(/^https?:\/\//, '')}</a>)
    last = i + m[0].length
  }
  if (last < line.length) parts.push(line.slice(last))
  return <>{parts}</>
}

function Channels({ emails, phones }: { emails: string[]; phones: string[] }) {
  if (!emails.length && !phones.length) return null
  return (
    <div className="mt-1.5 space-y-1 text-sm">
      {phones.map((p) => (
        <a key={p} href={telHref(p)} className="flex items-center gap-2 text-ink/85 hover:text-blue">
          <Phone size={14} className="text-gold-ink shrink-0" /> {p}
        </a>
      ))}
      {/* kľúč = poradie, nie e-mail – kľúč by sa dostal do HTML a obišiel ochranu pred botmi */}
      {emails.map((e, i) => (
        <div key={i} className="flex items-center gap-2">
          <Mail size={14} className="text-gold-ink shrink-0" />
          <ProtectedEmail code={encodeEmail(e)} icon={false} className="text-blue font-bold hover:underline break-all" />
        </div>
      ))}
    </div>
  )
}

function Block({ block }: { block: PublicContactBlock }) {
  return (
    <div className="rounded-2xl bg-white border border-blue/10 p-5">
      {block.title && <h3 className="text-[11px] font-black uppercase tracking-widest text-mute mb-2">{block.title}</h3>}
      {block.body && (
        <div className="text-[15px] leading-relaxed text-ink/90">
          {block.body.split('\n').map((l, i) => (l.trim() ? <p key={i}><TextLine line={l} /></p> : <div key={i} className="h-2" />))}
        </div>
      )}
      <Channels emails={block.emails} phones={block.phones} />
      {block.people.length > 0 && (
        <ul className={`space-y-3 ${block.body || block.emails.length || block.phones.length ? 'mt-3 pt-3 border-t border-blue/10' : ''}`}>
          {block.people.map((p, i) => (
            <li key={i}>
              <p className="leading-snug">
                {p.profileSlug ? (
                  <Link href={`/schematizmus/knazi/${p.profileSlug}`} className="font-extrabold hover:text-blue">{p.name}</Link>
                ) : (
                  <span className="font-extrabold">{p.name}</span>
                )}
                {p.role && <span className="text-mute"> – {p.role}</span>}
              </p>
              <Channels emails={p.emails} phones={p.phones} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Stránka Kontakty webu diecézy – sekcie s rýchlou navigáciou, bloky v mriežke. */
export default function ContactsList({ sections }: { sections: PublicContactSection[] }) {
  return (
    <>
      <nav className="flex flex-wrap gap-2 mt-6" aria-label="Sekcie kontaktov">
        {sections.map((s) => (
          <a key={s.slug} href={`#${s.slug}`} className="px-3 py-1.5 rounded-full bg-white border border-blue/15 text-sm font-bold text-ink/80 hover:border-gold/60 hover:text-blue">
            {s.title}
          </a>
        ))}
      </nav>
      <div className="mt-10 space-y-12">
        {sections.map((s) => (
          <section key={s.slug} id={s.slug} className="scroll-mt-32">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight mb-4">{s.title}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {s.blocks.map((b, i) => (
                <Block key={i} block={b} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
