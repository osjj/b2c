import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import { getCategoryBySlug } from '@/actions/categories'
import { getProducts } from '@/actions/products'
import { ProductCard } from '@/components/store/product-card'
import { StorePagination } from '@/components/store/store-pagination'
import { CategoryJsonLd, BreadcrumbJsonLd } from '@/components/seo'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category) {
    return {
      title: 'Category Not Found',
      description: 'The requested category could not be found.',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const categoryUrl = `${baseUrl}/categories/${slug}`

  // Use SEO fields from database if available, otherwise fallback to defaults
  const title = (category as any).metaTitle || `${category.name} Products`
  const description =
    (category as any).metaDescription ||
    category.description ||
    `Browse our selection of ${category.name}. High-quality protective equipment from PPE Pro.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: categoryUrl,
      siteName: 'PPE Pro',
      images: category.image
        ? [
            {
              url: category.image,
              width: 800,
              height: 600,
              alt: category.name,
            },
          ]
        : [],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: category.image ? [category.image] : [],
    },
    alternates: {
      canonical: categoryUrl,
    },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const category = await getCategoryBySlug(slug)

  if (!category) {
    notFound()
  }

  const { products, pagination } = await getProducts({
    page,
    categoryId: category.id,
    limit: 12,
    activeOnly: true,
  })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Breadcrumb items for JSON-LD
  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Categories', url: `${baseUrl}/categories` },
    { name: category.name, url: `${baseUrl}/categories/${category.slug}` },
  ]

  return (
    <>
      {/* SEO: Structured Data */}
      <CategoryJsonLd category={category} products={products} baseUrl={baseUrl} />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <div>
      {/* Breadcrumb */}
      <div className="container mx-auto px-6 lg:px-8 py-4">
        <nav className="flex items-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link href="/categories" className="hover:text-foreground transition-colors">
            Categories
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-foreground">{category.name}</span>
        </nav>
      </div>

      {/* Hero Banner */}
      <section className="relative py-16 bg-secondary/30">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl mb-4">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-muted-foreground">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 lg:px-8 py-12">
        {/* Subcategories */}
        {category.children && category.children.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-xl mb-4">Subcategories</h2>
            <div className="flex flex-wrap gap-3">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/categories/${child.slug}`}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-full text-sm transition-colors"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing <span className="text-foreground font-medium">{products.length}</span> of{' '}
            <span className="text-foreground font-medium">{pagination.total}</span> products
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-6 lg:gap-8 grid-cols-2 lg:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No products found in this category.</p>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-16">
          <Suspense fallback={null}>
            <StorePagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
            />
          </Suspense>
        </div>
      </div>
      </div>
    </>
  )
}
