import { createClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Rozhodne, kam presmerovať používateľa po prihlásení (email aj Google).
 *
 * - Ak je zadaný bezpečný `to` (interná cesta), rešpektuje ho.
 * - Inak podľa role: admin/pracovník → /admin, bežný darca → /profil.
 *
 * Sem smeruje email login (window.location) aj OAuth callback po výmene kódu.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const to = searchParams.get('to')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/prihlasenie`)
  }

  // Bezpečná interná cesta (nie open-redirect): musí začínať '/' a nie '//'
  if (to && to.startsWith('/') && !to.startsWith('//')) {
    return NextResponse.redirect(`${origin}${to}`)
  }

  const { isAdmin, roles } = await getUserAccess(user.id)
  const target = isAdmin || roles.length > 0 ? '/admin' : '/profil'
  return NextResponse.redirect(`${origin}${target}`)
}
