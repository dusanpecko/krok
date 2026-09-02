import { Metadata } from 'next'
import Link from 'next/link'
import {
  Lightbulb,
  Smile,
  Flame,
  Sparkles,
  BookOpen,
  GraduationCap,
  Church,
  HeartHandshake,
  ImageIcon,
  Quote,
  ShieldCheck,
  Users,
  ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'O nás | KROK – Pastoračný fond Žilinskej diecézy',
  description:
    'KROK – Pastoračný fond Žilinskej diecézy bol zriadený 1. augusta 2019 z iniciatívy biskupa Mons. Tomáša Galisa. Spoznajte naše hodnoty, poslanie a ľudí, ktorí fond spravujú.',
  openGraph: {
    title: 'O nás | KROK',
    description:
      'Spoznajte hodnoty, poslanie a ľudí pastoračného fondu KROK Žilinskej diecézy.',
    type: 'website',
  },
}

// Vyšrafovaný rámček ako placeholder pre budúcu fotografiu
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

const hodnoty = [
  {
    letter: 'K',
    name: 'Kreativita',
    icon: Lightbulb,
    desc: 'Hľadáme stále nové a svieže cesty, ako ohlasovať evanjelium v modernom svete, aby bolo zrozumiteľné pre každého.',
  },
  {
    letter: 'R',
    name: 'Radosť',
    icon: Smile,
    desc: 'Evanjelium je radostná zvesť. Naším cieľom je, aby táto radosť vyžarovala z každého nášho projektu a stretnutia.',
  },
  {
    letter: 'O',
    name: 'Odvaha',
    icon: Flame,
    desc: 'Nebojíme sa vykročiť do neznáma, skúšať nové veci a otvárať dôležité témy, ktoré hýbu dnešnou spoločnosťou.',
  },
  {
    letter: 'K',
    name: 'Krása',
    icon: Sparkles,
    desc: 'Veríme, že Boh k nám prehovára aj cez estetiku, umenie a harmóniu. Preto dbáme na to, aby naše aktivity prinášali krásu do všedných dní.',
  },
]

const piliere = [
  {
    icon: BookOpen,
    title: 'Duchovný rast a vzdelávanie',
    desc: 'Prehlbujeme vzťah s Bohom v realite všedného dňa. Podporujeme kurzy, semináre, duchovné obnovy a podobné aktivity, ktoré dávajú viere hĺbku a pevný základ.',
    imageLabel:
      '[Fotografia: účastníci duchovnej obnovy alebo kurzu, otvorené Sväté písmo]',
  },
  {
    icon: GraduationCap,
    title: 'Formácia osobností a lídrov',
    desc: 'Investujeme do ľudí, ktorí tvoria živú Cirkev. Podporujeme študentov, laikov, bohoslovcov i kňazov na ceste k zrelosti, aby sa stali inšpiratívnymi lídrami svojich komunít.',
    imageLabel:
      '[Fotografia: mladí animátori alebo bohoslovci pri formačnom stretnutí]',
  },
  {
    icon: Church,
    title: 'Budovanie živých spoločenstiev',
    desc: 'Premieňame farnosti a komunity na otvorený domov. Pomáhame vytvárať miesta prijatia a povzbudenia, kde môže každý naplno rozvinúť svoj potenciál.',
    imageLabel:
      '[Fotografia: farské spoločenstvo, stretnutie rodín alebo mladých vo farnosti]',
  },
  {
    icon: HeartHandshake,
    title: 'Služba a dialóg',
    desc: 'Vieru meníme na skutky. Cez konkrétnu pomoc núdznym a otvorenú komunikáciu s verejnosťou prinášame hodnoty evanjelia do moderného sveta.',
    imageLabel: '[Fotografia: dobrovoľníci pri konkrétnej službe núdznym]',
  },
]

const spravnaRada = [
  'Martin Kramara, CSsDr., ThLic., g. vikár',
  'Miriam Janegová, Mgr., Ing.',
  'Roland Mikula, Ing.',
  'Roman Seko, ThLic., Mgr.',
]

export default function ONasPage() {
  return (
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep min-h-screen text-white pb-24 overflow-hidden">
      {/* Dekoratívne svetelné pozadie */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-36 sm:pt-44">
        {/* =====================================================
            HERO: O nás
            ===================================================== */}
        <header className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center mb-24">
          <div className="lg:col-span-7">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gold-bright mb-4">
              Kto sme
            </p>
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-6 leading-tight">
              O nás
            </h1>
            <p className="text-blue-100/80 text-base sm:text-lg leading-relaxed mb-5">
              <strong className="text-white font-bold">
                KROK – Pastoračný fond Žilinskej diecézy
              </strong>{' '}
              bol zriadený 1. augusta 2019 z iniciatívy otca biskupa Mons. Tomáša
              Galisa. Pôsobíme ako účelové zariadenie cirkvi a naším hlavným
              poslaním je finančne i metodicky zastrešovať a rozvíjať pastoračné
              aktivity na území celej našej diecézy.
            </p>
            <p className="text-blue-100/70 text-base sm:text-lg leading-relaxed">
              Sme tu pre všetkých, ktorí túžia kráčať vpred a budovať duchovné
              hodnoty v našom regióne. Každý váš dar je pre nás dôležitým krokom
              na tejto spoločnej ceste.
            </p>
          </div>
          <div className="lg:col-span-5">
            <ImagePlaceholder
              label="[Fotografia: Katedrála Najsvätejšej Trojice v Žiline alebo spoločenstvo veriacich diecézy]"
              className="aspect-[4/3]"
            />
          </div>
        </header>

        {/* =====================================================
            HODNOTY: K-R-O-K
            ===================================================== */}
        <section className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Kicker center>Hodnoty skryté v mene</Kicker>
            <h2 className="text-3xl sm:text-4xl font-light leading-tight mb-4">
              Hodnoty, ktoré nás vedú
            </h2>
            <p className="text-blue-100/70 leading-relaxed">
              Pastoračný fond KROK vznikol ako živá odpoveď na potrebu sprevádzať
              ľudí na ich ceste viery. Názov KROK v sebe ukrýva štyri základné
              hodnoty, ktoré sú podstatou všetkého, čo robíme:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {hodnoty.map((h) => (
              <div
                key={h.name}
                className="group bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-gold/40 rounded-2xl p-6 transition-all"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="text-4xl font-extrabold text-gold">
                    {h.letter}
                  </span>
                  <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                    <h.icon size={20} className="text-gold-bright" />
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-white mb-2">
                  {h.name}
                </h3>
                <p className="text-sm text-blue-100/60 leading-relaxed">
                  {h.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================
            POSLANIE
            ===================================================== */}
        <section className="mb-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <ImagePlaceholder
                label="[Fotografia: rodina alebo darcovia – veľká rodina malých darcov, atmosféra spoločenstva]"
                className="aspect-[4/3]"
              />
            </div>
            <div className="lg:col-span-7 order-1 lg:order-2">
              <Kicker>Prečo to robíme</Kicker>
              <h2 className="text-3xl sm:text-4xl font-light leading-tight mb-6">
                Poslanie
              </h2>
              <p className="text-blue-100/80 text-base sm:text-lg leading-relaxed mb-5">
                Budujeme{' '}
                <strong className="text-gold-bright font-bold">
                  rodinu malých darcov s veľkým srdcom
                </strong>
                , pretože veríme, že každé gesto lásky prehlbuje prítomnosť Boha
                v našom svete.
              </p>
              <p className="text-blue-100/70 text-base sm:text-lg leading-relaxed">
                Kráčame s dobou – využívame moderné prostriedky, aby sme chránili
                večné hodnoty. Naším cieľom nie je len jednorazová pomoc, ale
                budovanie udržateľného zázemia pre rast živej Cirkvi.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            NAŠE PILIERE
            ===================================================== */}
        <section className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Kicker center>Kam smeruje vaša podpora</Kicker>
            <h2 className="text-3xl sm:text-4xl font-light leading-tight mb-4">
              Naše piliere
            </h2>
            <p className="text-blue-100/70 leading-relaxed">
              Zameriavame sa na oblasti, kde živá viera prináša ovocie pre celú
              spoločnosť:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {piliere.map((p) => (
              <div
                key={p.title}
                className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden flex flex-col"
              >
                <ImagePlaceholder
                  label={p.imageLabel}
                  className="aspect-[16/7] rounded-none border-0 border-b-2 border-dashed border-white/10"
                />
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center flex-shrink-0">
                      <p.icon size={20} className="text-gold-bright" />
                    </div>
                    <h3 className="text-lg font-extrabold text-white">
                      {p.title}
                    </h3>
                  </div>
                  <p className="text-sm text-blue-100/60 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================
            SPRÁVA FONDU
            ===================================================== */}
        <section className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Kicker center>Transparentnosť</Kicker>
            <h2 className="text-3xl sm:text-4xl font-light leading-tight mb-4">
              Správa fondu
            </h2>
            <p className="text-blue-100/70 leading-relaxed">
              Na transparentnosť a správne smerovanie fondu KROK dohliada tím
              ľudí, ktorým záleží na rozvoji pastoračných aktivít v našej
              diecéze.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Správna rada */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gold/15 flex items-center justify-center">
                  <Users size={22} className="text-gold-bright" />
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Správna rada
                </h3>
              </div>
              <p className="text-sm text-blue-100/60 leading-relaxed mb-6">
                Zabezpečuje efektívne spravovanie finančných prostriedkov,
                komunikáciu s darcami a technické fungovanie fondu.
              </p>
              <ul className="space-y-3">
                {spravnaRada.map((meno) => (
                  <li key={meno} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                    <span className="text-sm text-blue-50 font-medium">
                      {meno}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dozorná rada */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gold/15 flex items-center justify-center">
                  <ShieldCheck size={22} className="text-gold-bright" />
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Dozorná rada
                </h3>
              </div>
              <p className="text-sm text-blue-100/60 leading-relaxed mb-6">
                Dohliada na čistotu procesov a správnosť hospodárenia, aby ste si
                mohli byť istí, že každý váš dar je použitý presne tam, kde má.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                  <span className="text-sm text-blue-50 font-medium">
                    Peter Dubec, Mgr., Ing.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Zriaďovateľ */}
          <div className="bg-gradient-to-r from-gold/10 via-white/[0.04] to-white/[0.04] border border-gold/25 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gold/15 flex items-center justify-center flex-shrink-0">
              <Church size={22} className="text-gold-bright" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-gold-bright mb-1">
                Zriaďovateľ
              </h3>
              <p className="text-lg font-bold text-white">
                Mons. Tomáš Galis, žilinský biskup
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            CITÁT BISKUPA
            ===================================================== */}
        <section className="mb-24">
          <div className="relative bg-white/[0.04] border border-white/10 rounded-3xl p-8 sm:p-12 overflow-hidden">
            {/* Dekoratívna žiara */}
            <div className="absolute -top-20 -right-20 w-[300px] h-[300px] bg-gold/10 blur-[100px] pointer-events-none rounded-full" />

            <div className="relative grid lg:grid-cols-12 gap-10 items-center">
              {/* Portrét – placeholder */}
              <div className="lg:col-span-4">
                <ImagePlaceholder
                  label="[Portrétová fotografia: Mons. Tomáš Galis, žilinský biskup]"
                  className="aspect-[3/4] max-w-[280px] mx-auto"
                />
              </div>

              {/* Text citátu */}
              <div className="lg:col-span-8">
                <Quote size={36} className="text-gold/40 mb-5" />
                <blockquote className="space-y-4 text-blue-50/90 text-base sm:text-lg leading-relaxed italic font-light">
                  <p>Drahí priatelia, bratia a sestry,</p>
                  <p>
                    každý veľký cieľ sa začína tým najjednoduchším – prvým
                    krokom. V živote viery to platí dvojnásobne. Projekt Môj Krok
                    vznikol preto, aby nikto na tejto ceste nekráčal sám. Mojou
                    túžbou je, aby naše spoločenstvá boli živé, tvorivé a plné
                    nádeje.
                  </p>
                  <p>
                    Pozývam vás, aby ste sa k nám pridali. Či už modlitbou, časom
                    alebo darom. Spoločne dokážeme urobiť kroky, ktoré prinesú
                    svetlo do mnohých sŕdc. Žehnám Vám aj tomuto dielu.
                  </p>
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <span className="w-10 h-[2px] bg-gold rounded-full" />
                  <span className="text-sm font-extrabold uppercase tracking-widest text-gold-bright">
                    Tomáš Galis, žilinský biskup
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            CTA
            ===================================================== */}
        <section className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-light leading-tight mb-4">
            Pridajte sa k nám na spoločnej ceste
          </h2>
          <p className="text-blue-100/70 leading-relaxed mb-8">
            Každý dar – malý či veľký – je krokom, ktorý posúva pastoračné dielo
            našej diecézy vpred.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/#dar"
              className="px-8 py-4 bg-gold hover:bg-gold-bright text-blue-deep rounded-xl text-base font-extrabold shadow-2xl transition-all flex items-center justify-center gap-2 group"
            >
              Chcem podporiť{' '}
              <ArrowRight
                className="group-hover:translate-x-1 transition-transform"
                size={18}
              />
            </Link>
            <Link
              href="/kontakt"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-blue-50 rounded-xl text-base font-bold transition-all flex items-center justify-center border border-white/10"
            >
              Kontaktujte nás
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
