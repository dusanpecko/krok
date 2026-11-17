/** Podujatia (066) – typy a čisté funkcie zdieľané serverom aj prehliadačom (bez serverových závislostí). */

export type EventStatus = 'draft' | 'open' | 'closed'
export type QuestionType = 'text' | 'textarea' | 'choice'

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Príprava',
  open: 'Prihlasovanie otvorené',
  closed: 'Uzavreté',
}

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  choice: 'Výber z možností',
  text: 'Krátky text',
  textarea: 'Dlhší text',
}

export interface EventQuestion {
  id: string
  label: string
  help: string | null
  type: QuestionType
  options: string[]
  required: boolean
  /** otázka sa zobrazí len pri tejto odpovedi na inú otázku */
  show_if: { question: string; equals: string } | null
}

/** Otázky, ktoré sa pri daných odpovediach zobrazujú (podmienka show_if). */
export function visibleQuestions(questions: EventQuestion[], answers: Record<string, string>): EventQuestion[] {
  return questions.filter((q) => !q.show_if || (answers[q.show_if.question] ?? '') === q.show_if.equals)
}

export interface PublicEvent {
  slug: string
  title: string
  event_when: string | null
  intro: string | null
  thanks_text: string | null
  questions: EventQuestion[]
  open: boolean
}


export interface EventInput {
  title: string
  slug: string
  event_when: string | null
  intro: string | null
  thanks_text: string | null
  closes_at: string | null
  status: EventStatus
  questions: EventQuestion[]
}

export interface AdminEvent extends EventInput {
  id: string
  created_at: string
  /** spoločný odkaz (QR) pre pozvánky poštou; NULL = vypnutý */
  public_token: string | null
  public_url: string | null
}

export interface AdminEventSummary {
  id: string
  title: string
  slug: string
  event_when: string | null
  status: EventStatus
  invites: number
  responses: number
}

export interface AdminInvite {
  id: string
  token: string
  salutation: string | null
  first_name: string | null
  last_name: string
  email: string | null
  group_name: string | null
  note: string | null
  sent_at: string | null
  send_count: number
  opened_at: string | null
  /** invite = pozvaný adminom; public = prihlásil sa cez spoločný odkaz (QR) */
  source: 'invite' | 'public'
  url: string
}

export interface AdminResponse {
  id: string
  invite_id: string | null
  first_name: string
  last_name: string
  email: string
  answers: Record<string, string>
  created_at: string
  updated_at: string
}

export interface EventAdminData {
  event: AdminEvent
  invites: AdminInvite[]
  responses: AdminResponse[]
}

export interface InviteInput {
  salutation: string | null
  first_name: string | null
  last_name: string
  email: string | null
  group_name: string | null
  note: string | null
}
