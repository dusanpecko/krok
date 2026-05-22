import { Metadata } from 'next'
import { getRegistrationFormOptions } from './actions'
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

export default async function RegistraciaPage() {
  // Fetch active parishes and projects at the server-level for SSR
  const { parishes, projects } = await getRegistrationFormOptions()

  return (
    <div className="bg-gradient-to-b from-gray-50/50 via-white to-gray-50/30 min-h-screen">
      <RegistrationForm parishes={parishes} projects={projects} />
    </div>
  )
}
