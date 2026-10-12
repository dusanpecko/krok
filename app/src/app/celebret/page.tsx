import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Celebret – Dioecesis Žilinensis', robots: { index: false, follow: false } }

/** celebret.dcza.sk bez kódu – krátke vysvetlenie (overuje sa naskenovaním QR z celebretu). */
export default function CelebretIndex() {
  return (
    <main className="min-h-screen bg-paper-warm flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-mute">Dioecesis Žilinensis, Slovachia</p>
        <h1 className="text-4xl font-light tracking-[0.2em] uppercase text-blue mt-2">Celebret</h1>
        <p className="mt-4 text-ink/80 leading-relaxed">
          Platnosť celebretu overíte naskenovaním QR kódu z celebretu kňaza. / Scan the QR code on the celebret to verify its validity.
        </p>
      </div>
    </main>
  )
}
