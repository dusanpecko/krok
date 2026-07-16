'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

interface ContactMessagePayload {
  name: string
  email: string
  subject: string
  message?: string
}

// Service-role klient na zápis správy (obíde RLS pre anonymného návštevníka)
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Server action to process public contact form submissions
 */
export async function sendContactMessage(payload: ContactMessagePayload) {
  try {
    // Rate-limit podľa IP (ochrana proti spamu)
    const { success: withinLimit } = await checkRateLimit('contact', {
      limit: 5,
      window: '1 h',
    })
    if (!withinLimit) {
      return {
        success: false,
        error: 'Priveľa odoslaných správ. Skúste to prosím neskôr (o hodinu).',
      }
    }

    const name = payload.name?.trim()
    const email = payload.email?.trim().toLowerCase()
    const subject = payload.subject?.trim()
    const message = payload.message?.trim()

    // 1. Validation
    if (!name) {
      return { success: false, error: 'Prosím, zadajte vaše meno.' }
    }
    if (!email) {
      return { success: false, error: 'Prosím, zadajte váš e-mail.' }
    }
    
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Prosím, zadajte platný e-mail.' }
    }

    if (!subject) {
      return { success: false, error: 'Prosím, zadajte predmet správy.' }
    }

    // 2. Uloženie správy do DB (žiadne PII logovanie do konzoly)
    const { error: insertError } = await supabaseAdmin
      .from('contact_messages')
      .insert({ name, email, subject, message: message || null })

    if (insertError) {
      console.error('Error saving contact message:', insertError.message)
      return {
        success: false,
        error: 'Správu sa nepodarilo odoslať. Skúste to prosím neskôr.',
      }
    }

    return {
      success: true,
      message: 'Vaša správa bola úspešne odoslaná. Budeme vás čoskoro kontaktovať!'
    }

  } catch (err) {
    console.error('Unexpected error in contact server action:', err)
    return { 
      success: false, 
      error: 'Vyskytla sa neočakávaná chyba pri odosielaní správy. Skúste to prosím neskôr.' 
    }
  }
}
