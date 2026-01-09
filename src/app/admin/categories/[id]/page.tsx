import { notFound } from 'next/navigation'
import { getCategory, getCategories } from '@/actions/categories'
import { CategoryForm } from '@/components/admin/category-form'

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [category, categories] = await Promise.all([
    getCategory(id),
    getCategories({ includeInactive: true }),
  ])

  if (!category) {
    notFound()
  }

  // Filter out current category from parent options to prevent self-reference
  const parentOptions = categories.filter((c) => c.id !== id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Category</h1>
      <CategoryForm category={category} categories={parentOptions} />
    </div>
  )
}
