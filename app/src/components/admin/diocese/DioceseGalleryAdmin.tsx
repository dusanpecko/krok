'use client'

import ParishGalleryTab from '@/components/parish-zone/ParishGalleryTab'
import {
  adminDioceseGalleryDeleteAlbum, adminDioceseGalleryDeletePhoto, adminDioceseGalleryLoad, adminDioceseGallerySaveAlbum,
  adminDioceseGalleryUpdatePhotos, adminDioceseGalleryUpload,
} from '@/app/admin/web-dieceza/actions'

const ACTIONS = {
  load: adminDioceseGalleryLoad,
  saveAlbum: adminDioceseGallerySaveAlbum,
  upload: adminDioceseGalleryUpload,
  updatePhotos: adminDioceseGalleryUpdatePhotos,
  deletePhoto: adminDioceseGalleryDeletePhoto,
  deleteAlbum: adminDioceseGalleryDeleteAlbum,
}

/** Fotogaléria webu diecézy – ten istý editor ako galéria farností (O75). */
export default function DioceseGalleryAdmin() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Web diecézy dcza.sk</p>
        <h1 className="text-2xl font-black text-gray-900">Galéria</h1>
      </div>
      <ParishGalleryTab parishId="dieceza" parishSlug={null} actions={ACTIONS} variant="diocese" />
    </div>
  )
}
