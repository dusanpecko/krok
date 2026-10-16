'use server'

import { getSessionUser } from '@/lib/auth'
import { celebretDb } from '@/lib/clergy/celebret'
import { sendInternalEmail } from '@/lib/email/send'
import { checkRateLimit } from '@/lib/rate-limit'

const CORRECTIONS_EMAIL = 'sekretariat@dcza.sk'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Kňaz nahlási opravu svojich údajov v registri – správa ide na sekretariát (odpoveď priamo kňazovi). */
export async function reportClergyDataCorrection(message: string): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Prihláste sa.' }
  const text = message.trim().slice(0, 4000)
  if (text.length < 3) return { success: false, error: 'Napíšte, čo treba opraviť.' }
  const { success: allowed } = await checkRateLimit('clergy-correction', { limit: 5, window: '1 h', identifier: user.id })
  if (!allowed) return { success: false, error: 'Príliš veľa správ – skúste to neskôr.' }
  const { data: c } = await celebretDb().from('clergy').select('id, first_name, last_name, title_before, work_email').eq('auth_user_id', user.id).maybeSingle()
  if (!c) return { success: false, error: 'Váš účet nie je prepojený s registrom kňazov.' }
  const name = [c.title_before, c.first_name, c.last_name].filter(Boolean).join(' ')
  const replyTo = c.work_email || user.email || null
  const res = await sendInternalEmail({
    to: CORRECTIONS_EMAIL,
    subject: `Oprava údajov v registri – ${name}`,
    html: `<p><b>${esc(name)}</b> (${esc(replyTo ?? '')}) žiada o opravu údajov v registri kňazov:</p><p style="white-space:pre-line">${esc(text)}</p><p>Záznam v admine: Schematizmus → Register kňazov → ${esc(name)}.</p>`,
    replyTo,
    tag: 'clergy_correction',
  })
  return res.success ? { success: true } : { success: false, error: 'Správu sa nepodarilo odoslať – napíšte priamo na sekretariat@dcza.sk.' }
}
