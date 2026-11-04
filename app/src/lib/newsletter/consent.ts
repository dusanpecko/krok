/** Znenie súhlasu – zobrazuje sa vo formulári a ukladá sa k prihláseniu (evidencia súhlasu). */
export const NEWSLETTER_CONSENT_TEXT =
  'Súhlasím so zasielaním newslettera KROK – Pastoračného fondu Žilinskej diecézy. Odhlásiť sa môžem kedykoľvek odkazom v e-maile.'

/** Zoznamy newslettera (064) – každý je samostatný súhlas a samostatný zoznam v Brevo. */
export type NewsletterList = 'krok' | 'dcza' | 'dcza_launch'

export const NEWSLETTER_LISTS: NewsletterList[] = ['krok', 'dcza', 'dcza_launch']

export const NEWSLETTER_LIST_CONSENT: Record<NewsletterList, string> = {
  krok: NEWSLETTER_CONSENT_TEXT,
  dcza: 'Súhlasím so zasielaním newslettera Žilinskej diecézy (správy a pozvánky z diecézy). Odhlásiť sa môžem kedykoľvek odkazom v e-maile.',
  dcza_launch: 'Chcem jednorazovo dostať e-mail, keď spustíme nový web Žilinskej diecézy dcza.sk.',
}
