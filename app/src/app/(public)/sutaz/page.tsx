import { Metadata } from 'next'
import Link from 'next/link'
import {
  HeartHandshake,
  Users,
  Church,
  Gift,
  ImageIcon,
  QrCode,
  Landmark,
  Euro,
  CalendarCheck,
  Megaphone,
  Mail,
  ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Súťaž | KROK – Pastoračný fond Žilinskej diecézy',
  description:
    'Veľká narodeninová súťaž k 7. výročiu fondu KROK. Každý pravidelný darca s trvalým príkazom aspoň 7 € mesačne k 31. januáru 2027 bude zaradený do žrebovania o 20 vecných cien.',
  openGraph: {
    title: 'Súťaž | KROK',
    description:
      'Hľadáme 77 pravidelných darcov – zapojte sa do veľkej narodeninovej súťaže o 20 vecných cien.',
    type: 'website',
  },
}

// Vyšrafovaný rámček ako placeholder pre budúcu fotografiu (vzor zo stránky O nás)
function ImagePlaceholder({
  label,
  className = '',
}: {
  label: string
  className?: string
}) {
  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03] overflow-hidden flex flex-col items-center justify-center gap-3 text-center p-6 ${className}`}
    >
      {/* Jemné šrafovanie na pozadí */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 12px)',
        }}
      />
      <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
        <ImageIcon size={22} className="text-gold-bright/70" />
      </div>
      <p className="text-xs text-blue-100/50 leading-relaxed max-w-xs relative z-10">
        {label}
      </p>
    </div>
  )
}

// Kicker – zlatý nadpis sekcie s líniou (vzor z homepage)
function Kicker({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 text-gold-bright uppercase tracking-widest text-xs font-extrabold mb-4 ${
        center ? 'justify-center' : ''
      }`}
    >
      <span className="w-8 h-[2px] bg-gold rounded-full" />
      <span>{children}</span>
      {center && <span className="w-8 h-[2px] bg-gold rounded-full" />}
    </div>
  )
}

const cinnosti = [
  {
    icon: HeartHandshake,
    text: (
      <>
        <strong className="text-white font-bold">Prepájame</strong> darcov a
        tých, ktorí potrebujú podporu
      </>
    ),
  },
  {
    icon: Users,
    text: (
      <>
        <strong className="text-white font-bold">Podporujeme</strong> farnosti,
        spoločenstvá a aktívnych lídrov
      </>
    ),
  },
  {
    icon: Church,
    text: (
      <>
        <strong className="text-white font-bold">Budujeme</strong> silnejšiu
        Cirkev a spoločenstvá v nej
      </>
    ),
  },
]

const pravidla = [
  {
    icon: Euro,
    title: 'Výška príspevku',
    desc: 'Pravidelný dar alebo trvalý príkaz musia byť nastavené aspoň na 7 eur mesačne.',
  },
  {
    icon: CalendarCheck,
    title: 'Trvanie súťaže',
    desc: 'Súťaž prebieha do 31. 1. 2027.',
  },
  {
    icon: Megaphone,
    title: 'Vyhodnotenie',
    desc: 'Mená výhercov zverejníme na našom webe a facebooku vo februári 2027.',
  },
  {
    icon: Mail,
    title: 'Oznámenie výhry',
    desc: 'Výhercov budeme kontaktovať emailom.',
  },
]

export default function SutazPage() {
  return (
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep min-h-screen text-white pb-24 overflow-hidden">
      {/* Dekoratívne svetelné pozadie */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-36 sm:pt-44">
        {/* =====================================================
            HERO: 7 rokov s vami
            ===================================================== */}
        <header className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center mb-24">
          <div className="lg:col-span-7">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gold-bright mb-4">
              Narodeninová súťaž
            </p>
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-6 leading-tight">
              Už <strong className="font-extrabold text-gold">7 rokov</strong>{' '}
              spoločne pomáhame
            </h1>
            <p className="text-blue-100/80 text-base sm:text-lg leading-relaxed mb-8">
              Už 7 rokov spoločne pomáhame zveľaďovať život v našej Žilinskej
              diecéze.
            </p>

            <ul className="space-y-4 mb-8">
              {cinnosti.map((c, i) => (
                <li key={i} className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                    <c.icon size={20} className="text-gold-bright" />
                  </div>
                  <p className="text-blue-100/80 text-base sm:text-lg leading-relaxed">
                    {c.text}
                  </p>
                </li>
              ))}
            </ul>

            <p className="text-xl sm:text-2xl font-extrabold text-gold-bright">
              A to všetko vďaka Vám!
            </p>
          </div>
          <div className="lg:col-span-5">
            <ImagePlaceholder
              label="[Vizuál kampane: Hľadáme 77 pravidelných darcov – Ďakujeme, že nám pomáhate pomáhať]"
              className="aspect-[4/3]"
            />
          </div>
        </header>

        {/* =====================================================
            O SÚŤAŽI
            ===================================================== */}
        <section className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Kicker center>Ďakujeme, že nám pomáhate pomáhať</Kicker>
            <h2 className="text-3xl sm:text-4xl font-light leading-tight mb-4">
              Veľká narodeninová súťaž o{' '}
              <strong className="font-extrabold text-gold">
                20 vecných cien
              </strong>
            </h2>
            <p className="text-blue-100/70 leading-relaxed mb-4">
              Bez vás by naša práca nemala zmysel. Každá vaša pomoc, modlitba,
              zdieľanie či finančný príspevok nás posúva vpred.
            </p>
            <p className="text-blue-100/70 leading-relaxed">
              Chceme vám vašu štedrosť a podporu aspoň trochu oplatiť. Pri
              príležitosti nášho 7. výročia sme preto spolu s našimi sponzormi
              pripravili{' '}
              <strong className="text-white font-bold">
                veľkú narodeninovú súťaž o 20 vecných cien!
              </strong>
            </p>
          </div>

          {/* Hlavná podmienka súťaže */}
          <div className="relative bg-gradient-to-r from-gold/10 via-white/[0.04] to-white/[0.04] border border-gold/25 rounded-3xl p-8 sm:p-10 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-[300px] h-[300px] bg-gold/10 blur-[100px] pointer-events-none rounded-full" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0">
                <Gift size={30} className="text-gold-bright" />
              </div>
              <p className="text-blue-50/90 text-base sm:text-lg leading-relaxed">
                Každý náš pravidelný podporovateľ, ktorý bude mať k{' '}
                <strong className="text-gold-bright font-extrabold">
                  31. januáru 2027
                </strong>{' '}
                zriadený trvalý príkaz na aspoň{' '}
                <strong className="text-gold-bright font-extrabold">
                  7 € mesačne
                </strong>
                , bude zaradený do žrebovania o{' '}
                <strong className="text-white font-extrabold">
                  20 vecných cien
                </strong>
                .
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            AKO SA ZAPOJIŤ
            ===================================================== */}
        <section className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Kicker center>Dva jednoduché spôsoby</Kicker>
            <h2 className="text-3xl sm:text-4xl font-light leading-tight mb-4">
              Ako sa môžete zapojiť?
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* 1. Online */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl font-extrabold text-gold">1.</span>
                <div className="w-11 h-11 rounded-xl bg-gold/15 flex items-center justify-center">
                  <QrCode size={22} className="text-gold-bright" />
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Online na našej stránke
                </h3>
              </div>
              <p className="text-sm text-blue-100/60 leading-relaxed mb-6">
                <Link
                  href="/registracia"
                  className="text-gold-bright font-bold underline underline-offset-4 hover:text-gold transition-colors"
                >
                  Zaregistrujte sa TU
                </Link>{' '}
                a nastavte si pravidelný dar. Alebo nasnímajte QR kód.
              </p>
              <ImagePlaceholder
                label="[QR kód na stránku súťaže]"
                className="aspect-square max-w-[220px] mx-auto mt-auto"
              />
            </div>

            {/* 2. Internet banking */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl font-extrabold text-gold">2.</span>
                <div className="w-11 h-11 rounded-xl bg-gold/15 flex items-center justify-center">
                  <Landmark size={22} className="text-gold-bright" />
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Vo svojom internet bankingu
                </h3>
              </div>
              <p className="text-sm text-blue-100/60 leading-relaxed mb-6">
                Prihláste sa do svojej banky a zriaďte si trvalý príkaz s týmito
                údajmi:
              </p>
              <div className="space-y-3 mt-auto">
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gold-bright mb-1">
                    IBAN
                  </p>
                  <p className="text-base sm:text-lg font-bold text-white font-mono tracking-wide">
                    SK04 8330 0000 0029 0168 8673
                  </p>
                </div>
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gold-bright mb-1">
                    Prijímateľ
                  </p>
                  <p className="text-base font-bold text-white">
                    KROK – Pastoračný fond Žilinskej diecézy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            PRAVIDLÁ SÚŤAŽE
            ===================================================== */}
        <section className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Kicker center>Prehľadne a férovo</Kicker>
            <h2 className="text-3xl sm:text-4xl font-light leading-tight mb-4">
              Pravidlá súťaže
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pravidla.map((p) => (
              <div
                key={p.title}
                className="group bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-gold/40 rounded-2xl p-6 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-5">
                  <p.icon size={20} className="text-gold-bright" />
                </div>
                <h3 className="text-lg font-extrabold text-white mb-2">
                  {p.title}
                </h3>
                <p className="text-sm text-blue-100/60 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================
            Z VĎAKY ZA VAŠU PODPORU
            ===================================================== */}
        <section className="mb-24">
          <div className="relative bg-white/[0.04] border border-white/10 rounded-3xl p-8 sm:p-12 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-[300px] h-[300px] bg-gold/10 blur-[100px] pointer-events-none rounded-full" />

            <div className="relative grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-4">
                <ImagePlaceholder
                  label="[Fotografia: svätá omša alebo kňaz pri oltári – omša obetovaná za darcov]"
                  className="aspect-[3/4] max-w-[280px] mx-auto"
                />
              </div>
              <div className="lg:col-span-8">
                <Kicker>Z vďaky za vašu podporu</Kicker>
                <h2 className="text-3xl sm:text-4xl font-light leading-tight mb-6">
                  Svätá omša za vás
                </h2>
                <p className="text-blue-50/90 text-base sm:text-lg leading-relaxed mb-5">
                  Vždy v{' '}
                  <strong className="text-gold-bright font-bold">
                    prvú nedeľu v mesiaci
                  </strong>{' '}
                  obetujeme svätú omšu za vás – našich darcov a podporovateľov.
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-white">
                  Ďakujeme, že Vás máme!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            CTA
            ===================================================== */}
        <section className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-light leading-tight mb-4">
            Zapojte sa ešte dnes
          </h2>
          <p className="text-blue-100/70 leading-relaxed mb-8">
            Každý pravidelný dar od 7 € mesačne vás zaradí do žrebovania o 20
            vecných cien – a hlavne pomôže pastoračnému dielu našej diecézy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/registracia"
              className="px-8 py-4 bg-gold hover:bg-gold-bright text-blue-deep rounded-xl text-base font-extrabold shadow-2xl transition-all flex items-center justify-center gap-2 group"
            >
              Chcem sa stať pravidelným darcom a zapojiť sa do súťaže{' '}
              <ArrowRight
                className="group-hover:translate-x-1 transition-transform flex-shrink-0"
                size={18}
              />
            </Link>
            <Link
              href="/#dar"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-blue-50 rounded-xl text-base font-bold transition-all flex items-center justify-center border border-white/10"
            >
              Chcem darovať jednorazovo
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
