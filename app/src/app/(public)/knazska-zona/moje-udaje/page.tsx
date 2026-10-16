import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireZonePage } from '@/lib/clergy-zone/access'
import { listCategories } from '@/lib/clergy-zone/docs'
import { celebretDb } from '@/lib/clergy/celebret'
import { CATEGORY_LABEL, STATUS_LABEL, type ClergyCategory, type ClergyStatus } from '@/lib/clergy/types'
import ZoneShell, { NoZoneAccess } from '@/components/clergy-zone/ZoneShell'
import CorrectionForm from '@/components/clergy-zone/CorrectionForm'

export const dynamic = 'force-dynamic'

const CORRECTIONS_EMAIL = 'sekretariat@dcza.sk'

const date = (iso: string | null) => {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)}. ${Number(m)}. ${y}`
}
const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(', ') || null

type Assignment = {
  kind: string
  role: string | null
  organization: string | null
  date_from: string | null
  year_from: number | null
  is_primary: boolean
  parishes: { name: string } | null
  deaneries: { name: string } | null
}

/**
 * Moje údaje (kňazská zóna) – kňaz si skontroluje, čo o ňom vedie register (len na čítanie, O48).
 * Opravu pošle formulárom na sekretariát (e-mail cez Brevo); verejne je z toho len meno, tituly, funkcia, pôvod a diecézny e-mail (O47).
 */
export default async function MyClergyDataPage() {
  const access = await requireZonePage('/knazska-zona/moje-udaje')
  if (!access) return <NoZoneAccess />
  const db = celebretDb()
  const [categories, { data: c }] = await Promise.all([
    listCategories(access.db),
    db
      .from('clergy')
      .select('id, first_name, last_name, title_before, title_after, ecclesiastical_titles, salutation, personal_number, category, status, origin, name_day, birth_date, birth_place, baptism_date, baptism_place, confirmation_date, confirmation_place, diaconate_date, diaconate_place, ordination_date, ordination_place, in_diocese_from, work_email, private_email, phones, permanent_address, religious_orders(code, name)')
      .eq('auth_user_id', access.user.id)
      .maybeSingle(),
  ])
  const { data: asg } = c
    ? await db.from('clergy_assignments').select('kind, role, organization, date_from, year_from, is_primary, parishes(name), deaneries(name)').eq('clergy_id', c.id).is('date_to', null).is('year_to', null)
    : { data: [] }

  const name = c ? [c.title_before, c.first_name, c.last_name].filter(Boolean).join(' ') + (c.title_after ? `, ${c.title_after}` : '') : ''
  const order = (c?.religious_orders as unknown as { code: string; name: string } | null) ?? null
  const sections: { title: string; public?: boolean; rows: [string, string | null][] }[] = c
    ? [
        {
          title: 'Meno a zaradenie',
          rows: [
            ['Meno a tituly', name],
            ['Cirkevné tituly', (c.ecclesiastical_titles ?? []).join(', ') || null],
            ['Oslovenie', c.salutation],
            ['Kategória a stav', join(CATEGORY_LABEL[c.category as ClergyCategory], STATUS_LABEL[c.status as ClergyStatus])],
            ['Rehoľa', order ? `${order.name} (${order.code})` : null],
            ['Osobné číslo', c.personal_number],
            ['Pochádza', c.origin],
            ['Meniny', c.name_day],
          ],
        },
        {
          title: 'Narodenie a sviatosti',
          rows: [
            ['Narodenie', join(date(c.birth_date), c.birth_place)],
            ['Krst', join(date(c.baptism_date), c.baptism_place)],
            ['Birmovka', join(date(c.confirmation_date), c.confirmation_place)],
            ['Diakonská vysviacka', join(date(c.diaconate_date), c.diaconate_place)],
            ['Kňazská vysviacka', join(date(c.ordination_date), c.ordination_place)],
            ['V Žilinskej diecéze od', date(c.in_diocese_from)],
          ],
        },
        {
          title: 'Kontakty (neverejné)',
          rows: [
            ['Diecézny e-mail', c.work_email],
            ['Súkromný e-mail', c.private_email],
            ['Telefón', (c.phones ?? []).join(', ') || null],
            ['Trvalý pobyt', c.permanent_address],
          ],
        },
      ]
    : []
  const current = ((asg ?? []) as unknown as Assignment[])
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    .map((a) => ({
      text: join(a.role, a.parishes?.name ?? a.deaneries?.name ?? a.organization),
      since: a.date_from ? date(a.date_from) : a.year_from ? String(a.year_from) : null,
      primary: a.is_primary,
    }))

  return (
    <ZoneShell access={{ name: access.name, canManage: access.canManage }} categories={categories}>
      <Link href="/knazska-zona" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline mb-6">
        <ArrowLeft size={14} /> Kňazská zóna
      </Link>
      <h2 className="text-3xl font-light tracking-tight">Moje údaje</h2>
      {!c ? (
        <p className="mt-6 rounded-2xl bg-white border border-blue/10 p-6 text-mute">Váš účet nie je prepojený s registrom kňazov. Ak ste kňaz Žilinskej diecézy, napíšte na {CORRECTIONS_EMAIL}.</p>
      ) : (
        <>
          <p className="mt-2 text-mute max-w-2xl leading-relaxed">
            Takto Vás vedie register kňazov biskupského úradu. Verejne (v schematizme a na stránke farnosti) sa zobrazí len meno, tituly, funkcia, odkiaľ pochádzate a diecézny e-mail.
          </p>
          <CorrectionForm />
          <div className="mt-8 space-y-6">
            <section className="rounded-2xl bg-white border border-blue/10 p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-mute mb-3">Aktuálne pôsobenie</h3>
              {current.length ? (
                <ul className="space-y-1.5">
                  {current.map((a, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-bold text-ink">{a.text}{a.primary && <span className="ml-2 text-xs font-bold text-blue">hlavné</span>}</span>
                      {a.since && <span className="text-mute">od {a.since}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-mute">Bez zapísaného pôsobenia.</p>
              )}
            </section>
            {sections.map((s) => (
              <section key={s.title} className="rounded-2xl bg-white border border-blue/10 p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-mute mb-3">{s.title}</h3>
                <dl className="divide-y divide-blue/5">
                  {s.rows.map(([k, v]) => (
                    <div key={k} className="flex flex-wrap justify-between gap-x-6 gap-y-0.5 py-2 text-sm">
                      <dt className="text-mute">{k}</dt>
                      <dd className={v ? 'font-bold text-ink text-right' : 'text-mute/70 italic'}>{v ?? 'nezapísané'}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </>
      )}
    </ZoneShell>
  )
}
