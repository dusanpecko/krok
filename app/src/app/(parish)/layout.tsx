import ScrollProgress from '@/components/ScrollProgress'

/**
 * Stránky farností /farnosti/[slug] – vlastná hlavička a pätička farnosti (návrh A),
 * bez hlavičky a pätičky Kroku. Vykresľuje ich motív farnosti (components/parish-themes).
 */
export default function ParishLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-paper-warm">
      <ScrollProgress />
      {children}
    </div>
  )
}
