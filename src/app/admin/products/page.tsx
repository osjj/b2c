import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { getProducts } from '@/actions/products'
import { getCategories } from '@/actions/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductFilters } from '@/components/admin/product-filters'
import { SortableProductTable } from '@/components/admin/sortable-product-table'
import { Pagination } from '@/components/admin/pagination'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string | string[] }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''

  // Handle category filter (can be single or multiple)
  const categoryIds = Array.isArray(params.category)
    ? params.category
    : params.category
    ? [params.category]
    : []

  const [{ products, pagination }, categories] = await Promise.all([
    getProducts({ page, search, categoryIds }),
    getCategories({ includeInactive: true }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <form className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search products..."
              defaultValue={search}
              className="pl-10"
            />
          </div>
        </form>
        <ProductFilters categories={categories} />
      </div>

      <SortableProductTable products={products} />

      <Pagination {...pagination} />
    </div>
  )
}
