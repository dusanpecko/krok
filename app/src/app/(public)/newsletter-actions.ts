'use server'

import { subscribeToNewsletter, type SubscribeResult } from '@/lib/newsletter/subscribe'

/** Prihlásenie na newsletter KROK z webu (pätička) – logika v lib/newsletter/subscribe. */
export async function subscribeNewsletter(input: {
  email: string
  firstName?: string
  consent: boolean
  source?: string
  /** Honeypot – skryté pole, vyplnia ho len boty */
  website?: string
}): Promise<SubscribeResult> {
  if (!input.consent) return { success: false, error: 'Pre prihlásenie je potrebný súhlas so zasielaním newslettera.' }
  return subscribeToNewsletter({ email: input.email, firstName: input.firstName, lists: ['krok'], source: input.source, website: input.website })
}
