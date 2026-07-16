import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // O cieli rozhodne /auth/post-login podľa role (admin vs darca).
      const to = redirect && redirect.startsWith('/') && !redirect.startsWith('//')
        ? `?to=${encodeURIComponent(redirect)}`
        : ''
      return NextResponse.redirect(`${origin}/auth/post-login${to}`)
    }
  }

  return NextResponse.redirect(`${origin}/prihlasenie?error=auth`)
}
