'use server'

interface ContactMessagePayload {
  name: string
  email: string
  subject: string
  message?: string
}

/**
 * Server action to process public contact form submissions
 */
export async function sendContactMessage(payload: ContactMessagePayload) {
  try {
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

    // 2. Logging submission (Extensible: can easily wire up to Supabase 'messages' table or email sender)
    console.log('================================================')
    console.log('NEW CONTACT MESSAGE SUBMISSION:')
    console.log('Meno:', name)
    console.log('Email:', email)
    console.log('Predmet:', subject)
    console.log('Správa:', message || '(bez textu správy)')
    console.log('Čas prijatia:', new Date().toLocaleString('sk-SK'))
    console.log('================================================')

    // Simulate database / network delay
    await new Promise((resolve) => setTimeout(resolve, 800))

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
