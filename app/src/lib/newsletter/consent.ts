/** Znenie súhlasu – zobrazuje sa vo formulári a ukladá sa k prihláseniu (evidencia súhlasu). */
export const NEWSLETTER_CONSENT_TEXT =
  'Súhlasím so zasielaním newslettera KROK – Pastoračného fondu Žilinskej diecézy. Odhlásiť sa môžem kedykoľvek odkazom v e-maile.'

/**
 * Zoznamy (064) – každý je samostatný súhlas. Newsletter je jeden – KROK (Brevo, posiela aj v mene diecézy);
 * dcza_launch = jednorazové upozornenie na spustenie dcza.sk, eviduje sa len u nás (do Brevo nejde).
 */
export type NewsletterList = 'krok' | 'dcza_launch'

export const NEWSLETTER_LISTS: NewsletterList[] = ['krok', 'dcza_launch']

export const NEWSLETTER_LIST_CONSENT: Record<NewsletterList, string> = {
  krok: NEWSLETTER_CONSENT_TEXT,
  dcza_launch: 'Chcem jednorazovo dostať e-mail, keď spustíme nový web Žilinskej diecézy dcza.sk.',
}
