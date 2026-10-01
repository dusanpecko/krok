import type { ParishTheme } from '../types'
import Home from './Home'
import PostList from './PostList'
import PostDetail from './PostDetail'

export const standardTheme: ParishTheme = {
  key: 'standard',
  label: 'Štandardný',
  description: 'Tmavomodrý vzhľad KROK so zlatými akcentmi.',
  Home,
  PostList,
  PostDetail,
}
