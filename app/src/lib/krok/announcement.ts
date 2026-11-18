/**
 * Krátke oznámenie v okne cez web mojkrok.sk (KrokAnnouncement) – obdoba DCZA_ANNOUNCEMENT. Zobrazí sa raz na prehliadač
 * (zatvorenie si pamätá podľa `id`) a len do `until`. Nové oznámenie = nové `id`; vypnutie = `KROK_ANNOUNCEMENT = null`.
 */
export interface KrokAnnouncementData {
  id: string
  kicker: string
  title: string
  text: string
  /** interný odkaz (/…) alebo externý (https://…) – externý sa otvorí v novom okne */
  href: string
  cta: string
  /** posledný deň zobrazenia (vrátane), YYYY-MM-DD */
  until: string
}

export const KROK_ANNOUNCEMENT: KrokAnnouncementData | null = {
  id: 'dotaznik-2026-11',
  kicker: 'Krátky dotazník',
  title: 'Záleží vám na budúcnosti našej diecézy?',
  text: 'Pomôžte nám posunúť KROK a celú diecézu vpred! Venujte nám pár minút svojho času, vyplňte krátky dotazník a ste v hre o skvelé ceny. Váš názor má silu meniť veci k lepšiemu.',
  href: 'https://docs.google.com/forms/d/e/1FAIpQLSdB6evwX3Ya33c5qvC7gCbHaHL1-VVqXt5nYkQHbWsN8LYFcA/viewform',
  cta: 'Chcem pomôcť a vyhrať',
  until: '2026-12-31',
}
