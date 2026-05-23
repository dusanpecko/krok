import { getPostById } from '../actions'
import { notFound } from 'next/navigation'
import AktualityForm from '@/components/admin/aktuality/AktualityForm'

interface EditPostPageProps {
  params: Promise<{
    postId: string
  }>
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { postId } = await params
  const post = await getPostById(postId)

  if (!post) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-xl font-black text-gray-900">Upraviť článok</h1>
        <p className="text-xs text-gray-400 font-bold mt-1">Upravte detaily článku, pregenerujte hlas alebo zmeňte stav publikovania.</p>
      </div>
      
      <AktualityForm initialData={post} />
    </div>
  )
}
