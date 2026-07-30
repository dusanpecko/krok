import { Metadata } from 'next'
import Image from 'next/image'
import { FileText, FileType2, Download, Palette } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Na stiahnutie | KROK – Pastoračný fond Žilinskej diecézy',
  description:
    'Dokumenty a materiály na stiahnutie – darovacia zmluva, súhlas so SIPO inkasom a logotyp pastoračného fondu KROK.',
  openGraph: {
    title: 'Na stiahnutie | KROK',
    description: 'Dokumenty a logotyp pastoračného fondu KROK na stiahnutie.',
    type: 'website',
  },
}

interface DocItem {
  title: string
  description: string
  href: string
  type: string
}

const documents: DocItem[] = [
  {
    title: 'Darovacia zmluva',
    description: 'Vzor darovacej zmluvy pre poskytnutie finančného daru fondu KROK.',
    href: '/downloads/dokumenty/darovacia_zmluva.pdf',
    type: 'PDF',
  },
  {
    title: 'Súhlas s inkasom cez SIPO',
    description: 'Žiadosť o inkasnú platbu vášho pravidelného daru prostredníctvom SIPO.',
    href: '/downloads/dokumenty/SIPO_ziadost.docx',
    type: 'DOCX',
  },
]

interface LogoSet {
  title: string
  description: string
  preview: string
  formats: { label: string; href: string }[]
}

const logoSets: LogoSet[] = [
  {
    title: 'Základný logotyp',
    description: 'Hlavná verzia loga fondu KROK.',
    preview: '/downloads/logo/logo.png',
    formats: [
      { label: 'PNG', href: '/downloads/logo/logo.png' },
      { label: 'SVG', href: '/downloads/logo/logo.svg' },
      { label: 'PDF', href: '/downloads/logo/logo.pdf' },
      { label: 'AI', href: '/downloads/logo/logo.ai' },
    ],
  },
  {
    title: 'Doplnkový logotyp',
    description: 'Alternatívna verzia loga pre špecifické použitie.',
    preview: '/downloads/logo/logo1.png',
    formats: [
      { label: 'PNG', href: '/downloads/logo/logo1.png' },
      { label: 'SVG', href: '/downloads/logo/logo1.svg' },
      { label: 'PDF', href: '/downloads/logo/logo1.pdf' },
      { label: 'AI', href: '/downloads/logo/logo1.ai' },
    ],
  },
]

export default function NaStiahnutiePage() {
  return (
    <div className="bg-blue-deep min-h-screen text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        {/* Hlavička */}
        <header className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold-bright mb-4">
            Materiály
          </p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-5">Na stiahnutie</h1>
          <p className="text-blue-100/70 text-base sm:text-lg leading-relaxed">
            Dokumenty potrebné pre darcov a oficiálny logotyp pastoračného fondu KROK.
          </p>
        </header>

        {/* Dokumenty */}
        <section className="mb-20">
          <h2 className="text-sm font-black uppercase tracking-widest border-l-4 border-gold pl-4 text-gold-bright mb-8">
            Dokumenty
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {documents.map((doc) => (
              <a
                key={doc.href}
                href={doc.href}
                download
                className="group flex items-start gap-4 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-gold/40 rounded-2xl p-5 transition-all"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gold/15 flex items-center justify-center">
                  <FileText size={22} className="text-gold-bright" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white truncate">{doc.title}</h3>
                    <span className="text-[10px] font-black tracking-wider text-gold-bright/80 border border-gold/30 rounded px-1.5 py-0.5">
                      {doc.type}
                    </span>
                  </div>
                  <p className="text-sm text-blue-100/60 mt-1 leading-relaxed">{doc.description}</p>
                </div>
                <Download
                  size={18}
                  className="flex-shrink-0 text-blue-100/40 group-hover:text-gold-bright transition-colors mt-1"
                />
              </a>
            ))}
          </div>
        </section>

        {/* Logotyp */}
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest border-l-4 border-gold pl-4 text-gold-bright mb-4 flex items-center gap-2">
            Logotyp
          </h2>
          <p className="text-blue-100/60 text-sm mb-8 max-w-2xl flex items-start gap-2">
            <Palette size={16} className="text-gold-bright flex-shrink-0 mt-0.5" />
            Logotyp je základným prvkom vizuálneho štýlu fondu KROK. Používajte ho prosím v pôvodných
            farbách a proporciách.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {logoSets.map((set) => (
              <div
                key={set.title}
                className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden"
              >
                <div className="bg-white p-8 flex items-center justify-center h-44">
                  <Image
                    src={set.preview}
                    alt={set.title}
                    width={220}
                    height={140}
                    className="max-h-28 w-auto object-contain"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-white">{set.title}</h3>
                  <p className="text-sm text-blue-100/60 mt-1 mb-4">{set.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {set.formats.map((f) => (
                      <a
                        key={f.href}
                        href={f.href}
                        download
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/5 hover:bg-gold/20 border border-white/10 hover:border-gold/40 text-blue-50 rounded-lg px-3 py-1.5 transition-all"
                      >
                        <FileType2 size={13} />
                        {f.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
