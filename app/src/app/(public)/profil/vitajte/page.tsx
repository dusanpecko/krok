import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { donorNeedsOnboarding, getCurrentDonor } from '../actions'
import { getParishIdBySlug, getRegistrationFormOptions } from '../../registracia/actions'
import OnboardingForm from './OnboardingForm'

export const metadata: Metadata = {
  title: 'Vitajte | KROK – Pastoračný fond Žilinskej diecézy',
  robots: { index: false },
}

/** Bezpečná interná cesta pre návrat po onboardingu */
function safeTo(to: string | undefined) {
  return to && to.startsWith('/') && !to.startsWith('//') && !to.startsWith('/profil/vitajte') ? to : '/profil'
}

/**
 * Onboarding darcu (návrh farností § 6.3): výber farnosti (alebo „nepatrím do farnosti“)
 * a voliteľne podporovaného projektu. Brána – kto voľbu ešte neurobil, na profil sa nedostane.
 */
export default async function VitajtePage({ searchParams }: { searchParams: Promise<{ to?: string; farnost?: string }> }) {
  const { to, farnost } = await searchParams
  const next = safeTo(to)
  const donor = await getCurrentDonor()
  if (!donor) redirect(`/prihlasenie?redirect=${encodeURIComponent('/profil/vitajte')}`)
  if (!(await donorNeedsOnboarding(donor))) redirect(next)

  // Farnosť zo stránky farnosti (Google registrácia ju nesie v `to` – /profil?farnost=<slug>)
  const slug = farnost ?? new URL(next, 'http://local').searchParams.get('farnost')
  const [options, initialParishId] = await Promise.all([getRegistrationFormOptions(), slug ? getParishIdBySlug(slug) : Promise.resolve(null)])
  return <OnboardingForm firstName={donor.first_name} parishes={options.parishes} projects={options.projects} next={next} initialParishId={initialParishId} />
}
