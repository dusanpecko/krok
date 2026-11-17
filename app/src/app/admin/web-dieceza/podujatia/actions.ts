'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { dioceseDb } from '@/lib/diocese/public'
import {
  addInvites, deleteEvent, deleteInvite, deleteResponse, exportResponsesXlsx, listEventsAdmin, loadEventAdmin, sendInvites, setPublicLink, updateInvite, writeEvent,
  type EventInput, type InviteInput,
} from '@/lib/diocese/events'

/** Podujatia webu diecézy (066) – prihlášky na pozvánku. */

const PERM = 'manage_diocese_web'
type Result<T = object> = ({ success: true } & T) | { success: false; error: string }
const fail = (err: unknown) => ({ success: false as const, error: err instanceof Error ? err.message : 'Neznáma chyba' })

async function run<T>(fn: () => Promise<Result<T>>, eventId?: string | null): Promise<Result<T>> {
  try {
    await requirePermission(PERM)
    const res = await fn()
    if (res.success) {
      revalidatePath('/admin/web-dieceza/podujatia')
      if (eventId) revalidatePath(`/admin/web-dieceza/podujatia/${eventId}`)
    }
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function adminSaveEvent(id: string | null, input: EventInput) {
  return run(() => writeEvent(dioceseDb(), id, input), id)
}

export async function adminDeleteEvent(id: string) {
  return run(() => deleteEvent(dioceseDb(), id))
}

export async function adminAddInvites(eventId: string, list: InviteInput[]) {
  return run(() => addInvites(dioceseDb(), eventId, list), eventId)
}

export async function adminUpdateInvite(eventId: string, inviteId: string, input: InviteInput) {
  return run(() => updateInvite(dioceseDb(), inviteId, input), eventId)
}

export async function adminDeleteInvite(eventId: string, inviteId: string) {
  return run(() => deleteInvite(dioceseDb(), inviteId), eventId)
}

export async function adminSendInvites(eventId: string, inviteIds: string[]) {
  return run(() => sendInvites(dioceseDb(), eventId, inviteIds), eventId)
}

export async function adminDeleteResponse(eventId: string, responseId: string) {
  return run(() => deleteResponse(dioceseDb(), responseId), eventId)
}

export async function adminExportResponses(eventId: string) {
  return run(() => exportResponsesXlsx(dioceseDb(), eventId))
}

export async function adminListEvents() {
  await requirePermission(PERM)
  return listEventsAdmin(dioceseDb())
}

export async function adminLoadEvent(id: string) {
  await requirePermission(PERM)
  return loadEventAdmin(dioceseDb(), id)
}

export async function adminSetPublicLink(eventId: string, enabled: boolean) {
  return run(() => setPublicLink(dioceseDb(), eventId, enabled), eventId)
}
