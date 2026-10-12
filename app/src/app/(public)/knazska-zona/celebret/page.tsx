import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ExternalLink, XCircle } from 'lucide-react'
import { requireZonePage } from '@/lib/clergy-zone/access'
import { listCategories } from '@/lib/clergy-zone/docs'
import { celebretBaseUrl, celebretDb, listCelebretsForClergy } from '@/lib/clergy/celebret'
import { celebretDate } from '@/lib/clergy/celebret-text'
import ZoneShell, { NoZoneAccess } from '@/components/clergy-zone/ZoneShell'
import CelebretPhotoUpload from '@/components/clergy-zone/CelebretPhotoUpload'

export const dynamic = 'force-dynamic'

/** Môj celebret (K6) – kňaz vidí platnosť a overovací odkaz, môže poslať novú fotku na schválenie. */
export default async function MyCelebretPage() {
  const access = await requireZonePage('/knazska-zona/celebret')
  if (!access) return <NoZoneAccess />
  const db = celebretDb()
  const [categories, { data: clergy }] = await Promise.all([
    listCategories(access.db),
    db.from('clergy').select('id, photo_url, category').eq('auth_user_id', access.user.id).maybeSingle(),
  ])
  const [celebrets, { data: request }] = clergy
    ? await Promise.all([
        listCelebretsForClergy(clergy.id),
        db.from('clergy_photo_requests').select('status, photo_url, reject_reason, created_at').eq('clergy_id', clergy.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
    : [[], { data: null }]
  const current = celebrets.find((c) => c.state === 'valid') ?? celebrets[0] ?? null
  const base = celebretBaseUrl()

  return (
    <ZoneShell access={{ name: access.name, canManage: access.canManage }} categories={categories}>
      <Link href="/knazska-zona" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline mb-6">
        <ArrowLeft size={14} /> Kňazská zóna
      </Link>
      <h2 className="text-3xl font-light tracking-tight mb-6">Môj celebret</h2>
      {!clergy ? (
        <p className="rounded-2xl bg-white border border-blue/10 p-6 text-mute">Celebret je len pre kňazov – váš účet nie je prepojený s registrom kňazov.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white border border-blue/10 p-6">
            {current ? (
              <>
                <p className={`inline-flex items-center gap-2 text-xl font-black ${current.state === 'valid' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {current.state === 'valid' ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                  {current.state === 'valid' ? 'Platný' : current.state === 'revoked' ? 'Zrušený' : 'Platnosť vypršala'}
                </p>
                <dl className="mt-4 text-sm space-y-1">
                  <div className="flex justify-between"><dt className="text-mute">Číslo</dt><dd className="font-bold">{current.number}</dd></div>
                  <div className="flex justify-between"><dt className="text-mute">Vydaný</dt><dd className="font-bold">{celebretDate(current.issued_on)}</dd></div>
                  <div className="flex justify-between"><dt className="text-mute">Platí do</dt><dd className="font-bold">{celebretDate(current.valid_until)}</dd></div>
                </dl>
                <a href={`${base}/${current.token}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue text-white text-sm font-extrabold hover:bg-blue/90">
                  Otvoriť celebret <ExternalLink size={14} />
                </a>
                <p className="mt-3 text-xs text-mute">Odkaz si môžete uložiť do telefónu – pri slávení mimo diecézy ho ukážete alebo dáte naskenovať QR kód z karty.</p>
              </>
            ) : (
              <p className="text-mute">Celebret vám zatiaľ nebol vydaný. Vydáva ho biskupský úrad.</p>
            )}
          </div>
          <div className="rounded-2xl bg-white border border-blue/10 p-6 space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-mute">Fotka na celebret</p>
            <div className="flex items-center gap-4">
              {clergy.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clergy.photo_url} alt="" className="w-24 h-24 rounded-full object-cover border" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-soft/50" />
              )}
              <p className="text-sm text-mute">Portrét na výšku, tvár dobre viditeľná, svetlé pozadie. Fotka sa zobrazí len na celebrete, nie v schematizme.</p>
            </div>
            {request?.status === 'pending' && <p className="text-sm font-bold text-amber-700">Nová fotka čaká na schválenie biskupským úradom.</p>}
            {request?.status === 'rejected' && <p className="text-sm font-bold text-red-600">Posledná fotka bola zamietnutá{request.reject_reason ? `: ${request.reject_reason}` : ''}.</p>}
            <CelebretPhotoUpload />
          </div>
        </div>
      )}
    </ZoneShell>
  )
}
