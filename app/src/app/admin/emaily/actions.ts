'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { sendTemplateEmail } from '@/lib/email/send'
import { SAMPLE_EMAIL_VARIABLES, type EmailTemplate } from '@/lib/email/render'

/** Admin akcie pre e-mailové šablóny (oprávnenie manage_config). */

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export interface EmailLogRow {
  id: string
  template_key: string
  recipient_email: string
  subject: string
  status: 'sent' | 'failed'
  is_test: boolean
  error_message: string | null
  created_at: string
}

export type EmailTemplateUpdate = Pick<EmailTemplate, 'subject' | 'body' | 'from_email' | 'from_name' | 'reply_to' | 'is_active'>

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Neznáma chyba'
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  await requirePermission('manage_config')
  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .select('*')
    .order('category')
    .order('name')
  if (error) {
    console.error('[emaily] Načítanie šablón zlyhalo:', error.message)
    return []
  }
  return (data ?? []) as EmailTemplate[]
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  await requirePermission('manage_config')
  const { data } = await supabaseAdmin.from('email_templates').select('*').eq('id', id).maybeSingle()
  return (data as EmailTemplate | null) ?? null
}

export async function getRecentEmailLogs(templateKey?: string): Promise<EmailLogRow[]> {
  await requirePermission('manage_config')
  let query = supabaseAdmin
    .from('email_logs')
    .select('id, template_key, recipient_email, subject, status, is_test, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(templateKey ? 20 : 50)
  if (templateKey) query = query.eq('template_key', templateKey)
  const { data } = await query
  return (data ?? []) as EmailLogRow[]
}

function validate(input: EmailTemplateUpdate): string | null {
  if (!input.subject?.trim()) return 'Predmet nesmie byť prázdny.'
  if (!input.body?.replace(/<[^>]*>/g, '').trim()) return 'Obsah e-mailu nesmie byť prázdny.'
  if (!EMAIL_RE.test(input.from_email?.trim() || '')) return 'Zadajte platný e-mail odosielateľa.'
  if (!input.from_name?.trim()) return 'Zadajte meno odosielateľa.'
  if (input.reply_to?.trim() && !EMAIL_RE.test(input.reply_to.trim())) return 'Adresa pre odpoveď (Reply-To) nie je platná.'
  return null
}

function clean(input: EmailTemplateUpdate): EmailTemplateUpdate {
  return {
    subject: input.subject.trim().slice(0, 300),
    body: input.body,
    from_email: input.from_email.trim(),
    from_name: input.from_name.trim().slice(0, 100),
    reply_to: input.reply_to?.trim() || null,
    is_active: !!input.is_active,
  }
}

export async function updateEmailTemplate(
  id: string,
  input: EmailTemplateUpdate
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requirePermission('manage_config')
    const invalid = validate(input)
    if (invalid) return { success: false, error: invalid }

    const { error } = await supabaseAdmin
      .from('email_templates')
      .update({ ...clean(input), updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { success: false, error: 'Šablónu sa nepodarilo uložiť.' }

    revalidatePath('/admin/emaily')
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

/**
 * Testovací e-mail s ukážkovými hodnotami na adresu prihláseného admina.
 * Posiela sa aktuálny (aj neuložený) obsah editora.
 */
export async function sendTestEmail(
  templateKey: string,
  input: EmailTemplateUpdate
): Promise<{ success: true; to: string } | { success: false; error: string }> {
  try {
    const { user } = await requirePermission('manage_config')
    if (!user.email) return { success: false, error: 'Váš účet nemá e-mailovú adresu.' }
    const invalid = validate(input)
    if (invalid) return { success: false, error: invalid }

    const res = await sendTemplateEmail({
      templateKey,
      to: user.email,
      variables: { ...SAMPLE_EMAIL_VARIABLES, email: user.email },
      isTest: true,
      templateOverride: clean(input),
    })
    return res.success ? { success: true, to: user.email } : { success: false, error: res.error }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}
