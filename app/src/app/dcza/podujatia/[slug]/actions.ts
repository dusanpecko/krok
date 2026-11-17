'use server'

import { dioceseDb } from '@/lib/diocese/public'
import { submitRsvp, type RsvpInput } from '@/lib/diocese/events'

/** Odoslanie prihlášky z osobného odkazu – prístup chráni len tajný token v odkaze. */
export async function sendRsvp(slug: string, token: string, input: RsvpInput) {
  try {
    return await submitRsvp(dioceseDb(), slug, token, input)
  } catch {
    return { success: false as const, error: 'Prihlášku sa nepodarilo uložiť, skúste to znova. / Saving failed, please try again.' }
  }
}
