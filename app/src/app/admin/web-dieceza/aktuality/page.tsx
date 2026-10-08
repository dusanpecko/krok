import { adminListDiocesePosts } from '../actions'
import DiocesePostsAdmin from '@/components/admin/diocese/DiocesePostsAdmin'

export const dynamic = 'force-dynamic'

export default async function DioceseNewsAdminPage() {
  const { posts, categories } = await adminListDiocesePosts()
  return <DiocesePostsAdmin posts={posts} categories={categories} />
}
