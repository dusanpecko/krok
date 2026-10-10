'use client'

import { motion, useScroll } from 'framer-motion'

/** Tenký farebný pás navrchu okna, ktorý rastie s tým, ako sa stránka skroluje (úvod mojkrok.sk, dcza.sk, farnosti). */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue via-gold to-vermilion z-[60] origin-left pointer-events-none"
      style={{ scaleX: scrollYProgress }}
    />
  )
}
