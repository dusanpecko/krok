import { normalizeSocialLinks } from './social'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Schedule, VillageWithStats } from './types'

/**
 * Spoločné zápisy registra farností – volá admin (manage_parishes) aj zóna farnosti
 * (parish_users) po vlastnej kontrole oprávnenia. Serverový modul.
 */

export const STATS_YEAR = 2021

type WriteResult = { success: true } | { success: false; error: string }

/** Sociálne siete farnosti (036) – zóna farnosti aj admin. */
export async function writeSocialLinks(db: SupabaseClient, parishId: string, userId: string, input: unknown, action: string): Promise<WriteResult> {
  const { value, error } = normalizeSocialLinks(input)
  if (error) return { success: false, error }
  const { data: before } = await db.from('parishes').select('social_links').eq('id', parishId).maybeSingle()
  if (JSON.stringify(before?.social_links ?? []) === JSON.stringify(value)) return { success: true }
  const { error: dbError } = await db.from('parishes').update({ social_links: value, profile_updated_at: new Date().toISOString(), profile_updated_by: userId }).eq('id', parishId)
  if (dbError) return { success: false, error: 'Uloženie zlyhalo.' }
  await logParishChange(db, parishId, userId, 'parish', action, { social_links: value.map((l) => l.url) })
  return { success: true }
}

export async function logParishChange(db: SupabaseClient, parishId: string, userId: string | null, entity: string, action: string, changes: Record<string, unknown>) {
  await db.from('parish_change_log').insert({ parish_id: parishId, user_id: userId, entity, action, changes })
}

/** Obce a štatistika – celý zoznam naraz; odstránené obce sa zmažú. */
export async function writeVillages(db: SupabaseClient, parishId: string, villages: VillageWithStats[], source = 'ručne'): Promise<WriteResult> {
  const clean = villages.map((v) => ({ ...v, name: v.name.trim() })).filter((v) => v.name)
  const names = clean.map((v) => v.name.toLowerCase())
  if (new Set(names).size !== names.length) return { success: false, error: 'Názvy obcí sa nesmú opakovať.' }

  const { data: existing } = await db.from('parish_villages').select('id').eq('parish_id', parishId)
  const keep = new Set(clean.map((v) => v.id).filter(Boolean) as string[])
  const remove = (existing ?? []).map((e) => e.id as string).filter((id) => !keep.has(id))
  if (remove.length) await db.from('parish_villages').delete().in('id', remove)

  for (const [i, v] of clean.entries()) {
    const row = { parish_id: parishId, name: v.name, is_seat: i === 0, district: v.district || null, church_name: v.church_name || null, has_church: v.has_church ?? true, sort_order: i }
    const { data: saved, error } = v.id
      ? await db.from('parish_villages').update(row).eq('id', v.id).select('id').single()
      : await db.from('parish_villages').upsert(row, { onConflict: 'parish_id,name' }).select('id').single()
    if (error || !saved) return { success: false, error: `Obec „${v.name}“: uloženie zlyhalo.` }
    if (v.population != null || v.catholics != null) {
      await db.from('parish_population_stats').upsert(
        { village_id: saved.id, year: STATS_YEAR, population: v.population, catholics: v.catholics, source: v.source || source },
        { onConflict: 'village_id,year' }
      )
    } else {
      await db.from('parish_population_stats').delete().eq('village_id', saved.id).eq('year', STATS_YEAR)
    }
  }
  return { success: true }
}

/** Rozvrh bohoslužieb jedného režimu – položky sa prepíšu celé. */
export async function writeSchedule(db: SupabaseClient, parishId: string, schedule: Schedule, userId: string): Promise<WriteResult> {
  const items = schedule.items.filter((it) => it.day_of_week != null || it.day_label)
  for (const it of items) {
    if (!it.time_from && !it.relative_note) return { success: false, error: 'Každá položka potrebuje čas alebo poznámku (napr. „30 minút pred sv. omšou“).' }
    if (it.time_to && it.time_from && it.time_to < it.time_from) return { success: false, error: 'Koniec nesmie byť skôr ako začiatok.' }
  }
  const { data: sched, error } = await db
    .from('parish_schedules')
    .upsert(
      { parish_id: parishId, season: schedule.season, is_active: schedule.is_active, valid_from: schedule.valid_from || null, valid_to: schedule.valid_to || null, note: schedule.note || null, updated_at: new Date().toISOString(), updated_by: userId },
      { onConflict: 'parish_id,season' }
    )
    .select('id')
    .single()
  if (error || !sched) return { success: false, error: 'Uloženie rozvrhu zlyhalo.' }

  // Obec musí patriť tejto farnosti
  const { data: vil } = await db.from('parish_villages').select('id').eq('parish_id', parishId)
  const villageIds = new Set((vil ?? []).map((v) => v.id as string))

  // Najprv vložiť nové položky, staré zmazať až po úspechu – pri chybe zostane pôvodný rozpis celý
  const { data: oldItems } = await db.from('parish_schedule_items').select('id').eq('schedule_id', sched.id)
  if (items.length) {
    const { error: itemsErr } = await db.from('parish_schedule_items').insert(
      items.map((it, i) => ({
        schedule_id: sched.id,
        service_type: it.service_type,
        occasion: it.occasion,
        day_of_week: it.day_of_week,
        day_label: it.day_label || null,
        time_from: it.time_from || null,
        time_to: it.time_to || null,
        relative_note: it.relative_note || null,
        note: it.note || null,
        village_id: it.village_id && villageIds.has(it.village_id) ? it.village_id : null,
        sort_order: i,
      }))
    )
    if (itemsErr) {
      console.error('[writeSchedule] insert položiek zlyhal:', itemsErr.message)
      return { success: false, error: 'Uloženie položiek rozvrhu zlyhalo – pôvodný rozvrh zostal nezmenený.' }
    }
  }
  const oldIds = (oldItems ?? []).map((o) => o.id as string)
  if (oldIds.length) await db.from('parish_schedule_items').delete().in('id', oldIds)
  return { success: true }
}
