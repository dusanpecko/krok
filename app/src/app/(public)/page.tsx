'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Sparkles, 
  BookOpen, 
  Users, 
  TrendingUp, 
  Compass, 
  Check, 
  ArrowRight, 
  Gift, 
  QrCode, 
  Copy, 
  FileText
} from 'lucide-react';
import { 
  motion, 
  useScroll, 
  useTransform, 
  useInView, 
  useReducedMotion,
  AnimatePresence 
} from 'framer-motion';
import KrokLogo from '@/components/KrokLogo';
import Image from 'next/image';
import { getPublicStats } from './actions';

// ==========================================
// 1. DYNAMICKÉ PLACEHOLDERY A NASTAVENIE DÁT
// ==========================================

// Zástupné čísla (placeholders) pre pastoračný fond KROK
const PLACEHOLDER_DONORS_COUNT = 384;      // {{POCET_DARCOV}}
const PLACEHOLDER_TOTAL_AMOUNT = 19450;    // {{CELKOVA_SUMA}}
const PLACEHOLDER_PROJECTS_COUNT = 14;     // {{POCET_PODPORENYCH_PROJEKTOV}}

// Projekt: Lectio Divina (reálne dáta)
const LECTIO_DIVINA_TARGET = 7000;
const LECTIO_DIVINA_CURRENT = 4900;        // {{AKTUALNA_SUMA_PROJEKTU}} (70% z cieľa)

// Metalické prémiové štýly pre donorské karty z predlohy
const CARD_STYLES = {
  bronze: {
    background: 'linear-gradient(135deg, #7a3a2e, #3a1f18)',
    color: '#f0e4dc',
    shadow: '0 25px 50px -12px rgba(122, 58, 46, 0.25)',
    tierName: 'Priateľ'
  },
  silver: {
    background: 'linear-gradient(135deg, #3a4654, #11161f)',
    color: '#e8edf2',
    shadow: '0 25px 50px -12px rgba(58, 70, 84, 0.25)',
    tierName: 'Patrón'
  },
  gold: {
    background: 'linear-gradient(135deg, #e0cf5e, #b89a1f)',
    color: '#1b2430',
    shadow: '0 25px 50px -12px rgba(224, 207, 94, 0.3)',
    tierName: 'Zakladateľ'
  }
};

// Typ a pole pre rotujúce varianty hero textov (ľahko rozširovateľné o. Dušanom)
interface HeroVariant {
  headline: React.ReactNode;
  subline: React.ReactNode;
}

const HERO_VARIANTS: HeroVariant[] = [
  {
    headline: (
      <>
        Budúcnosť živej viery <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-bright to-white font-extrabold">
          začína tvojím krokom.
        </span>
      </>
    ),
    subline: (
      <>
        Malý, no vytrvalý dar jedného človeka. Keď sa spojí s tisíckami ďalších, <br className="hidden md:inline" />
        vzniká stabilné zázemie pre pastoračnú a duchovnú budúcnosť našej diecézy.
      </>
    )
  },
  {
    headline: (
      <>
        Krok viery, ktorý premení <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-bright to-white font-extrabold">
          neistú budúcnosť na spoločné dielo.
        </span>
      </>
    ),
    subline: (
      <>
        Jeden krok sám nezájde ďaleko. Tisíc krokov spolu unesie <br className="hidden md:inline" />
        celú diecézu — jej pastoráciu, jej charitu, jej budúcnosť.
      </>
    )
  }
];

// ==========================================
// 2. POMOCNÉ KOMPONENTY
// ==========================================

// Animovaný čítač čísiel zo 0 pri vstupe do viewportu
function CountUpNumber({ value, suffix = "", duration = 1.5 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    if (prefersReducedMotion) {
      setCount(value);
      return;
    }

    let start = 0;
    const end = value;
    if (start === end) return;

    const totalMiliseconds = duration * 1000;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 15);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [isInView, value, duration, prefersReducedMotion]);

  return (
    <span ref={ref} className="tabular-nums font-extrabold">
      {count.toLocaleString('sk-SK')}{suffix}
    </span>
  );
}

// Sparkle časticový efekt pre prémiový dojem
function BackgroundSparkles() {
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || prefersReducedMotion) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-gold-bright rounded-full opacity-30"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            scale: [0, 1.2, 0],
            opacity: [0, 0.6, 0],
            y: [0, -50 - Math.random() * 50]
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
}

// ==========================================
// 3. HLAVNÝ KOMPONENT LANDING PAGE
// ==========================================

export default function KrokLandingPage() {
  // Stav pre darovací formulár
  const [mounted, setMounted] = useState(false);
  const [isMonthly, setIsMonthly] = useState(true);
  const [selectedTier, setSelectedTier] = useState<number | 'custom'>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donorName, setDonorName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedIBAN, setCopiedIBAN] = useState(false);

  // Stav pre rotujúci hero text (Variant 0 je predvolený pre SSR/SEO)
  const [heroIndex, setHeroIndex] = useState(0);

  // Dynamické štatistiky z databázy
  const [donorsCount, setDonorsCount] = useState<number>(PLACEHOLDER_DONORS_COUNT);
  const [totalAmount, setTotalAmount] = useState<number>(PLACEHOLDER_TOTAL_AMOUNT);
  const [projectsCount, setProjectsCount] = useState<number>(PLACEHOLDER_PROJECTS_COUNT);

  useEffect(() => {
    setMounted(true);

    // Načítanie dynamických štatistík z databázy
    async function loadStats() {
      try {
        const stats = await getPublicStats();
        if (stats.donorsCount > 0 || stats.totalAmount > 0 || stats.projectsCount > 0) {
          setDonorsCount(stats.donorsCount);
          setTotalAmount(stats.totalAmount);
          setProjectsCount(stats.projectsCount);
        }
      } catch (err) {
        console.error('Error loading public stats:', err);
      }
    }
    loadStats();

    // Získanie posledného zobrazeného indexu zo sessionStorage (len na klientovi)
    let lastIndex: number | null = null;
    try {
      const stored = sessionStorage.getItem('krok_hero_last_index');
      if (stored !== null) {
        lastIndex = parseInt(stored, 10);
      }
    } catch (e) {
      // Ignorovanie prípadných chýb prístupu k storage
    }

    let nextIndex = 0;
    const totalVariants = HERO_VARIANTS.length;

    if (totalVariants > 1) {
      if (lastIndex !== null && lastIndex >= 0 && lastIndex < totalVariants) {
        // Vylúčenie predošlého indexu z možných kandidátov
        const candidates = Array.from({ length: totalVariants }, (_, i) => i)
          .filter(i => i !== lastIndex);
        const randomIndex = Math.floor(Math.random() * candidates.length);
        nextIndex = candidates[randomIndex];
      } else {
        // Ak nemáme históriu, zvolíme náhodný index
        nextIndex = Math.floor(Math.random() * totalVariants);
      }
    }

    // Uloženie nového indexu pre budúci refresh
    try {
      sessionStorage.setItem('krok_hero_last_index', String(nextIndex));
    } catch (e) {
      // Tiché zlyhanie pri blokovanom storage
    }

    setHeroIndex(nextIndex);
  }, []);

  // Získanie výšky daru
  const currentAmount = selectedTier === 'custom' ? (Number(customAmount) || 0) : selectedTier;

  // Odhadovaný príspevok na kartu
  const cardAmountDisplay = currentAmount > 0 ? `${currentAmount} €` : "0 €";

  // Určenie darovacej triedy pre prémiovú kartu
  // Bronzová: < 10€, Strieborná: 10€ - 19€, Zlatá: >= 20€
  let tierGrade: 'bronze' | 'silver' | 'gold' = 'bronze';
  let tierTitle = "Bronzová rodina";
  if (currentAmount >= 20) {
    tierGrade = 'gold';
    tierTitle = 'Zlatá rodina KROK';
  } else if (currentAmount >= 10) {
    tierGrade = 'silver';
    tierTitle = 'Strieborná rodina KROK';
  } else {
    tierTitle = 'Rodina KROK';
  }

  // Animácie pre prefers-reduced-motion
  const prefersReducedMotion = useReducedMotion();

  // Scroll tracking pre celú stránku (napr. na vrchný indikátor čítania)
  const { scrollYProgress } = useScroll();

  // Prepojenie pre sekciu 3: Mechanizmus (spájanie bodov)
  const mechanismRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: mechScroll } = useScroll({
    target: mechanismRef,
    offset: ["start end", "end start"]
  });

  // Animácia stredového bodu a pritekajúcich elementov v mechanizme
  const scaleMech = useTransform(mechScroll, [0.1, 0.5], prefersReducedMotion ? [1, 1] : [0.6, 1.25]);
  const rotateMech = useTransform(mechScroll, [0.1, 0.9], prefersReducedMotion ? [0, 0] : [0, 360]);

  // Prepojenie pre sekciu 4: Dôkaz (Lectio Divina scrollytelling)
  const proofRef = useRef<HTMLDivElement>(null);
  const [activeStoryPart, setActiveStoryPart] = useState(0);

  // Sledovanie prechodu jednotlivých častí príbehu
  const part1Ref = useRef<HTMLDivElement>(null);
  const part2Ref = useRef<HTMLDivElement>(null);
  const part3Ref = useRef<HTMLDivElement>(null);

  const part1InView = useInView(part1Ref, { amount: 0.5 });
  const part2InView = useInView(part2Ref, { amount: 0.5 });
  const part3InView = useInView(part3Ref, { amount: 0.5 });

  useEffect(() => {
    if (part3InView) setActiveStoryPart(2);
    else if (part2InView) setActiveStoryPart(1);
    else if (part1InView) setActiveStoryPart(0);
  }, [part1InView, part2InView, part3InView]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIBAN(true);
    setTimeout(() => setCopiedIBAN(false), 2000);
  };

  return (
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep text-white font-sans selection:bg-gold-bright/35 selection:text-white">
      
      {/* Filmové zrno pre hmatateľný retro/sakrálny efekt */}
      <div className="grain" />
      
      {/* Scroll indicator na vrchu stránky */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue via-gold to-vermilion z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* =========================================================================
          SEKCIA 1: HOOK (Full-screen úvod)
          ========================================================================= */}
      <section className="relative h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Kontemplatívne pozadie - temný nočný prechod s jemnou hmlou */}
        <div className="absolute inset-0 bg-radial-[at_center_bottom] from-blue/35 via-blue-deep to-blue-deep z-0" />
        
        {/* Dekoratívny svetelný kruh v pozadí imitujúci ranné zore / večnú sviecu */}
        <motion.div 
          className="absolute bottom-[-10%] w-[80vw] h-[50vh] rounded-full bg-gold/10 blur-[120px] pointer-events-none z-0"
          animate={prefersReducedMotion ? {} : {
            scale: [1, 1.08, 1],
            opacity: [0.3, 0.45, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <BackgroundSparkles />

        {/* Hlavný textový moment */}
        <div className="relative z-10 text-center max-w-4xl px-4 flex flex-col items-center">
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="mb-8"
          >
            <span className="px-4 py-1.5 rounded-full border border-gold/25 bg-gold/5 text-gold-bright text-xs tracking-widest uppercase font-extrabold">
              Veľká rodina malých darcov
            </span>
          </motion.div>

          {/* Stabilný výškový kontajner pre zamedzenie akéhokoľvek posunu layoutu (layout shift) */}
          <div className="min-h-[350px] sm:min-h-[280px] md:min-h-[320px] lg:min-h-[360px] flex flex-col justify-center items-center w-full">
            <motion.h1 
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 0.2, ease: "easeOut" }}
              className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-tight mb-6"
            >
              {HERO_VARIANTS[heroIndex].headline}
            </motion.h1>

            <motion.p
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.6, delay: 0.6 }}
              className="text-zinc-300 text-base md:text-lg max-w-2xl leading-relaxed mb-0 font-light text-center"
            >
              {HERO_VARIANTS[heroIndex].subline}
            </motion.p>
          </div>

          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <a 
              href="#dar" 
              className="px-8 py-4 bg-gradient-to-r from-blue to-blue-deep hover:from-blue hover:to-blue/90 text-white rounded-xl text-lg font-extrabold shadow-2xl hover:shadow-blue/50 transition-all flex items-center justify-center gap-3 group border border-white/10"
            >
              Urobiť prvý krok <ArrowRight className="group-hover:translate-x-1.5 transition-transform" size={20} />
            </a>
            <a 
              href="#problem" 
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-lg font-bold transition-all flex items-center justify-center border border-white/10"
            >
              Spoznať víziu
            </a>
          </motion.div>
        </div>

        {/* Pulzujúci scroll indikátor na spodku */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-10"
          animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-zinc-500 text-xs tracking-widest uppercase font-extrabold">Posuňte sa nižšie</span>
          <div className="w-6 h-10 rounded-full border border-zinc-700 flex justify-center p-1.5">
            <motion.div 
              className="w-1.5 h-1.5 bg-gold-bright rounded-full"
              animate={prefersReducedMotion ? {} : { y: [0, 16, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </section>

      {/* =========================================================================
          SEKCIA 2: PROBLÉM (Pomenovanie existenčného napätia)
          ========================================================================= */}
      <section id="problem" className="relative py-28 md:py-36 bg-blue-deep border-t border-white/5 overflow-hidden">
        {/* Pozadie */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red/5 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Ľavý stĺpec: Napätie, myšlienka a realita */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-3 text-gold kicker uppercase tracking-widest text-xs font-extrabold mb-2">
                <span className="w-8 h-[2px] bg-gold rounded-full" />
                <span>Existenčná výzva</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white leading-tight">
                Prečo Žilinská diecéza <br className="hidden md:inline" />
                potrebuje vlastný fond?
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-blue to-gold rounded-full" />
              
              <p className="text-zinc-300 text-lg leading-relaxed pt-2">
                Mnohé z našich pastoračných aktivít čelia vážnej neistote. Fond KROK bol zriadený ako forma získavania <strong className="text-gold">existenčne potrebných finančných prostriedkov</strong> pre dlhodobú a udržateľnú budúcnosť diecézy.
              </p>
              
              {/* Citát zo zriaďovacej listiny */}
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 border-l-gold border-l-4">
                <p className="text-zinc-200 italic font-light leading-relaxed">
                  „KROK je Pastoračný fond Žilinskej diecézy zriadený 1. augusta 2019. Jeho poslaním je podpora pastoračných aktivít na farskej, dekanátnej a diecéznej úrovni v synodálnom duchu.“
                </p>
                <div className="mt-3 text-sm text-zinc-400 uppercase tracking-widest font-extrabold">— Zo zriaďovacej listiny</div>
              </div>
            </div>

            {/* Pravý stĺpec: 3 piliere napätia / zraniteľnosti */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 lg:pt-0">
              
              {/* Pilier 1: Izolovanosť */}
              <motion.div 
                whileHover={prefersReducedMotion ? {} : { y: -6 }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-8 transition-all flex flex-col justify-between h-72"
              >
                <div>
                  <div className="w-12 h-12 bg-red/15 text-red rounded-xl flex items-center justify-center border border-red/20 mb-6 text-xl font-extrabold">I</div>
                  <h3 className="text-xl font-extrabold text-white mb-2">Izolovanosť</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Mnoho miestnych spoločenstiev, škôl či charitatívnych diel bojuje s materiálnym nedostatkom osamote. Chýba koordinované, spoločné krytie chrbta.
                  </p>
                </div>
                <div className="text-xs text-red font-mono tracking-widest uppercase mt-4">Vážne riziko</div>
              </motion.div>

              {/* Pilier 2: Neistá budúcnosť */}
              <motion.div 
                whileHover={prefersReducedMotion ? {} : { y: -6 }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-8 transition-all flex flex-col justify-between h-72"
              >
                <div>
                  <div className="w-12 h-12 bg-gold/15 text-gold rounded-xl flex items-center justify-center border border-gold/20 mb-6 text-xl font-extrabold">N</div>
                  <h3 className="text-xl font-extrabold text-white mb-2">Neistá budúcnosť</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Pastoračné a evanjelizačné projekty nemôžu existovať zo dňa na deň. Bez stabilnej rezervy je ohrozená kontinuita formácie detí, mladých aj rodín.
                  </p>
                </div>
                <div className="text-xs text-gold font-mono tracking-widest uppercase mt-4">Kľúčový nedostatok</div>
              </motion.div>

              {/* Pilier 3: Závislosť */}
              <motion.div 
                whileHover={prefersReducedMotion ? {} : { y: -6 }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-8 transition-all flex flex-col justify-between h-72 md:col-span-2"
              >
                <div>
                  <div className="w-12 h-12 bg-blue/15 text-blue rounded-xl flex items-center justify-center border border-blue/20 mb-6 text-xl font-extrabold">Z</div>
                  <h3 className="text-xl font-extrabold text-white mb-2">Závislosť na nestabilných zdrojoch</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Spoliehanie sa výhradne na štátne príspevky alebo náhodné milodary robí strategické pastoračné diela zraniteľnými. Potrebujeme spoločne vybudovať nezávislú oporu postavenú priamo na ľuďoch.
                  </p>
                </div>
                <div className="text-xs text-blue font-mono tracking-widest uppercase mt-4">Hlavná zraniteľnosť</div>
              </motion.div>

            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SEKCIA 3: MECHANIZMUS (Sila spoločenstva, animované počítadlá a spájanie)
          ========================================================================= */}
      <section ref={mechanismRef} className="relative py-28 md:py-36 bg-white/5 border-t border-white/5 overflow-hidden">
        
        {/* Vizuál mechanizmu skladania malého daru do veľkého diela */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none flex items-center justify-center">
          <motion.div 
            style={{ scale: scaleMech, rotate: rotateMech }}
            className="relative w-[500px] h-[500px] border border-blue/10 rounded-full flex items-center justify-center"
          >
            {/* Pritekajúce body (Malé dary) */}
            {mounted && [...Array(6)].map((_, idx) => {
              const angle = (idx * 60) * (Math.PI / 180);
              const x = Math.round(Math.cos(angle) * 200);
              const y = Math.round(Math.sin(angle) * 200);
              return (
                <motion.div
                  key={idx}
                  className="absolute w-3 h-3 bg-gold-bright rounded-full blur-[2px] shadow-lg shadow-gold"
                  style={{ x, y }}
                  animate={prefersReducedMotion ? {} : {
                    scale: [0.8, 1.3, 0.8],
                    x: [x, x * 0.1, x],
                    y: [y, y * 0.1, y],
                  }}
                  transition={{
                    duration: 5 + idx,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              );
            })}
            
            {/* Prepojovacie tenké línie */}
            <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 500 500">
              <line x1="250" y1="250" x2="50" y2="250" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="250" y1="250" x2="450" y2="250" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="250" y1="250" x2="250" y2="50" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="250" y1="250" x2="250" y2="450" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
          </motion.div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 text-gold kicker uppercase tracking-widest text-xs font-extrabold mb-4">
            <span className="w-8 h-[2px] bg-gold rounded-full" />
            <span>Princíp fondu</span>
            <span className="w-8 h-[2px] bg-gold rounded-full" />
          </div>
          <h2 className="text-3xl md:text-5xl font-light text-white max-w-3xl mx-auto leading-tight mb-8">
            Veľa malých krokov tvorí <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue to-gold font-extrabold">
              jeden veľký spoločný výsledok
            </span>
          </h2>
          <p className="text-zinc-300 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Pravidelná podpora vo výške 5 alebo 10 eur mesačne od jedného človeka nezmení všetko. <br className="hidden md:inline" />
            Keď sa však takýchto ľudí spojí celá diecéza, vytvoríme silu, ktorá zmení budúcnosť celej generácie.
          </p>

          {/* Mriežka 60 bodiek (darcov) z predlohy */}
          <div className="flex flex-wrap gap-2.5 max-w-2xl mx-auto justify-center mb-4">
            {Array.from({ length: 60 }).map((_, i) => {
              const DOTS_PALETTE = ['bg-blue', 'bg-blue', 'bg-blue', 'bg-gold', 'bg-blue', 'bg-red'];
              const colorClass = DOTS_PALETTE[i % DOTS_PALETTE.length];
              const delay = (i % 30) * 0.018;
              return (
                <motion.span
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 0.9 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                     type: "spring",
                     stiffness: 120,
                     damping: 12,
                     delay: delay
                  }}
                  className={`h-3 w-3 rounded-full ${colorClass} shadow-sm`}
                />
              );
            })}
          </div>
          <p className="text-zinc-450 text-xs tracking-wider uppercase font-mono max-w-md mx-auto mb-16 leading-relaxed">
            Každá bodka je jeden darca. Spoločne tvoria silu, ktorá unesie aj tie najväčšie pastoračné diela.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto">
            
            {/* Počítadlo 1: Počet darcov */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm relative group hover:border-white/20 transition-all">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-blue-deep text-blue rounded-full border border-white/10 flex items-center justify-center">
                <Users size={22} />
              </div>
              <div className="text-xl md:text-2xl lg:text-3xl font-extrabold text-zinc-300 font-mono tracking-wide mb-3 bg-white/5 py-2.5 px-4 rounded-xl border border-white/5 text-center select-all">
                {mounted ? <CountUpNumber value={donorsCount} /> : donorsCount}
              </div>
              <p className="text-zinc-200 font-extrabold text-sm tracking-wide uppercase mb-1">Darcov v rodine</p>
              <p className="text-zinc-500 text-xs">
                Aktívni pravidelní prispievatelia
              </p>
              {/* Poznámka pre Supabase napojenie */}
              <span className="sr-only">/* Supabase: SELECT count(*) FROM donors WHERE status = active */</span>
            </div>

            {/* Počítadlo 2: Celková suma */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 backdrop-blur-sm relative group hover:border-white/20 transition-all shadow-xl">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-blue-deep text-gold rounded-full border border-white/10 flex items-center justify-center">
                <Gift size={22} />
              </div>
              <div className="text-xl md:text-2xl lg:text-3xl font-extrabold text-gold font-mono tracking-wide mb-3 bg-white/5 py-2.5 px-4 rounded-xl border border-white/5 text-center select-all">
                {mounted ? <CountUpNumber value={totalAmount} suffix=" €" /> : `${totalAmount.toLocaleString('sk-SK')} €`}
              </div>
              <p className="text-gold font-extrabold text-sm tracking-wide uppercase mb-1">Vyzbieraná suma</p>
              <p className="text-zinc-500 text-xs">
                Transparentne spravované prostriedky
              </p>
              {/* Poznámka pre Supabase napojenie */}
              <span className="sr-only">/* Supabase: SELECT sum(amount) FROM donations */</span>
            </div>

            {/* Počítadlo 3: Podporené projekty */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm relative group hover:border-white/20 transition-all">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-blue-deep text-emerald-400 rounded-full border border-white/10 flex items-center justify-center">
                <TrendingUp size={22} />
              </div>
              <div className="text-xl md:text-2xl lg:text-3xl font-extrabold text-zinc-300 font-mono tracking-wide mb-3 bg-white/5 py-2.5 px-4 rounded-xl border border-white/5 text-center select-all">
                {mounted ? <CountUpNumber value={projectsCount} /> : projectsCount}
              </div>
              <p className="text-zinc-200 font-extrabold text-sm tracking-wide uppercase mb-1">Podporených projektov</p>
              <p className="text-zinc-500 text-xs">
                Farnosti, animátori, charita, vzdelávanie
              </p>
              {/* Poznámka pre Supabase napojenie */}
              <span className="sr-only">/* Supabase: SELECT count(*) FROM projects WHERE status = approved */</span>
            </div>

          </div>

          {/* Tri piliere pastoračného fondu (Akronym KROK) */}
          <div className="mt-24 pt-8 border-t border-white/5 max-w-5xl mx-auto">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-extrabold mb-8">Hodnoty skryté v mene</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
              {[
                { letter: "K", name: "Kreativita", desc: "Nové pastoračné nápady a inovatívne prístupy." },
                { letter: "R", name: "Radosť", desc: "Zdieľanie evanjelia so svetom so živou radosťou." },
                { letter: "O", name: "Odvaha", desc: "Nebáť sa nových výziev a prekonávania prekážok." },
                { letter: "K", name: "Krása", desc: "Návrat k liturgickej hĺbke, kultúre a estetike." }
              ].map((item, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-3xl font-extrabold text-gold block mb-1">{item.letter}</span>
                  <div className="text-white font-extrabold text-base mb-1">{item.name}</div>
                  <p className="text-zinc-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          SEKCIA 4: DÔKAZ (Lectio Divina - split-screen scrollytelling)
          ========================================================================= */}
      <section id="dokaz" ref={proofRef} className="relative py-28 md:py-36 bg-blue-deep border-t border-white/5">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 text-gold kicker uppercase tracking-widest text-xs font-extrabold mb-3">
              <span className="w-8 h-[2px] bg-gold rounded-full" />
              <span>KROK v praxi</span>
              <span className="w-8 h-[2px] bg-gold rounded-full" />
            </div>
            <h2 className="text-3xl md:text-5xl font-light text-white">
              Konkrétny príbeh podpory
            </h2>
            <p className="text-zinc-300 text-base md:text-lg mt-4 leading-relaxed font-light">
              Pozrite sa, ako Vaša podpora pomáha premieňať duchovný život v našich farnostiach na príklade projektu systematického rozjímania nad Božím slovom.
            </p>
          </div>

          {/* Scrollytelling sekcia: Sticky panel vľavo, scrollovateľný text vpravo */}
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* ĽAVÝ PANEL: Sticky vizuál a stav zbierky */}
            <div className="lg:col-span-6 lg:sticky lg:top-32 space-y-8">
              
              <div className="relative aspect-video lg:aspect-square bg-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-2xl p-8 flex flex-col justify-between">
                
                {/* Dynamické pozadie panelu pre jednotlivé kroky */}
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                  {activeStoryPart === 0 && (
                    <div className="absolute inset-0 bg-radial-[at_center] from-red/30 via-transparent to-transparent" />
                  )}
                  {activeStoryPart === 1 && (
                    <div className="absolute inset-0 bg-radial-[at_center] from-blue/30 via-transparent to-transparent" />
                  )}
                  {activeStoryPart === 2 && (
                    <div className="absolute inset-0 bg-radial-[at_center] from-gold/30 via-transparent to-transparent" />
                  )}
                </div>

                {/* Indikátor aktívneho kroku */}
                <div className="flex justify-between items-center z-10">
                  <div className="text-zinc-500 text-xs font-mono tracking-widest uppercase font-extrabold">Projekt KROK</div>
                  <div className="px-3 py-1 rounded-full bg-white/10 text-zinc-200 text-xs font-extrabold">
                    {activeStoryPart + 1} / 3 fázy
                  </div>
                </div>

                {/* Vizuál (Placeholder s popisom podľa zadania) */}
                <div className="my-auto text-center py-6 z-10 relative">
                  
                  <AnimatePresence mode="wait">
                    {activeStoryPart === 0 && (
                      <motion.div
                        key="hladanie"
                        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-4"
                      >
                        <div className="w-20 h-20 bg-white/5 text-red rounded-2xl flex items-center justify-center mx-auto border border-red/20 shadow-lg">
                          <Compass size={38} className="animate-pulse" />
                        </div>
                        <h4 className="text-2xl font-extrabold text-white">1. Hľadanie v hluku</h4>
                        <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
                          [Placeholder Vizuál: Čiernobiela, atmosférická fotografia detailu unaveného človeka kráčajúceho rušnou mestskou ulicou, symbolizujúca preťaženosť informáciami a túžbu po tichu.]
                        </p>
                      </motion.div>
                    )}

                    {activeStoryPart === 1 && (
                      <motion.div
                        key="stisenie"
                        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-4"
                      >
                        <div className="w-20 h-20 bg-white/5 text-blue rounded-2xl flex items-center justify-center mx-auto border border-blue/20 shadow-lg">
                          <BookOpen size={38} />
                        </div>
                        <h4 className="text-2xl text-blue-300 font-extrabold">2. Sila Božieho slova</h4>
                        <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
                          [Placeholder Vizuál: Kontemplatívny záber zhora v šere kostola, sviečka osvetľujúca otvorenú knihu Svätého Písma a siluety mladých ľudí v sústredenej modlitbe.]
                        </p>
                      </motion.div>
                    )}

                    {activeStoryPart === 2 && (
                      <motion.div
                        key="premena"
                        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-4"
                      >
                        <div className="w-20 h-20 bg-white/5 text-gold rounded-2xl flex items-center justify-center mx-auto border border-gold/20 shadow-lg">
                          <Sparkles size={38} />
                        </div>
                        <h4 className="text-2xl text-gold-bright font-extrabold">3. Oživenie spoločenstva</h4>
                        <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
                          [Placeholder Vizuál: Svetlá, teplá fotografia skupinky ľudí sediacich v kruhu, ktorí sa spoločne usmievajú a živo debatujú pri šálke čaju v zrekonštruovanej farskej miestnosti.]
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                {/* Progress bar a stav cieľa na spodku */}
                <div className="z-10 bg-blue-deep/90 border border-white/10 p-5 rounded-2xl backdrop-blur-sm space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-200 font-extrabold tracking-wide uppercase">Lectio Divina</span>
                    <span className="text-gold-bright font-extrabold">
                      {LECTIO_DIVINA_CURRENT.toLocaleString('sk-SK')} € / {LECTIO_DIVINA_TARGET.toLocaleString('sk-SK')} € ({Math.round((LECTIO_DIVINA_CURRENT / LECTIO_DIVINA_TARGET) * 100)}%)
                    </span>
                  </div>
                  
                  {/* Animovaný progress bar */}
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-blue via-gold to-emerald-500 rounded-full"
                      initial={prefersReducedMotion ? { width: "70%" } : { width: "0%" }}
                      whileInView={{ width: `${(LECTIO_DIVINA_CURRENT / LECTIO_DIVINA_TARGET) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                    <span>Zostáva: {(LECTIO_DIVINA_TARGET - LECTIO_DIVINA_CURRENT).toLocaleString('sk-SK')} €</span>
                    <span>Duchovný rozvoj diecézy</span>
                  </div>
                </div>

              </div>
            </div>

            {/* PRAVÝ PANEL: Príbeh (detaily posúvajúce sa scrollom) */}
            <div className="lg:col-span-6 space-y-24 md:space-y-32 py-12 lg:py-24">
              
              {/* Časť 1: Hľadanie (Tension) */}
              <div 
                ref={part1Ref} 
                className={`transition-all duration-500 space-y-6 ${
                  activeStoryPart === 0 ? 'opacity-100 scale-100' : 'opacity-35 scale-95'
                }`}
              >
                <div className="inline-flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-red/10 text-red border border-red/20 flex items-center justify-center text-sm font-extrabold font-mono">1</span>
                  <span className="text-xs uppercase tracking-widest text-red font-mono font-extrabold">Predtým: Duchovný hlad</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                  Izolovanosť a neustály hluk sveta
                </h3>
                <p className="text-zinc-300 text-base md:text-lg leading-relaxed font-light">
                  Žijeme v prepojenej dobe, no predsa sa mnohí veriaci cítia hlboko sami. Tradičné formy pastorácie niekedy strácajú oslovujúcu silu. Mladí aj starší zažívajú preťaženie informáciami a hľadajú bezpečné, tiché útočisko, kde by mohli načerpať skutočnú silu.
                </p>
                <blockquote className="border-l-2 border-red/30 pl-4 py-1 text-sm text-zinc-500 italic">
                  [Placeholder Príbeh: Zástupný príbeh farníka alebo kňaza o stave, kedy ľudia prichádzajú do kostola mechanicky, ale vo všednom živote im chýba hlbšie osobné spojenie so Svätým Písmom a prežívanie spoločenstva.]
                </blockquote>
              </div>

              {/* Časť 2: Sila Svätého písma (Action) */}
              <div 
                ref={part2Ref} 
                className={`transition-all duration-500 space-y-6 ${
                  activeStoryPart === 1 ? 'opacity-100 scale-100' : 'opacity-35 scale-95'
                }`}
              >
                <div className="inline-flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-blue/15 text-blue border border-blue/20 flex items-center justify-center text-sm font-extrabold font-mono">2</span>
                  <span className="text-xs uppercase tracking-widest text-blue font-mono font-extrabold">Krok vpred: Založenie spoločenstva</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                  Otvorenie dverí skrze Božie Slovo
                </h3>
                <p className="text-zinc-300 text-base md:text-lg leading-relaxed font-light">
                  Vďaka pastoračnému fondu KROK sme mohli zakúpiť materiály, vyškoliť vedúcich skupiniek a pripraviť metodiku pre systematické rozjímanie Lectio Divina (modlitba Božím Slovom). Krok za krokom sa začali farníci schádzať k tichému čítaniu, hlbokému stíšeniu a zdieľaniu.
                </p>
                <blockquote className="border-l-2 border-blue/30 pl-4 py-1 text-sm text-zinc-500 italic">
                  [Placeholder Príbeh: Zástupný opis priebehu stretávania sa, ako ľudia spoločne čítajú nedeľné evanjelium, učia sa rozjímať v tichu a postupne odbúravajú bariéry ostychu pri rozhovoroch o osobnej viere.]
                </blockquote>
              </div>

              {/* Časť 3: Premena (Transformation) */}
              <div 
                ref={part3Ref} 
                className={`transition-all duration-500 space-y-6 ${
                  activeStoryPart === 2 ? 'opacity-100 scale-100' : 'opacity-35 scale-95'
                }`}
              >
                <div className="inline-flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gold/15 text-gold border border-gold/20 flex items-center justify-center text-sm font-extrabold font-mono">3</span>
                  <span className="text-xs uppercase tracking-widest text-gold font-mono font-extrabold">Potom: Živá cirkev</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                  Krása a radosť spoločného kráčania
                </h3>
                <p className="text-zinc-300 text-base md:text-lg leading-relaxed font-light">
                  Zmena je hmatateľná. Lektoráty a skupinky Lectio Divina prinášajo do spoločenstiev synodálneho ducha, kedy si ľudia navzájom lepšie rozumejú a aktívne sa zapájajú do diania vo farnostiach. Viera prestala byť len nedeľným rituálom, stala sa každodenným spoločne prežívaným dobrodružstvom.
                </p>
                <blockquote className="border-l-2 border-gold/30 pl-4 py-1 text-sm text-zinc-500 italic">
                  [Placeholder Príbeh: Zástupný príbeh reálnych prejavov – rodiny začali čítať Písmo doma pri večernej modlitbe, vzniklo trvalé priateľstvo medzi staršími farníkmi a zapojenou mládežou.]
                </blockquote>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          SEKCIA 5: POZVANIE (CTA a interaktívna platobná donorská karta)
          ========================================================================= */}
      <section id="dar" className="relative py-28 md:py-36 bg-white/5 border-t border-white/5 overflow-hidden">
        
        {/* Pozadie */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue/10 blur-[150px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-gold/5 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="flex items-center justify-center gap-3 text-gold kicker uppercase tracking-widest text-xs font-extrabold mb-3">
              <span className="w-8 h-[2px] bg-gold rounded-full" />
              <span>Pozvanie</span>
              <span className="w-8 h-[2px] bg-gold rounded-full" />
            </div>
            <h2 className="text-3xl md:text-5xl font-light text-white leading-tight">
              Vstúpte do Veľkej rodiny <br />
              malých darcov
            </h2>
            <p className="text-zinc-350 text-base md:text-lg mt-4 max-w-2xl mx-auto leading-relaxed font-light">
              Váš dar je investíciou do duchovného zdravia našej diecézy. Vyberte si úroveň zapojenia a staňte sa stabilným pilierom pastoračného fondu KROK.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
            
            {/* ĽAVÝ PANEL: Interaktívna donorská karta */}
            <div className="lg:col-span-6 flex flex-col items-center">
              
              <div className="w-full max-w-md">
                <span className="text-zinc-500 text-xs font-mono tracking-widest uppercase mb-3 block text-center lg:text-left font-extrabold">Ukážka Vašej digitálnej karty prispievateľa</span>
                
                {/* Dynamicky zafarbená metalická donorská karta */}
                <motion.div 
                  layout
                  className="w-full aspect-[1.586/1] rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden border border-white/10 transition-all duration-700"
                  style={{
                    background: CARD_STYLES[tierGrade].background,
                    color: CARD_STYLES[tierGrade].color,
                    boxShadow: CARD_STYLES[tierGrade].shadow
                  }}
                >
                  
                  {/* Odlesk na karte pre 3D kovový efekt */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/12 to-transparent pointer-events-none mix-blend-overlay" />

                  {/* Karta Hore: Logo a kategória */}
                  <div className="flex justify-between items-start z-10">
                    <div>
                      {/* Reálne biele logo KROK na donorskej karte */}
                      <Image
                        src="/logo/logo_w.webp"
                        alt="KROK"
                        width={38}
                        height={22}
                      />
                      <span className="text-[10px] tracking-widest uppercase opacity-75 font-semibold mt-1.5 block">
                        Pastoračný fond
                      </span>
                    </div>
                    
                    {/* Metalický čip karty */}
                    <div className="w-10 h-8 rounded-lg bg-gradient-to-br from-yellow-300 via-gold to-yellow-500 opacity-80 border border-gold/30 flex items-center justify-center">
                      <div className="w-6 h-5 border border-gold/20 rounded" />
                    </div>
                  </div>

                  {/* Karta Stred: Typ daru */}
                  <div className="my-auto z-10 pt-4">
                    <div className="text-lg md:text-xl font-extrabold tracking-wide">
                      {isMonthly ? 'Pravidelný prispievateľ' : 'Jednorazový podporovateľ'}
                    </div>
                    <div className="text-xs opacity-60 mt-1 font-mono tracking-widest uppercase">
                      {tierTitle}
                    </div>
                  </div>

                  {/* Karta Spodok: Meno a Hodnota daru (dedí metalickú farbu) */}
                  <div className="flex justify-between items-end z-10">
                    <div className="space-y-1">
                      <span className="text-[9px] tracking-widest uppercase opacity-50 block font-mono">Nositeľ karty</span>
                      <div className="text-sm tracking-wide font-medium truncate max-w-[200px] font-mono">
                        {donorName.trim() || 'Meno darcu'}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="text-[9px] tracking-widest uppercase opacity-50 block font-mono">Mesačný dar</span>
                      <div className="text-xl md:text-2xl font-extrabold tracking-tight">
                        {cardAmountDisplay}
                      </div>
                    </div>
                  </div>

                </motion.div>
                
                {/* Užitočné vysvetlenie prínosu zvoleného tieru */}
                <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-400 text-center">
                  {currentAmount === 0 ? (
                    "Vyberte si sumu nižšie, aby ste videli, ako Váš dar pomôže."
                  ) : currentAmount < 10 ? (
                    <span><strong>Bronzový krok:</strong> Váš príspevok {cardAmountDisplay} mesačne zabezpečí tlač metodických listov pre duchovné čítania.</span>
                  ) : currentAmount < 20 ? (
                    <span><strong>Strieborný krok:</strong> S {cardAmountDisplay} mesačne pokrývate nákup knižných materiálov a biblických textov pre celú farnosť.</span>
                  ) : (
                    <span><strong>Zlatý krok:</strong> Suma {cardAmountDisplay} mesačne plne zastrešuje formáciu a školenia lektorov pre novovznikajúce biblické spoločenstvá v dekanátoch.</span>
                  )}
                </div>

              </div>

            </div>

            {/* PRAVÝ PANEL: Platobný a darovací formulár */}
            <div className="lg:col-span-6 bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
              
              {/* Prepínač: Mesačne vs. Jednorazovo */}
              <div className="flex bg-blue-deep/60 p-1 rounded-xl border border-white/5 mb-8">
                <button
                  onClick={() => { setIsMonthly(true); if (selectedTier === 'custom') setSelectedTier(10); }}
                  className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition-all ${
                    isMonthly 
                      ? 'bg-blue text-white shadow-md' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Pravidelne (Mesačne)
                </button>
                <button
                  onClick={() => { setIsMonthly(false); }}
                  className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition-all ${
                    !isMonthly 
                      ? 'bg-blue text-white shadow-md' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Jednorazovo
                </button>
              </div>

              {/* Výber výšky daru (Tiers) */}
              <div className="space-y-4 mb-6">
                <label className="text-xs uppercase tracking-widest text-zinc-400 font-extrabold block">
                  Zvoľte výšku Vášho príspevku
                </label>
                
                <div className="grid grid-cols-3 gap-3">
                  {[5, 10, 20].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => { setSelectedTier(tier); setCustomAmount(''); }}
                      className={`py-4 rounded-xl text-lg font-extrabold border transition-all ${
                        selectedTier === tier
                          ? 'bg-gold/15 border-gold text-gold-bright shadow-lg shadow-gold/5'
                          : 'bg-blue-deep/80 border-white/5 hover:border-white/20 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tier} €
                    </button>
                  ))}
                </div>

                {/* Tlačidlo pre vlastnú sumu */}
                <button
                  onClick={() => setSelectedTier('custom')}
                  className={`w-full py-3.5 rounded-xl text-sm font-extrabold border transition-all ${
                    selectedTier === 'custom'
                      ? 'bg-gold/15 border-gold text-gold-bright'
                      : 'bg-blue-deep/80 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  Zadať vlastnú sumu
                </button>

                {/* Input pre vlastnú sumu */}
                <AnimatePresence>
                  {selectedTier === 'custom' && (
                    <motion.div
                      initial={prefersReducedMotion ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={prefersReducedMotion ? { opacity: 0, height: 0 } : { opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative mt-2">
                        <input
                          type="number"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder="Zadajte ľubovoľnú sumu"
                          className="w-full bg-blue-deep border border-white/10 focus:border-gold-bright focus:ring-1 focus:ring-gold-bright rounded-xl py-3 px-4 text-white text-base outline-none pr-12 font-mono"
                          min="1"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-extrabold">€</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Personalizácia: Meno na kartu */}
              <div className="space-y-2 mb-8">
                <div className="flex justify-between items-center">
                  <label htmlFor="name-input" className="text-xs uppercase tracking-widest text-zinc-400 font-extrabold">
                    Vaše meno na karte (nepovinné)
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">Doplní sa v reálnom čase</span>
                </div>
                <input
                  id="name-input"
                  type="text"
                  maxLength={25}
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="napr. Jozef Kováč"
                  className="w-full bg-blue-deep border border-white/10 focus:border-blue rounded-xl py-3.5 px-4 text-white text-sm outline-none transition-colors"
                />
              </div>

              {/* Hlavné tlačidlo "Darovať" */}
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={currentAmount <= 0}
                className="w-full py-4.5 bg-gradient-to-r from-gold via-gold-bright to-gold hover:from-gold hover:to-gold-bright text-blue-deep font-extrabold text-lg rounded-2xl shadow-xl hover:shadow-gold/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-gold/20"
              >
                <Heart size={20} className="fill-current" />
                Darovať {cardAmountDisplay} {isMonthly && '/ mesačne'}
              </button>

              {/* Sekundárne alternatívy pod formulárom */}
              <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                
                {/* Možnosť 1: 2% z dane */}
                <button 
                  onClick={() => {
                    alert("Informácie k darovaniu 2% z Vašej dane z príjmu. Údaje priebežného prijímateľa: Pastoračný fond KROK, Žilinská diecéza.");
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all"
                >
                  <div className="w-10 h-10 bg-blue-deep text-zinc-400 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <span className="text-xs text-white font-extrabold block">Pravidelný donorský program</span>
                    <span className="text-[10px] text-zinc-500 block">Stiahnuť vyhlásenie</span>
                  </div>
                </button>

                {/* Možnosť 2: Iné formy podpory */}
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all"
                >
                  <div className="w-10 h-10 bg-blue-deep text-zinc-400 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <span className="text-xs text-white font-extrabold block">Bankový prevod / QR</span>
                    <span className="text-[10px] text-zinc-500 block">Zobraziť IBAN a kód</span>
                  </div>
                </button>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          MODÁLNE OKNO S INFORMÁCIAMI K PLATBE
          ========================================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Overlay s blur efektom */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-blue-deep/90 backdrop-blur-sm"
            />

            {/* Samotné telo modálu */}
            <motion.div 
              initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-blue-deep border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl z-10"
            >
              
              {/* Hlavička modálu */}
              <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Heart className="text-gold-bright fill-gold-bright" size={24} />
                  <h3 className="text-xl font-extrabold text-white">Ďakujeme za Váš KROK</h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Telo modálu */}
              <div className="p-6 space-y-6">
                
                <p className="text-zinc-300 text-sm leading-relaxed font-light">
                  Ste krôčik od vstupu do našej rodiny darcov. Akceptujeme bezpečné platby kartou (placeholder v ostrej prevádzke), alebo môžete platbu zrealizovať priamo cez Váš internet banking pomocou platobných údajov nižšie:
                </p>

                {/* Zobrazenie platobnej sumy */}
                <div className="p-4 rounded-2xl bg-white/5 text-center border border-white/10 space-y-1">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono font-extrabold">Suma k úhrade</div>
                  <div className="text-3xl font-extrabold text-white">
                    {cardAmountDisplay} {isMonthly && '/ mesačne'}
                  </div>
                </div>

                {/* Prevodné údaje */}
                <div className="space-y-4">
                  
                  {/* IBAN */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500 font-mono">Číslo účtu (IBAN)</span>
                      <button 
                        onClick={() => copyToClipboard("SK1209000000003456789012")}
                        className="text-xs text-gold-bright hover:text-gold flex items-center gap-1.5 font-medium"
                      >
                        <Copy size={12} />
                        {copiedIBAN ? 'Skopírované!' : 'Kopírovať'}
                      </button>
                    </div>
                    <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-white select-all">
                      SK12 0900 0000 0034 5678 9012
                    </div>
                  </div>

                  {/* Ostatné údaje */}
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Variabilný symbol */}
                    <div>
                      <span className="text-xs text-zinc-500 font-mono block mb-1">Variabilný symbol</span>
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-zinc-300">
                        {isMonthly ? '20190801' : '19082019'}
                      </div>
                    </div>

                    {/* Konštantný symbol */}
                    <div>
                      <span className="text-xs text-zinc-500 font-mono block mb-1">Konštantný symbol</span>
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-zinc-300">
                        0558
                      </div>
                    </div>

                  </div>

                </div>

                {/* QR kód (Placeholder) */}
                <div className="pt-2 flex flex-col items-center justify-center space-y-3">
                  <div className="relative w-36 h-36 bg-white p-2 rounded-2xl border border-zinc-800 flex items-center justify-center">
                    {/* QR code mock icon */}
                    <QrCode size={110} className="text-zinc-900" />
                    {/* Tiny watermark logotypu v strede QR kódu */}
                    <div className="absolute w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-zinc-200 overflow-hidden p-1">
                      <Image
                        src="/logo/logo_c.webp"
                        alt="KROK"
                        width={28}
                        height={28}
                        className="w-auto h-full object-contain"
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-white font-bold block">Naskenujte v bankovej aplikácii</span>
                    <span className="text-[10px] text-zinc-500">QR kód automaticky nastaví platbu a sumu</span>
                  </div>
                </div>

              </div>

              {/* Päta modálu */}
              <div className="p-6 bg-white/5 border-t border-white/10 flex justify-between items-center text-xs text-zinc-500">
                <span>Platba je bezpečná a transparentná</span>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white/10 text-zinc-300 font-bold rounded-xl border border-white/10 hover:bg-white/20 hover:text-white"
                >
                  Rozumiem, hotovo
                </button>
              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
