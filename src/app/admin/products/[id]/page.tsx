import { notFound } from 'next/navigation'
import { getProduct } from '@/actions/products'
import { getCategories } from '@/actions/categories'
import { getCollections, getProductCollections } from '@/actions/collections'
import { getAttributesForProduct } from '@/actions/attributes'
import { ProductForm } from '@/components/admin/product-form'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, categories, collections, productCollections, attributes] = await Promise.all([
    getProduct(id),
    getCategories({ includeInactive: true }),
    getCollections({ includeInactive: true }),
    getProductCollections(id),
    getAttributesForProduct(),
  ])

  if (!product) {
    notFound()
  }

  const productCollectionIds = productCollections.map((c) => c.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Product</h1>
      <ProductForm
        product={product}
        categories={categories}
        collections={collections}
        productCollectionIds={productCollectionIds}
        attributes={attributes}
      />
    </div>
  )
}
