import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session – DÔLEŽITÉ pre auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Ochrana admin routov
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // 1. Musí byť prihlásený
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/prihlasenie'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // 2. Musí mať prístup do administrácie: admin_users (legacy) alebo aspoň
    //    jedna priradená rola v user_roles. Zrkadlí hasAccess z admin/layout.tsx,
    //    ale vynútené na serveri (defense-in-depth). Po migrácii 012 vie
    //    prihlásený používateľ čítať vlastné riadky user_roles bez rekurzie.
    const [{ data: roleRows }, { data: adminRows }] = await Promise.all([
      supabase.from('user_roles').select('id').eq('id', user.id).limit(1),
      supabase.from('admin_users').select('id').eq('id', user.id).limit(1),
    ])
    const hasAccess = (roleRows?.length ?? 0) > 0 || (adminRows?.length ?? 0) > 0

    if (!hasAccess) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Ochrana darcovskej zóny (/profil)
  if (request.nextUrl.pathname.startsWith('/profil') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/prihlasenie'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
