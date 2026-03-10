# Store Category Pages

## src/app/(store)/categories/page.tsx

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { getCategoryTree } from '@/actions/categories'
import { Card, CardContent } from '@/components/ui/card'

export default async function CategoriesPage() {
  const categories = await getCategoryTree()

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Categories</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((category) => (
          <Link key={category.id} href={`/categories/${category.slug}`}>
            <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative bg-gray-100">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-300">
                      {category.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                {category.children.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {category.children.length} subcategories
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No categories found</p>
        </div>
      )}
    </div>
  )
}
```

## src/app/(store)/categories/[slug]/page.tsx

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getCategoryBySlug } from '@/actions/categories'
import { getProducts } from '@/actions/products'
import { ProductGrid } from '@/components/store/product-grid'
import { Pagination } from '@/components/store/pagination'

interface CategoryPageProps {
  params: { slug: string }
  searchParams: { page?: string }
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const category = await getCategoryBySlug(params.slug)

  if (!category) {
    notFound()
  }

  const page = Number(searchParams.page) || 1
  const { products, pagination } = await getProducts({
    page,
    categoryId: category.id,
    isActive: true,
  })

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/categories" className="hover:text-foreground">
          Categories
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{category.name}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-2">{category.description}</p>
        )}
      </div>

      {/* Subcategories */}
      {category.children.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Subcategories</h2>
          <div className="flex flex-wrap gap-2">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/categories/${child.slug}`}
                className="px-4 py-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="mb-4">
        <p className="text-muted-foreground">{pagination.total} products</p>
      </div>

      <ProductGrid products={products} />

      <div className="mt-8">
        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const category = await getCategoryBySlug(params.slug)

  if (!category) {
    return { title: 'Category Not Found' }
  }

  return {
    title: category.name,
    description: category.description,
  }
}
```

## src/lib/utils.ts (add formatPrice function)

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}
```
