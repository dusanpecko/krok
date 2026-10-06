import AuthCard, { authBtnCls } from '@/components/auth/AuthCard'

export const dynamic = 'force-dynamic'

const TEXTS: Record<string, { title: string; text: string; button: string }> = {
  invite: { title: 'Aktivácia prístupu', text: 'Kliknutím aktivujete svoj prístup a nastavíte si heslo.', button: 'Pokračovať' },
  magiclink: { title: 'Aktivácia prístupu', text: 'Kliknutím aktivujete svoj prístup a nastavíte si heslo.', button: 'Pokračovať' },
  recovery: { title: 'Obnovenie hesla', text: 'Kliknutím pokračujete k nastaveniu nového hesla.', button: 'Nastaviť nové heslo' },
}

/**
 * Prvý krok odkazu z e-mailu: len tlačidlo, token sa overí až po kliknutí (POST /auth/confirm).
 * E-mailové filtre odkazy vopred otvárajú – jednorazový token by inak minuli.
 */
export default async function VerifyLinkPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { token_hash, type = '', next = '' } = await searchParams
  const t = TEXTS[type]

  if (!token_hash || !t) {
    return (
      <AuthCard title="Neplatný odkaz">
        <p className="text-sm text-mute text-center">
          Odkaz nie je úplný. Skúste ho otvoriť znova z e-mailu, prípadne nám napíšte na{' '}
          <a href="mailto:mojkrok@dcza.sk" className="text-blue font-bold">mojkrok@dcza.sk</a>.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t.title}>
      <p className="text-sm text-mute text-center mb-6">{t.text}</p>
      <form method="post" action="/auth/confirm">
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <button type="submit" className={authBtnCls}>{t.button}</button>
      </form>
    </AuthCard>
  )
}
