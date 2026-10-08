import { notFound } from 'next/navigation'
import { adminGetDiocesePost, adminListDioceseCategories } from '../../actions'
import DiocesePostEditor from '@/components/admin/diocese/DiocesePostEditor'

export const dynamic = 'force-dynamic'

export default async function DiocesePostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [post, categories] = await Promise.all([adminGetDiocesePost(id), adminListDioceseCategories()])
  if (!post) notFound()
  return <DiocesePostEditor key={post.updated_at} post={post} categories={categories} />
}
