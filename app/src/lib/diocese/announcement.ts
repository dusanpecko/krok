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
  id: 'menovanie-biskupa-beno-2026-11-10',
  kicker: 'Žilinská diecéza',
  title: 'Novým žilinským biskupom je Mons. Peter Beňo',
  greeting: 'Drahí bratia v kňazskej službe, bratia a sestry,',
  text: 's vďakou voči Pánu Bohu oznamujeme, že Svätý Otec Lev XIV. vymenoval za žilinského diecézneho biskupa Mons. Petra Beňa, doterajšieho pomocného biskupa Nitrianskej diecézy. Mons. Tomáš Galis bude diecézu spravovať ako apoštolský administrátor až do uvedenia nového biskupa do úradu.',
  href: '/o-nas/biskup',
  cta: 'Predstavujeme nového biskupa',
  until: '2026-11-24',
}
