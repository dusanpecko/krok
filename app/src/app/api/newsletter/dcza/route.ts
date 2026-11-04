import { NextResponse } from 'next/server'
import { subscribeToNewsletter } from '@/lib/newsletter/subscribe'
import type { NewsletterList } from '@/lib/newsletter/consent'

/**
 * Prihlásenie zo stránky „Pripravujeme nový web“ na dcza.sk (lib/dcza-coming-soon) – statické HTML bez React,
 * preto formulár posiela sem (fetch → JSON; bez JavaScriptu bežný POST → späť na stránku s #kotvou).
 * Polia: email, first_name, launch / krok (zaškrtnuté = "1"), website (honeypot).
 */
export async function POST(request: Request) {
  const isForm = !(request.headers.get('content-type') ?? '').includes('application/json')
  const data: Record<string, unknown> = isForm
    ? Object.fromEntries(await request.formData().catch(() => new FormData()))
    : await request.json().catch(() => ({}))
  const on = (k: string) => data[k] === '1' || data[k] === 'on' || data[k] === true
  const lists: NewsletterList[] = [on('launch') && 'dcza_launch', on('krok') && 'krok'].filter(Boolean) as NewsletterList[]

  const res = await subscribeToNewsletter({
    email: String(data.email ?? ''),
    firstName: String(data.first_name ?? ''),
    lists,
    source: 'dcza-coming-soon',
    website: String(data.website ?? ''),
  })

  if (isForm) return NextResponse.redirect(new URL(res.success ? '/#prihlasenie-ok' : '/#prihlasenie-chyba', request.url), 303)
  return NextResponse.json(res, { status: res.success ? 200 : 400 })
}
