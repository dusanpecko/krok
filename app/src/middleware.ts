import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PATH_HEADER, SITE_COOKIE, SITE_HEADER, isCelebretHost, isSharedPath, parishSubdomainFromHost, siteFromHost, type SiteKey } from '@/lib/site'

/** Web podľa domény; mimo produkcie aj prepínač cookie (test.mojkrok.sk → web diecézy). */
function resolveSite(request: NextRequest): SiteKey {
  const byHost = siteFromHost(request.headers.get('host'))
  if (byHost) return byHost
  if (process.env.VERCEL_ENV !== 'production' && request.cookies.get(SITE_COOKIE)?.value === 'dcza') return 'dcza'
  return 'mojkrok'
}

/**
 * Subdoména farnosti (D5, O13, § 4.4): <subdomena>.mojkrok.sk / .dcza.sk je len vstupná adresa –
 * presmeruje na stránku farnosti (zachová podstránku, napr. /oznamy). Subdoména = meno e-mailovej
 * schránky farnosti (062); vždy naša stránka farnosti – vlastný web farnosti je na nej ako odkaz
 * (rozhodnutie 2026-10-16). Záložne aj slug farnosti (moja-farnost.dcza.sk). Neznáma → zoznam farností s hľadaním.
 * 302 (nie 301): prehliadač si presmerovanie nezapamätá navždy, ak farnosť neskôr zmení web alebo subdoménu.
 */
async function parishSubdomainRedirect(request: NextRequest, target: { sub: string; site: SiteKey; base: string }) {
  const origin = `${request.nextUrl.protocol}//${target.base}`
  // subdoména (schránka) alebo slug farnosti – ľudia skúšajú aj <názov-farnosti>.dcza.sk; zhoda subdomény má prednosť
  const sub = encodeURIComponent(target.sub)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/parishes?select=slug,subdomain&is_active=eq.true&or=(subdomain.eq.${sub},slug.eq.${sub})&limit=2`,
    { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` } },
  ).catch(() => null)
  const rows: { slug: string; subdomain: string | null }[] = res?.ok ? await res.json() : []
  const parish = rows.find((r) => r.subdomain === target.sub) ?? rows[0]
  if (!parish) return NextResponse.redirect(`${origin}/farnosti?q=${encodeURIComponent(target.sub)}`, 302)
  const rest = request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname
  return NextResponse.redirect(`${origin}/farnosti/${parish.slug}${rest}`, 302)
}

export async function middleware(request: NextRequest) {
  // celebret.dcza.sk/<kód> → overenie celebretu (K6); staré …/<meno>/qr z mypro.one bez „/qr“
  // celebrety sa nikdy neindexujú: robots.txt zakáže všetko a každá odpoveď nesie X-Robots-Tag (aj v produkcii)
  if (isCelebretHost(request.headers.get('host'))) {
    if (request.nextUrl.pathname === '/robots.txt') {
      return new NextResponse('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } })
    }
    const path = request.nextUrl.pathname.replace(/\/qr\/?$/, '').replace(/\/+$/, '')
    const res = path.startsWith('/celebret') || path.startsWith('/_next')
      ? NextResponse.next()
      : NextResponse.rewrite(Object.assign(request.nextUrl.clone(), { pathname: path && path !== '/' ? `/celebret${path}` : '/celebret' }))
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    return res
  }
  if (/^\/celebret(\/|$)/.test(request.nextUrl.pathname)) {
    const res = NextResponse.next()
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    return res
  }

  // subdoména farnosti – pred všetkým ostatným (bez session a výberu webu)
  const parishSub = parishSubdomainFromHost(request.headers.get('host'))
  if (parishSub) return parishSubdomainRedirect(request, parishSub)

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
  request.headers.set(PATH_HEADER, pathname)

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
