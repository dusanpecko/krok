/**
 * Zdieľané typy pre Výzvy na podporu (tabuľka projects + doplnkové tabuľky).
 * Používa ich admin aj verejná časť.
 */

export const PROJECT_CATEGORIES = [
  { value: 'charity', label: 'Charita' },
  { value: 'education', label: 'Školstvo' },
  { value: 'parish', label: 'Farnosť' },
  { value: 'evangelization', label: 'Evanjelizácia' },
  { value: 'youth', label: 'Mládež' },
  { value: 'liturgy', label: 'Liturgia' },
  { value: 'other', label: 'Iné' },
] as const

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]['value']

export const PROJECT_STATUSES = [
  { value: 'draft', label: 'Návrh' },
  { value: 'active', label: 'Aktívna' },
  { value: 'completed', label: 'Ukončená' },
] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]['value']

export function isProjectCategory(v: string): v is ProjectCategory {
  return PROJECT_CATEGORIES.some((c) => c.value === v)
}

export function isProjectStatus(v: string): v is ProjectStatus {
  return PROJECT_STATUSES.some((s) => s.value === v)
}

export function categoryLabel(v: string): string {
  return PROJECT_CATEGORIES.find((c) => c.value === v)?.label ?? v
}

export function statusLabel(v: string): string {
  return PROJECT_STATUSES.find((s) => s.value === v)?.label ?? v
}

export interface ProjectRow {
  id: string
  name: string
  slug: string
  description: string | null
  category: ProjectCategory
  status: ProjectStatus
  target_amount: number | null
  start_date: string | null
  end_date: string | null
  image_url: string | null
  visible_on_web: boolean
  specific_symbol: string | null
  subtitle: string | null
  content: string | null
  video_url: string | null
  closing_summary: string | null
  featured: boolean
  sort_order: number
  published_at: string | null
  recipient_name: string | null
  recipient_address: string | null
  guarantor_name: string | null
  guarantor_role: string | null
  guarantor_photo_url: string | null
  parish_id: string | null
  location: string | null
  legacy_variable_symbol: string | null
  legacy_collected_amount: number
  legacy_supporters_count: number
  allow_one_time: boolean
  allow_recurring: boolean
  suggested_amounts: number[]
  created_at: string
  updated_at: string
}

export interface ProjectStats {
  collected_amount: number
  supporters_count: number
  donations_count: number
  last_donation_at: string | null
  percent: number | null
}

export const EMPTY_STATS: ProjectStats = {
  collected_amount: 0,
  supporters_count: 0,
  donations_count: 0,
  last_donation_at: null,
  percent: null,
}

export interface ProjectListItem extends ProjectRow {
  stats: ProjectStats
  donors_count: number
}

export type MediaKind = 'image' | 'video' | 'document'
export type MediaPhase = 'before' | 'during' | 'after'

export const MEDIA_PHASES: { value: MediaPhase; label: string }[] = [
  { value: 'before', label: 'Pred' },
  { value: 'during', label: 'Počas' },
  { value: 'after', label: 'Po' },
]

export interface ProjectMedia {
  id: string
  project_id: string
  kind: MediaKind
  url: string
  thumbnail_url: string | null
  title: string | null
  phase: MediaPhase | null
  mime_type: string | null
  file_size: number | null
  sort_order: number
  visible: boolean
  created_at: string
}

export type BudgetStatus = 'planned' | 'in_progress' | 'done'

export const BUDGET_STATUSES: { value: BudgetStatus; label: string }[] = [
  { value: 'planned', label: 'Plánované' },
  { value: 'in_progress', label: 'Prebieha' },
  { value: 'done', label: 'Hotové' },
]

export interface ProjectBudgetItem {
  id: string
  project_id: string
  title: string
  description: string | null
  planned_amount: number
  actual_amount: number | null
  status: BudgetStatus
  sort_order: number
}

export interface ProjectMilestone {
  id: string
  project_id: string
  title: string
  description: string | null
  due_date: string | null
  completed_at: string | null
  sort_order: number
}

export interface ProjectPostSummary {
  id: string
  title: string
  slug: string
  status: string
  published_at: string | null
}

export interface ProjectAdminDetail {
  project: ProjectRow
  stats: ProjectStats
  media: ProjectMedia[]
  budget: ProjectBudgetItem[]
  milestones: ProjectMilestone[]
  posts: ProjectPostSummary[]
}

/** Vstup pre uloženie výzvy (záložky Základné, Obsah, Financie). */
export interface ProjectPayload {
  id?: string
  name: string
  slug?: string
  subtitle?: string | null
  description?: string | null
  content?: string | null
  category: ProjectCategory
  status: ProjectStatus
  visible_on_web: boolean
  featured: boolean
  sort_order: number
  image_url?: string | null
  video_url?: string | null
  closing_summary?: string | null
  recipient_name?: string | null
  recipient_address?: string | null
  guarantor_name?: string | null
  guarantor_role?: string | null
  guarantor_photo_url?: string | null
  parish_id?: string | null
  location?: string | null
  target_amount?: number | null
  start_date?: string | null
  end_date?: string | null
  specific_symbol?: string | null
  legacy_variable_symbol?: string | null
  legacy_collected_amount: number
  legacy_supporters_count: number
  allow_one_time: boolean
  allow_recurring: boolean
  suggested_amounts: number[]
}

export interface ParishOption {
  id: string
  name: string
  city: string | null
}

export interface ProjectOption {
  id: string
  name: string
}

export interface BudgetItemInput {
  id?: string
  title: string
  description: string | null
  planned_amount: number
  actual_amount: number | null
  status: BudgetStatus
}

export interface MilestoneInput {
  id?: string
  title: string
  description: string | null
  due_date: string | null
  completed_at: string | null
}

export interface ProjectDonationRow {
  id: string
  amount: number
  donation_date: string
  payment_method: string
  notes: string | null
  donor_name: string
  variable_symbol: string | null
}

export interface ProjectOnlinePaymentRow {
  id: string
  status: string
  kind: string
  amount: number
  method: string | null
  email: string | null
  donor_name: string | null
  created_at: string
  paid_at: string | null
}

export interface ProjectSubscriptionRow {
  id: string
  status: string
  interval: string
  amount: number
  email: string | null
  donor_name: string | null
  started_at: string | null
  next_payment_at: string | null
}

export interface ProjectDonationsData {
  donations: ProjectDonationRow[]
  payments: ProjectOnlinePaymentRow[]
  subscriptions: ProjectSubscriptionRow[]
}

export type ActionResult = { success: true } | { success: false; error: string }

export function formatEur(value: number): string {
  return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '–'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('sk-SK')
}
