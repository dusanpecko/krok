import type { SupabaseClient } from '@supabase/supabase-js'
import { loadParishClergy } from './parish-clergy'
import type { ParishDetail, ParishRow, ParishSeason, ParishYearSummary, Schedule, ScheduleItem } from './types'
import { STATS_YEAR } from './writes'

/** Detail farnosti (admin aj zóna farnosti) – klient musí byť service role. Serverový modul. */

const emptySchedule = (season: ParishSeason): Schedule => ({
  season,
  is_active: season === 'regular',
  valid_from: season === 'summer' ? `${new Date().getFullYear()}-07-01` : null,
  valid_to: season === 'summer' ? `${new Date().getFullYear()}-08-31` : null,
  note: null,
  items: [],
})

export async function loadParishDetail(admin: SupabaseClient, id: string): Promise<ParishDetail | null> {
  const { data: parish } = await admin.from('parishes').select('*').eq('id', id).maybeSingle()
  if (!parish) return null

  const [{ data: villages }, { data: schedules }, clergy, { data: summary }, { count: donorsCount }, { data: logRows }] = await Promise.all([
    admin.from('parish_villages').select('id, name, is_seat, district, church_name, has_church, sort_order, parish_population_stats(year, population, catholics, source)').eq('parish_id', id).order('sort_order'),
    admin.from('parish_schedules').select('id, season, is_active, valid_from, valid_to, note, parish_schedule_items(*)').eq('parish_id', id),
    loadParishClergy(admin, id),
    admin.from('v_parish_year_summary').select('*').eq('parish_id', id).order('year', { ascending: false }),
    admin.from('donors').select('id', { count: 'exact', head: true }).eq('parish_id', id),
    admin.from('parish_change_log').select('id, action, entity, changes, created_at, user_id').eq('parish_id', id).order('created_at', { ascending: false }).limit(30),
  ])

  const schedMap: Record<ParishSeason, Schedule> = { regular: emptySchedule('regular'), summer: emptySchedule('summer') }
  for (const s of schedules ?? []) {
    const items = ((s.parish_schedule_items ?? []) as (ScheduleItem & { sort_order: number; schedule_id: string })[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ sort_order: _o, schedule_id: _s, ...it }) => {
        void _o
        void _s
        return { ...it, time_from: it.time_from?.slice(0, 5) ?? null, time_to: it.time_to?.slice(0, 5) ?? null }
      })
    schedMap[s.season as ParishSeason] = { season: s.season, is_active: s.is_active, valid_from: s.valid_from, valid_to: s.valid_to, note: s.note, items }
  }

  // E-maily autorov zmien v histórii
  const userIds = [...new Set((logRows ?? []).map((l) => l.user_id).filter(Boolean) as string[])]
  const emails = new Map<string, string>()
  for (const uid of userIds) {
    const { data } = await admin.auth.admin.getUserById(uid)
    if (data?.user?.email) emails.set(uid, data.user.email)
  }

  return {
    parish: parish as ParishRow,
    villages: (villages ?? []).map((v) => {
      const st = ((v.parish_population_stats ?? []) as { year: number; population: number | null; catholics: number | null; source: string | null }[]).find((s) => s.year === STATS_YEAR)
      return {
        id: v.id,
        name: v.name,
        is_seat: v.is_seat,
        district: v.district,
        church_name: v.church_name,
        has_church: v.has_church,
        population: st?.population ?? null,
        catholics: st?.catholics ?? null,
        source: st?.source ?? null,
      }
    }),
    schedules: schedMap,
    clergy,
    summary: ((summary ?? []) as ParishYearSummary[]).map((s) => ({
      ...s,
      prescribed_amount: s.prescribed_amount != null ? Number(s.prescribed_amount) : null,
      collected_amount: Number(s.collected_amount),
      fulfillment_pct: s.fulfillment_pct != null ? Number(s.fulfillment_pct) : null,
    })),
    donorsCount: donorsCount ?? 0,
    log: (logRows ?? []).map((l) => ({ id: l.id, action: l.action, entity: l.entity, changes: l.changes, created_at: l.created_at, user_email: l.user_id ? emails.get(l.user_id) ?? null : null })),
  }
}

