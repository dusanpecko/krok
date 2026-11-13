import { getAttendanceGroups } from '../actions'
import AttendanceSheet from '@/components/admin/clergy/AttendanceSheet'

export const dynamic = 'force-dynamic'

const rows = (v: string | undefined, def: number) => {
  const n = v === undefined || v === '' ? def : Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(50, Math.floor(n))) : def
}

/** Prezenčná listina podľa dekanátov – náhľad na tlač (A4, každý dekanát na novej strane). */
export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const deaneryId = sp.dekanat && /^[0-9a-f-]{36}$/i.test(sp.dekanat) ? sp.dekanat : null
  const groups = await getAttendanceGroups(sp.rozsah === 'vsetci' ? 'living' : 'service', deaneryId)
  return <AttendanceSheet groups={groups} title1={(sp.n1 ?? '').trim()} title2={(sp.n2 ?? '').trim()} extraRows={rows(sp.riadky, 3)} guestRows={rows(sp.hostia, 5)} />
}
