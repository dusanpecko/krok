import type { ComponentType } from 'react'
import type { PublicAlbum, PublicParish, PublicPost, PublicPostSummary, PublicSacrament } from '@/lib/parishes/public'
import type { PublicAlbumSummary, PublicGalleryPhoto } from '@/lib/parishes/gallery'

/**
 * Motív verejnej stránky farnosti (O29). Dáta sa načítajú raz (lib/parishes/public),
 * motív ich len vykreslí – nový motív = nový priečinok v components/parish-themes, bez zmeny DB.
 */

export interface ParishHomeProps {
  parish: PublicParish
  announcements: PublicPostSummary[]
  news: PublicPostSummary[]
  events: PublicPostSummary[]
  sacraments: PublicSacrament[]
  /** pás fotiek „Kostol a farnosť“ hore na stránke (§ 17) */
  churchPhotos: PublicGalleryPhoto[]
  /** najnovšie albumy „Zo života farnosti“ */
  albums: PublicAlbumSummary[]
}

export interface ParishPostListProps {
  parish: PublicParish
  type: 'announcement' | 'news'
  posts: PublicPostSummary[]
  page: number
  hasMore: boolean
}

export interface ParishPostDetailProps {
  parish: PublicParish
  post: PublicPost
  related: PublicPostSummary[]
}

export interface ParishGalleryProps {
  parish: PublicParish
  albums: PublicAlbumSummary[]
  page: number
  hasMore: boolean
}

export interface ParishAlbumProps {
  parish: PublicParish
  album: PublicAlbum
}

export interface ParishTheme {
  key: string
  label: string
  description: string
  Home: ComponentType<ParishHomeProps>
  PostList: ComponentType<ParishPostListProps>
  PostDetail: ComponentType<ParishPostDetailProps>
  Gallery: ComponentType<ParishGalleryProps>
  AlbumDetail: ComponentType<ParishAlbumProps>
}
