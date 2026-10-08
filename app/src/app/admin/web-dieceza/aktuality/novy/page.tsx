import { adminListDioceseCategories } from '../../actions'
import DiocesePostEditor from '@/components/admin/diocese/DiocesePostEditor'

export const dynamic = 'force-dynamic'

export default async function NewDiocesePostPage() {
  const categories = await adminListDioceseCategories()
  return <DiocesePostEditor post={null} categories={categories} />
}
