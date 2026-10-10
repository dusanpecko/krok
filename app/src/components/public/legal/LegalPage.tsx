import type { ReactNode } from 'react'
import { KROK_EMAIL_CODE, KROK_ORG } from '@/lib/legal'
import ProtectedEmail from '@/components/ProtectedEmail'

/** Rámec právnych stránok – tmavý dizajn KROK, čitateľná sadzba textu. */
export default function LegalPage({ eyebrow, title, effective, children }: { eyebrow: string; title: string; effective: string; children: ReactNode }) {
  return (
    <div className="relative -mt-24 lg:-mt-32 bg-paper-warm min-h-screen text-ink pb-24 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-36 sm:pt-44">
        <header className="mb-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue mb-4">{eyebrow}</p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-4">{title}</h1>
          <p className="text-sm text-mute">Platné od {effective}</p>
        </header>
        <article className="legal-text space-y-4 text-ink/85 leading-relaxed [&_h2]:text-2xl [&_h2]:font-light [&_h2]:text-ink [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:pt-6 [&_h2]:border-t [&_h2]:border-blue/10 [&_h3]:text-lg [&_h3]:font-extrabold [&_h3]:text-gold-bright [&_h3]:mt-8 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5 [&_a]:text-gold-bright [&_a]:underline [&_strong]:text-ink">
          {children}
        </article>
      </div>
    </div>
  )
}

/** Blok s identifikáciou prevádzkovateľa (IČO / DIČ len ak sú vyplnené). */
export function OrgBlock({ role }: { role: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.04] border border-blue/10 not-prose">
      <p className="text-xs font-black uppercase tracking-widest text-mute mb-2">{role}</p>
      <p className="font-extrabold text-ink">{KROK_ORG.name}</p>
      <p>{KROK_ORG.street}, {KROK_ORG.city}</p>
      {KROK_ORG.ico && <p>IČO: {KROK_ORG.ico}{KROK_ORG.dic ? ` · DIČ: ${KROK_ORG.dic}` : ''}</p>}
      <p>
        E-mail: <ProtectedEmail code={KROK_EMAIL_CODE} icon={false} /> · Tel.: {KROK_ORG.phone}
      </p>
    </div>
  )
}
