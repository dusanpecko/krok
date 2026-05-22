import { getCurrentDonor, getDonorDonations } from './actions'
import ProfileContent from '@/components/public/ProfileContent'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const donor = await getCurrentDonor()

  if (!donor) {
    // If user is logged in but not found in donors, maybe they shouldn't see the profile
    // or we should show a restricted view.
    // For now, redirect to home or show an error.
    // If they just signed up, they might not have a donor record yet.
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Profil nenájdený</h1>
        <p className="text-gray-500 mt-2">K vášmu účtu nie je priradený žiadny záznam darcu.</p>
      </div>
    )
  }

  const donations = await getDonorDonations(donor.id)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <ProfileContent donor={donor} donations={donations} />
    </div>
  )
}
