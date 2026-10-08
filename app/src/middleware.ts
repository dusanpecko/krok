import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SITE_COOKIE, SITE_HEADER, isSharedPath, siteFromHost, type SiteKey } from '@/lib/site'

/** Web podľa domény; mimo produkcie aj prepínač cookie (test.mojkrok.sk → web diecézy). */
function resolveSite(request: NextRequest): SiteKey {
  const byHost = siteFromHost(request.headers.get('host'))
  if (byHost) return byHost
  if (process.env.VERCEL_ENV !== 'production' && request.cookies.get(SITE_COOKIE)?.value === 'dcza') return 'dcza'
  return 'mojkrok'
}

export async function middleware(request: NextRequest) {
  const site = resolveSite(request)
  const { pathname } = request.nextUrl

  // prepínač webu na testovacej verzii: /web/dieceza, /web/krok
  if (pathname === '/web/dieceza' || pathname === '/web/krok') {
    const res = NextResponse.redirect(new URL('/', request.url))
    if (process.env.VERCEL_ENV === 'production') return res
    if (pathname === '/web/dieceza') res.cookies.set(SITE_COOKIE, 'dcza', { path: '/', sameSite: 'lax' })
    else res.cookies.delete(SITE_COOKIE)
    return res
  }
  // vnútorné stránky webu diecézy nie sú priamo dostupné z mojkrok.sk
  if (site === 'mojkrok' && (pathname === '/dcza' || pathname.startsWith('/dcza/'))) {
    return NextResponse.rewrite(new URL('/stranka-neexistuje', request.url))
  }
  // server komponenty vedia, na ktorom webe sú (lib/site-server getSite)
  request.headers.set(SITE_HEADER, site)

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

  // Ochrana darcovskej zóny (/profil) a zóny farnosti (/moja-farnost – členstvo overuje server)
  if ((request.nextUrl.pathname.startsWith('/profil') || request.nextUrl.pathname.startsWith('/moja-farnost')) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/prihlasenie'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // dcza.sk: vlastné stránky webu diecézy žijú pod /dcza (spoločné cesty ostávajú)
  if (site === 'dcza' && !isSharedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = `/dcza${pathname === '/' ? '' : pathname}`
    const rewritten = NextResponse.rewrite(url, { request })
    supabaseResponse.cookies.getAll().forEach((c) => rewritten.cookies.set(c))
    return rewritten
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
