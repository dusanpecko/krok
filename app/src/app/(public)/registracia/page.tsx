import { Metadata } from 'next'
import RegistrationForm from './RegistrationForm'

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

export default function RegistraciaPage() {
  return <RegistrationForm />
}
