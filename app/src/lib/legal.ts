/**
 * Údaje prevádzkovateľa Kroku pre právne stránky (/ochrana-udajov, /podmienky) a pätičku.
 * IČO / DIČ sa zobrazujú na právnych stránkach a v pätičke (null = skryť).
 */
export const KROK_ORG = {
  name: 'KROK – Pastoračný fond Žilinskej diecézy',
  street: 'Jána Kalinčiaka 1',
  city: '010 01 Žilina',
  email: 'mojkrok@dcza.sk',
  phone: '+421 903 982 982',
  web: 'https://www.mojkrok.sk',
  iban: 'SK04 8330 0000 0029 0168 8673',
  ico: '52 60 18 97' as string | null,
  dic: '21 21 13 90 42' as string | null,
}

/** Dátum účinnosti právnych textov – aktualizovať pri zmene textu. */
export const LEGAL_EFFECTIVE = '5. októbra 2026'
