import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { donorNeedsOnboarding, getCurrentDonor } from '../actions'
import { getRegistrationFormOptions } from '../../registracia/actions'
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
export default async function VitajtePage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams
  const next = safeTo(to)
  const donor = await getCurrentDonor()
  if (!donor) redirect(`/prihlasenie?redirect=${encodeURIComponent('/profil/vitajte')}`)
  if (!(await donorNeedsOnboarding(donor))) redirect(next)

  const options = await getRegistrationFormOptions()
  return <OnboardingForm firstName={donor.first_name} parishes={options.parishes} projects={options.projects} next={next} />
}
