'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Church, LogIn } from 'lucide-react'
import { KIND_LABEL, type ParishDetail } from '@/lib/parishes/types'
import ParishBasicTab from './ParishBasicTab'
import ParishVillagesTab from './ParishVillagesTab'
import ParishScheduleTab from './ParishScheduleTab'
import ParishClergyTab from './ParishClergyTab'
import ParishDonationsTab from './ParishDonationsTab'
import ParishAccessTab from './ParishAccessTab'
import ParishBoxTab from './ParishBoxTab'
import type { ChangeRequestRow, ParishAccessRow } from '@/app/admin/farnosti/actions'
import ParishPostsTab from '@/components/parish-zone/ParishPostsTab'
import ParishSacramentsTab from '@/components/parish-zone/ParishSacramentsTab'
import ParishGalleryTab from '@/components/parish-zone/ParishGalleryTab'
import { adminDeleteAlbum, adminDeletePhoto, adminGetGallery, adminListAlbumOptions, adminSaveAlbum, adminSetGalleryQuota, adminTakedownAlbum, adminUpdatePhotos, adminUploadPhoto } from '@/app/admin/farnosti/gallery-actions'
import { adminGetParishTraffic, adminDeleteParishPost, adminSaveParishPost, adminSaveParishSacrament, adminSaveSocialLinks, adminUploadEditorImage, adminUploadParishFile } from '@/app/admin/farnosti/web-actions'
import SocialLinksEditor from '@/components/parishes/SocialLinksEditor'
import ParishTrafficCard from '@/components/parishes/ParishTrafficCard'
import type { ParishPostRow, SacramentEditRow } from '@/lib/parishes/posts'

const POST_ACTIONS = { save: adminSaveParishPost, remove: adminDeleteParishPost, upload: adminUploadParishFile, uploadEditorImage: adminUploadEditorImage, listAlbums: adminListAlbumOptions }
const GALLERY_ACTIONS = {
  load: adminGetGallery,
  saveAlbum: adminSaveAlbum,
  upload: adminUploadPhoto,
  updatePhotos: adminUpdatePhotos,
  deletePhoto: adminDeletePhoto,
  deleteAlbum: adminDeleteAlbum,
  setQuota: adminSetGalleryQuota,
  takedown: adminTakedownAlbum,
}

type TabKey = 'basic' | 'villages' | 'schedule' | 'posts' | 'gallery' | 'sacraments' | 'clergy' | 'donations' | 'box' | 'traffic' | 'access'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: 'Základné údaje' },
  { key: 'villages', label: 'Obce a štatistika' },
  { key: 'schedule', label: 'Bohoslužby a úradné hodiny' },
  { key: 'posts', label: 'Oznamy a aktuality' },
  { key: 'gallery', label: 'Galéria' },
  { key: 'sacraments', label: 'Sviatosti' },
  { key: 'clergy', label: 'Kňazi' },
  { key: 'donations', label: 'Dary a história' },
  { key: 'box', label: 'E-zvonček' },
  { key: 'traffic', label: 'Návštevnosť' },
  { key: 'access', label: 'Prístupy a návrhy' },
]

export default function ParishDetailView({
  detail,
  deaneries,
  access,
  requests,
  web,
}: {
  detail: ParishDetail
  deaneries: { id: string; name: string }[]
  access: ParishAccessRow[]
  requests: ChangeRequestRow[]
  web: { posts: ParishPostRow[]; sacraments: SacramentEditRow[] }
}) {
  const [tab, setTab] = useState<TabKey>('basic')
  const { parish } = detail
  const catholics = detail.villages.reduce((a, v) => a + (v.catholics ?? 0), 0)
  const thisYear = detail.summary.find((s) => s.year === new Date().getFullYear())

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Link href="/admin/farnosti" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Všetky farnosti
      </Link>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Church className="w-7 h-7 text-blue-600" />
            {parish.official_name ?? parish.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-3">
            <span>{KIND_LABEL[parish.kind]}</span>
            {parish.parish_code && <span className="font-mono">kód {parish.parish_code}</span>}
            {parish.administrator_name && <span>{parish.administrator_name}</span>}
            {!parish.is_active && <span className="font-bold text-red-500">neaktívna</span>}
            {parish.schematizmus_url && (
              <a href={parish.schematizmus_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                schematizmus <ExternalLink size={12} />
              </a>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-right">
          <Link
            href={`/moja-farnost/${parish.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-black hover:bg-amber-100"
            title="Otvorí zónu farnosti presne tak, ako ju vidí kňaz"
          >
            <LogIn size={16} /> Prihlásiť sa za farnosť
          </Link>
          <Stat label="Katolíci" value={catholics ? catholics.toLocaleString('sk-SK') : '—'} />
          <Stat label="Darcovia" value={String(detail.donorsCount)} />
          <Stat label={`Vybrané ${new Date().getFullYear()}`} value={thisYear ? thisYear.collected_amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'} />
        </div>
      </div>

      <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${tab === t.key ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            {t.label}
            {t.key === 'access' && requests.some((r) => r.status === 'pending') && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-white text-[10px]">{requests.filter((r) => r.status === 'pending').length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'basic' && (
        <div className="space-y-6">
          <ParishBasicTab parish={parish} deaneries={deaneries} />
          <SocialLinksEditor parishId={parish.id} initial={parish.social_links ?? []} save={adminSaveSocialLinks} />
        </div>
      )}
      {tab === 'villages' && <ParishVillagesTab parishId={parish.id} initial={detail.villages} />}
      {tab === 'schedule' && <ParishScheduleTab parishId={parish.id} schedules={detail.schedules} villages={detail.villages} />}
      {tab === 'posts' && <ParishPostsTab parishId={parish.id} parishSlug={parish.slug} posts={web.posts} actions={POST_ACTIONS} />}
      {tab === 'gallery' && <ParishGalleryTab parishId={parish.id} parishSlug={parish.slug} actions={GALLERY_ACTIONS} isDiocese />}
      {tab === 'sacraments' && <ParishSacramentsTab parishId={parish.id} rows={web.sacraments} save={adminSaveParishSacrament} />}
      {tab === 'clergy' && <ParishClergyTab clergy={detail.clergy} />}
      {tab === 'box' && <ParishBoxTab parishId={parish.id} parishSlug={parish.slug} />}
      {tab === 'traffic' && <ParishTrafficCard parishId={parish.id} load={adminGetParishTraffic} />}
      {tab === 'donations' && <ParishDonationsTab summary={detail.summary} log={detail.log} donorsCount={detail.donorsCount} />}
      {tab === 'access' && <ParishAccessTab parishId={parish.id} access={access} requests={requests} defaultEmail={parish.email} />}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</div>
      <div className="text-lg font-black text-gray-900">{value}</div>
    </div>
  )
}
