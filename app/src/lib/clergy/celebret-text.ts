/**
 * Texty celebretu (latinčina, O54) – podľa dnešného celebretu z mypro.one (§ 16.9), s opraveným tvarom
 * „pervenerit … admittatur“. Čisté funkcie – overovacia stránka aj tlač.
 */

export const CELEBRET_TEXT = {
  diocese: 'Dioecesis Žilinensis, Slovachia',
  title: 'Litterae commendaticiae',
  celebret: 'Celebret',
  name: 'Nomen et cognomen',
  issued: 'Dies editionis',
  birth: 'Dies nativitatis',
  ordination: 'Dies ordinationis',
  validUntil: 'Valet ad',
  number: 'Numerus',
  edidit: 'Curia dioecesana Žilinensis edidit',
  subscriptio: 'subscriptio',
  curia: 'Curia dioecesana',
  profile: 'Sacerdos – profil v schematizme',
  valid: 'VALET',
  invalid: 'NON VALET',
  expired: 'Tempus validitatis exspiravit',
  revoked: 'Revocatum',
} as const

/** Podnadpis podľa kategórie (biskup / kňaz). */
export const celebretRole = (category: string) => (category === 'bishop' ? 'Episcopus' : 'Sacerdos')

/** Text odporúčania; veta o spovednej jurisdikcii len ak ju kňaz má (príznak na celebrete). */
export function commendationText(confessionJurisdiction: boolean, category = 'priest'): string {
  const who = category === 'bishop' ? 'Dioecesis Žilinensis episcopus' : 'Dioecesis Žilinensis presbyter'
  return [
    `Reverendus Dominus, harum litterarum possessor, ${who},`,
    confessionJurisdiction ? 'iurisdictione ad confessiones audiendas præditus,' : null,
    'nulla censura ecclesiastica innodatus, omnibus, ad quos in itinere pervenerit, impense commendatur,',
    'ut præprimis ad Sacrosanctum Missæ Sacrificium celebrandum admittatur.',
  ]
    .filter(Boolean)
    .join(' ')
}

/** „2026-10-13“ → „13. 10. 2026“ */
export const celebretDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}. ${m}. ${y}`
}
