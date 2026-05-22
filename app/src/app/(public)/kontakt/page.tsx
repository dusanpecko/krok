import { Metadata } from 'next'
import ContactForm from './ContactForm'

// Set page metadata for SEO best practices
export const metadata: Metadata = {
  title: 'Kontakt | KROK – Pastoračný fond Žilinskej diecézy',
  description: 'Máte otázky o podpore pastoračných projektov alebo o správe vášho donátorského účtu? Kontaktujte nás. Sme tu pre vás.',
  openGraph: {
    title: 'Kontakt | KROK',
    description: 'Kontaktujte pastoračný fond KROK a podporte duchovné a pastoračné aktivity v Žilinskej diecéze.',
    type: 'website',
  }
}

export default function KontaktPage() {
  return (
    <div className="bg-gradient-to-b from-gray-50/50 via-white to-gray-50/30 min-h-screen">
      <ContactForm />
    </div>
  )
}
