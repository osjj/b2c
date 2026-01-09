import { getCategories } from '@/actions/categories'
import { CategoryForm } from '@/components/admin/category-form'

export default async function NewCategoryPage() {
  const categories = await getCategories({ includeInactive: true })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Category</h1>
      <CategoryForm categories={categories} />
    </div>
  )
}
