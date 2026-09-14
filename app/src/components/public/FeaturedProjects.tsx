'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getFeaturedProjects } from '@/app/(public)/actions'
import ProjectCard, { type ProjectCardData } from './ProjectCard'

/**
 * Sekcia „Aktuálne výzvy“ na domovskej stránke. Načíta zvýraznené výzvy
 * (featured) až na klientovi, lebo domovská stránka je klientský komponent.
 * Ak žiadne nie sú, nevykreslí nič.
 */
export default function FeaturedProjects() {
  const [projects, setProjects] = useState<ProjectCardData[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getFeaturedProjects()
      .then((list) => {
        if (!cancelled) setProjects(list)
      })
      .catch(() => {
        if (!cancelled) setProjects([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!projects || projects.length === 0) return null

  return (
    <section id="vyzvy" className="relative py-28 md:py-36 bg-blue-deep border-t border-white/5 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-gold-bright uppercase tracking-widest text-xs font-extrabold mb-4">
              <span className="w-8 h-[2px] bg-gold rounded-full" />
              <span>Aktuálne výzvy</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tight leading-tight">
              Konkrétne diela, ktoré <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-bright to-white">čakajú na váš KROK</span>
            </h2>
            <p className="text-zinc-300 text-base font-light leading-relaxed mt-4">
              Vyberte si výzvu, ktorá vám leží na srdci. Každý dar sa priradí priamo k nej a vy uvidíte, ako projekt rastie.
            </p>
          </div>
          <Link href="/vyzvy" className="inline-flex items-center gap-2 text-sm font-extrabold text-gold-bright hover:gap-3 transition-all shrink-0">
            Všetky výzvy <ArrowRight size={16} />
          </Link>
        </div>

        <div className={`grid gap-6 ${projects.length === 1 ? 'max-w-md' : projects.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </div>
    </section>
  )
}
