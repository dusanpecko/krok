import { redirect } from 'next/navigation'

/** Web diecézy – zatiaľ len časopis; ďalšie sekcie pribudnú pri prechádzaní webu (§ 20, D3). */
export default function DioceseWebAdmin() {
  redirect('/admin/web-dieceza/casopis')
}
