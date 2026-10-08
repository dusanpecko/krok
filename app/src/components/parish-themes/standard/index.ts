import type { ParishTheme } from '../types'
import Home from './Home'
import PostList from './PostList'
import PostDetail from './PostDetail'
import Gallery from './Gallery'
import AlbumDetail from './AlbumDetail'

export const standardTheme: ParishTheme = {
  key: 'standard',
  label: 'Štandardný',
  description: 'Tmavomodrý vzhľad KROK so zlatými akcentmi.',
  Home,
  PostList,
  PostDetail,
  Gallery,
  AlbumDetail,
}
