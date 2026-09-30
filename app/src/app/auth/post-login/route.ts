import { createClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { donorNeedsOnboarding, getCurrentDonor } from '@/app/(public)/profil/actions'
import { getMyParishes } from '@/lib/parishes/access'

/**
 * Rozhodne, kam presmerovať používateľa po prihlásení (email aj Google).
 *
 * - Admin / pracovník (má rolu) → bezpečný `to`, inak /admin.
 * - Účet farnosti (parish_users, bez admin roly) → bezpečný `to`, inak /moja-farnost.
 * - Darca → profil sa tu aj založí (getCurrentDonor). Ak ešte nepotvrdil farnosť / projekt,
 *   ide najprv na /profil/vitajte (aj pri Google registrácii, ktorá nemá formulár).
 *   Onboarding je PRED `to`, aby sa nedal obísť odkazom `?to=/profil`; `to` sa nesie ďalej.
 *
 * Sem smeruje email login (window.location) aj OAuth callback po výmene kódu.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const toParam = searchParams.get('to')
  // Bezpečná interná cesta (nie open-redirect): musí začínať '/' a nie '//'
  const to = toParam && toParam.startsWith('/') && !toParam.startsWith('//') ? toParam : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/prihlasenie`)
  }

  const { isAdmin, roles } = await getUserAccess(user.id)
  if (isAdmin || roles.length > 0) {
    return NextResponse.redirect(`${origin}${to ?? '/admin'}`)
  }

  // Kňaz / farnosť – nie je darca, onboarding farnosti darcu sa ho netýka
  const myParishes = await getMyParishes(user.id)
  if (myParishes.length > 0) {
    return NextResponse.redirect(`${origin}${to ?? '/moja-farnost'}`)
  }

  const donor = await getCurrentDonor()
  if (await donorNeedsOnboarding(donor)) {
    const next = to ?? '/profil'
    return NextResponse.redirect(`${origin}/profil/vitajte?to=${encodeURIComponent(next)}`)
  }

  return NextResponse.redirect(`${origin}${to ?? '/profil'}`)
}
