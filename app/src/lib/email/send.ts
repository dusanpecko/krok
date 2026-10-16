import { createClient } from '@supabase/supabase-js'
import nodemailer, { type Transporter } from 'nodemailer'
import { getBaseUrl } from '@/lib/mollie/client'
import { renderTemplate, wrapEmailLayout, type EmailTemplate, type EmailTemplateKey, type EmailVariables } from './render'

/**
 * Odoslanie automatického e-mailu podľa šablóny z DB (email_templates).
 * Transport: SMTP (Google Workspace), ak je nastavené SMTP_HOST/SMTP_USER/SMTP_PASS – odosielateľ je
 * vtedy vždy SMTP_FROM alebo SMTP_USER (Gmail iný From prepíše; @dcza.sk má prísny DMARC).
 * Inak Brevo transakčné API (BREVO_API_KEY, odosielateľ musí byť v Brevo overený).
 * Serverový modul – kľúč nikdy nesmie ísť na klienta.
 *
 * Odoslanie nikdy nevyhodí výnimku – zlyhanie e-mailu nesmie pokaziť dar ani registráciu.
 */

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email'
const BREVO_TIMEOUT_MS = 10_000

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export type SendEmailResult = { success: true; messageId?: string } | { success: false; error: string }

export interface SendTemplateEmailInput {
  templateKey: EmailTemplateKey | string
  to: string
  toName?: string | null
  variables: EmailVariables
  donorId?: string | null
  donationId?: string | null
  /** Testovací e-mail z adminu – nepočíta sa do sent_count */
  isTest?: boolean
  /** Neuložená verzia šablóny z editora (test pred uložením) */
  templateOverride?: Pick<EmailTemplate, 'subject' | 'body' | 'from_email' | 'from_name' | 'reply_to'>
}

type OutgoingEmail = {
  fromEmail: string
  fromName: string
  replyTo?: string | null
  to: string
  toName?: string | null
  subject: string
  html: string
  tag: string
}

let smtpTransport: Transporter | null = null

function getSmtpTransport(): Transporter | null {
  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = process.env
  if (!host || !user || !pass) return null
  if (!smtpTransport) {
    const port = Number(process.env.SMTP_PORT || 465)
    smtpTransport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: pass.replace(/\s+/g, '') },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  }
  return smtpTransport
}

async function sendViaSmtp(transport: Transporter, msg: OutgoingEmail): Promise<SendEmailResult> {
  try {
    const info = await transport.sendMail({
      from: { address: process.env.SMTP_FROM || process.env.SMTP_USER!, name: process.env.SMTP_FROM_NAME || msg.fromName },
      to: msg.toName ? { address: msg.to, name: msg.toName } : msg.to,
      ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
      subject: msg.subject,
      html: msg.html,
      headers: { 'X-Krok-Tag': msg.tag },
    })
    return { success: true, messageId: info.messageId }
  } catch (err) {
    return { success: false, error: `SMTP: ${err instanceof Error ? err.message : 'neznáma chyba'}` }
  }
}

/** SMTP, ak je nastavené; pri zlyhaní (napr. zlé heslo aplikácie) záloha cez Brevo, aby e-mail nepadol úplne. */
async function deliver(msg: OutgoingEmail): Promise<SendEmailResult> {
  const smtp = getSmtpTransport()
  if (!smtp) return sendViaBrevo(msg)
  const result = await sendViaSmtp(smtp, msg)
  if (result.success) return result
  console.error('[email] SMTP zlyhalo, skúšam Brevo:', result.error)
  const fallback = await sendViaBrevo(msg)
  return fallback.success ? fallback : { success: false, error: `${result.error} | ${fallback.error}` }
}

async function sendViaBrevo(msg: OutgoingEmail): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { success: false, error: 'Brevo nie je nakonfigurované (BREVO_API_KEY).' }

  try {
    const res = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { email: msg.fromEmail, name: msg.fromName },
        to: [{ email: msg.to, ...(msg.toName ? { name: msg.toName } : {}) }],
        ...(msg.replyTo ? { replyTo: { email: msg.replyTo } } : {}),
        subject: msg.subject,
        htmlContent: msg.html,
        tags: [msg.tag],
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    })
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { messageId?: string }
      return { success: true, messageId: data.messageId }
    }
    const body = await res.text().catch(() => '')
    return { success: false, error: `Brevo ${res.status}: ${body.slice(0, 300)}` }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Brevo: neznáma chyba' }
  }
}

export async function sendTemplateEmail(input: SendTemplateEmailInput): Promise<SendEmailResult> {
  try {
    const admin = serviceClient()
    const { data: stored } = await admin
      .from('email_templates')
      .select('*')
      .eq('template_key', input.templateKey)
      .maybeSingle<EmailTemplate>()

    if (!stored) return { success: false, error: `Šablóna ${input.templateKey} neexistuje.` }
    if (!stored.is_active && !input.isTest) return { success: false, error: 'Šablóna je vypnutá.' }

    const tpl = { ...stored, ...(input.templateOverride ?? {}) }
    const siteUrl = getBaseUrl()
    const variables: EmailVariables = { site_url: siteUrl, ...input.variables }

    const subject = renderTemplate(tpl.subject, variables, { html: false })
    const body = renderTemplate(tpl.body, variables, { html: true })
    const html = wrapEmailLayout(body, { siteUrl })

    const result = await deliver({
      fromEmail: tpl.from_email,
      fromName: tpl.from_name,
      replyTo: tpl.reply_to,
      to: input.to,
      toName: input.toName,
      subject: input.isTest ? `[TEST] ${subject}` : subject,
      html,
      tag: input.templateKey,
    })

    const { error: logError } = await admin.from('email_logs').insert({
      template_id: stored.id,
      template_key: input.templateKey,
      recipient_email: input.to,
      recipient_name: input.toName ?? null,
      subject,
      donor_id: input.donorId ?? null,
      donation_id: input.donationId ?? null,
      is_test: !!input.isTest,
      status: result.success ? 'sent' : 'failed',
      provider_message_id: result.success ? result.messageId ?? null : null,
      error_message: result.success ? null : result.error,
    })
    if (logError) console.error('[email] Zápis do email_logs zlyhal:', logError.message)

    if (result.success && !input.isTest) {
      await admin.rpc('increment_email_sent_count', { p_template_key: input.templateKey })
    }
    if (!result.success) console.error(`[email] ${input.templateKey} sa nepodarilo odoslať:`, result.error)
    return result
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Neznáma chyba'
    console.error(`[email] ${input.templateKey}:`, error)
    return { success: false, error }
  }
}

/**
 * Interná správa (napr. oprava údajov kňaza pre sekretariát) – bez šablóny. Odosielateľ sa preberie
 * zo šablóny `fromTemplate` (pri Brevo musí byť overený); odpovedať sa dá priamo autorovi (replyTo).
 */
export async function sendInternalEmail(input: { to: string; subject: string; html: string; replyTo?: string | null; tag: string; fromTemplate?: string }): Promise<SendEmailResult> {
  const { data: tpl } = await serviceClient().from('email_templates').select('from_email, from_name').eq('template_key', input.fromTemplate ?? 'clergy_zone_invite').maybeSingle()
  if (!tpl?.from_email) return { success: false, error: 'Chýba odosielateľ (šablóna e-mailu).' }
  return deliver({ fromEmail: tpl.from_email, fromName: tpl.from_name ?? 'KROK', replyTo: input.replyTo, to: input.to, subject: input.subject, html: input.html, tag: input.tag })
}
