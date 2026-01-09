import { getCategories } from '@/actions/categories'
import { getCollections } from '@/actions/collections'
import { ProductForm } from '@/components/admin/product-form'

export default async function NewProductPage() {
  const [categories, collections] = await Promise.all([
    getCategories({ includeInactive: true }),
    getCollections({ includeInactive: true }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Product</h1>
      <ProductForm categories={categories} collections={collections} />
    </div>
  )
}
