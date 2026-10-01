import { Metadata } from 'next'
import RegistrationForm from './RegistrationForm'
import { getParishIdBySlug } from './actions'

// Set page metadata for SEO best practices
export const metadata: Metadata = {
  title: 'Registrácia donátora | KROK – Pastoračný fond Žilinskej diecézy',
  description: 'Zaregistrujte sa do donátorského programu a podporte pastoračné a charitatívne aktivity v Žilinskej diecéze. Krok za krokom k budovaniu pastoračných diel.',
  openGraph: {
    title: 'Registrácia donátora | KROK',
    description: 'Zaregistrujte sa do donátorského programu a podporte pastoračné a charitatívne aktivity v Žilinskej diecéze.',
    type: 'website',
  }
}

export default async function RegistraciaPage({ searchParams }: { searchParams: Promise<{ farnost?: string }> }) {
  const { farnost } = await searchParams
  // Odkaz „Podporujem Pastoračný fond“ zo stránky farnosti – farnosť je predvyplnená (O31)
  const initialParishId = farnost ? await getParishIdBySlug(farnost) : null
  return <RegistrationForm initialParishId={initialParishId} parishSlug={initialParishId ? farnost! : null} />
}
