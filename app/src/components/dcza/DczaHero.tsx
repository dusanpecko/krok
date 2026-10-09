'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Church, HandHeart } from 'lucide-react'

/** Úvodné hero webu diecézy – rovnaká stavba ako hero na mojkrok.sk (O71). */

function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}
const SPARKLES = Array.from({ length: 15 }, (_, i) => ({
  top: seeded(i, 1) * 100,
  left: seeded(i, 2) * 100,
  y: -50 - seeded(i, 3) * 50,
  duration: 4 + seeded(i, 4) * 4,
  delay: seeded(i, 5) * 5,
}))
const subscribeNoop = () => () => {}
const useIsClient = () => useSyncExternalStore(subscribeNoop, () => true, () => false)

function Sparkles() {
  const isClient = useIsClient()
  const reduced = useReducedMotion()
  if (!isClient || reduced) return null
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {SPARKLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-gold rounded-full opacity-50"
          style={{ top: `${p.top}%`, left: `${p.left}%` }}
          animate={{ scale: [0, 1.2, 0], opacity: [0, 0.6, 0], y: [0, p.y] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

export default function DczaHero({ parishes, deaneries, priests }: { parishes: number; deaneries: number; priests: number }) {
  const reduced = useReducedMotion()
  return (
    <section className="relative min-h-[calc(100svh-5rem)] md:min-h-[calc(100svh-7.25rem)] flex flex-col items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-radial-[at_center_bottom] from-blue-soft via-paper-warm to-paper-warm" />
      <motion.div
        className="absolute bottom-[-10%] w-[80vw] h-[50vh] rounded-full bg-gold/10 blur-[120px] pointer-events-none"
        animate={reduced ? {} : { scale: [1, 1.08, 1], opacity: [0.3, 0.45, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Sparkles />

      <div className="relative z-10 text-center max-w-4xl px-4 pt-10 pb-16 sm:pb-28 flex flex-col items-center">
        <motion.div initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }} className="mb-6">
          <Image src="/dcza/erb-240.png" alt="Erb Žilinskej diecézy" width={82} height={96} priority />
        </motion.div>
        <motion.div initial={reduced ? { opacity: 1 } : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: 'easeOut' }} className="mb-8">
          <span className="px-4 py-1.5 rounded-full border border-gold/25 bg-gold/5 text-blue text-xs tracking-widest uppercase font-extrabold">Rímskokatolícka cirkev</span>
        </motion.div>
        <motion.h1
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
          className="text-4xl md:text-5xl lg:text-6xl font-light text-ink leading-tight mb-6"
        >
          Žilinská diecéza <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue via-blue via-60% to-gold-ink font-extrabold">
            spoločenstvo viery, <span className="whitespace-nowrap">nádeje a lásky</span>
          </span>
        </motion.h1>
        <motion.p
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, delay: 0.6 }}
          className="text-ink/80 text-base md:text-lg max-w-2xl leading-relaxed font-light mb-10"
        >
          {parishes} farností v {deaneries} dekanátoch a {priests} kňazov v službe – na Kysuciach, Považí, v Turci aj v okolí Žiliny.
        </motion.p>
        <motion.div initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: 0.8 }} className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/farnosti"
            className="px-8 py-4 bg-gradient-to-r from-blue to-blue-deep hover:from-blue hover:to-blue/90 text-white rounded-xl text-lg font-extrabold shadow-2xl hover:shadow-blue/30 transition-all flex items-center justify-center gap-3 group border border-blue/10"
          >
            <Church size={20} /> Nájsť svoju farnosť <ArrowRight className="group-hover:translate-x-1.5 transition-transform" size={20} />
          </Link>
          <a href="https://mojkrok.sk" className="px-8 py-4 bg-white hover:bg-blue-soft/50 text-ink/80 rounded-xl text-lg font-bold transition-all flex items-center justify-center gap-2 border border-blue/10">
            <HandHeart size={20} className="text-gold-ink" /> Podporiť diecézu
          </a>
        </motion.div>
      </div>

      <motion.div
        className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-2 pointer-events-none z-10"
        animate={reduced ? {} : { y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-mute text-xs tracking-widest uppercase font-extrabold">Posuňte sa nižšie</span>
        <div className="w-6 h-10 rounded-full border border-mute/40 flex justify-center p-1.5">
          <motion.div className="w-1.5 h-1.5 bg-gold rounded-full" animate={reduced ? {} : { y: [0, 16, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
      </motion.div>
    </section>
  )
}
