/**
 * Krátke oznámenie v okne cez web dcza.sk (DczaAnnouncement). Zobrazí sa raz na prehliadač (zatvorenie si pamätá
 * podľa `id`) a len do `until`. Nové oznámenie = nové `id`; vypnutie = `DCZA_ANNOUNCEMENT = null`.
 */
export interface DczaAnnouncementData {
  id: string
  kicker: string
  title: string
  /** oslovenie nad textom (nepovinné) */
  greeting?: string
  text: string
  href: string
  cta: string
  /** posledný deň zobrazenia (vrátane), YYYY-MM-DD */
  until: string
}

export const DCZA_ANNOUNCEMENT: DczaAnnouncementData | null = {
  id: 'menovanie-biskupa-2026-11',
  kicker: 'Žilinská diecéza',
  title: 'Svätý Otec menoval nového žilinského biskupa',
  greeting: 'Drahí bratia v kňazskej službe, bratia a sestry,',
  text: 's vďakou voči Pánu Bohu a pápežovi Levovi XIV. oznamujeme, že Žilinská diecéza má nového biskupa. Slávnostné oznámenie jeho mena sa uskutoční 10. novembra.',
  href: '/aktuality/oznamenie-menovania-noveho-zilinskeho-biskupa',
  cta: 'Prečítať oznámenie',
  until: '2026-11-17',
}
