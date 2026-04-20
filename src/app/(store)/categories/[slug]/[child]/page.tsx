import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import { getCategoryBySlug, getCategorySubtreeIds } from '@/actions/categories'
import { getProducts } from '@/actions/products'
import { ProductCard } from '@/components/store/product-card'
import { CategorySeoContent } from '@/components/store/category-seo-content'
import { StorePagination } from '@/components/store/store-pagination'
import { CategoryJsonLd, BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo'
import { buildPageTitle } from '@/lib/seo-title'
import { getSiteUrl } from '@/lib/site-url'
import { getCategorySeoContent } from '@/lib/category-seo-content'

type Props = {
  params: Promise<{ slug: string; child: string }>
  searchParams: Promise<{ page?: string }>
}

// Validate that `slug` is a child of `parent` and return both if so.
// Returning null triggers a 404 — this protects against URL manipulation that
// would otherwise generate duplicate content under arbitrary parent slugs.
async function resolveNestedCategory(parentSlug: string, childSlug: string) {
  const child = await getCategoryBySlug(childSlug)
  if (!child || !child.parent) return null
  if (child.parent.slug !== parentSlug) return null
  if (!child.parent.isActive) return null
  return child
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: parentSlug, child: childSlug } = await params
  const category = await resolveNestedCategory(parentSlug, childSlug)

  if (!category || !category.parent) {
    return {
      title: 'Category Not Found',
      description: 'The requested category could not be found.',
    }
  }

  const baseUrl = getSiteUrl()
  const categoryUrl = `${baseUrl}/categories/${parentSlug}/${childSlug}`
  const seoContent = getCategorySeoContent(category, category.parent)

  const title = category.metaTitle || seoContent.metaTitle
  const description =
    category.metaDescription ||
    seoContent.metaDescription

  return {
    title: {
      absolute: buildPageTitle(title),
    },
    description,
    openGraph: {
      title,
      description,
      url: categoryUrl,
      siteName: 'Laifappe',
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

export default async function NestedCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; child: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug: parentSlug, child: childSlug } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const category = await resolveNestedCategory(parentSlug, childSlug)

  if (!category || !category.parent) {
    notFound()
  }

  const parent = category.parent
  const subtreeIds = await getCategorySubtreeIds(category.id)
  const { products, pagination } = await getProducts({
    page,
    categoryIds: subtreeIds,
    limit: 12,
    activeOnly: true,
  })

  const baseUrl = getSiteUrl()
  const seoContent = getCategorySeoContent(category, parent)
  const relatedLinks = parent.children
    .filter((item) => item.id !== category.id)
    .map((item) => ({
      name: item.name,
      href: `/categories/${parent.slug}/${item.slug}`,
    }))
  const popularProductLinks = products.slice(0, 4).map((product) => ({
    name: product.name,
    href: `/products/${product.slug}`,
  }))

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Categories', url: `${baseUrl}/categories` },
    { name: parent.name, url: `${baseUrl}/categories/${parent.slug}` },
    {
      name: category.name,
      url: `${baseUrl}/categories/${parent.slug}/${category.slug}`,
    },
  ]

  return (
    <>
      <CategoryJsonLd
        category={category}
        products={products}
        baseUrl={baseUrl}
        url={`${baseUrl}/categories/${parent.slug}/${category.slug}`}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FaqJsonLd items={seoContent.faqs} />

      <div>
        {/* Breadcrumb */}
        <div className="container mx-auto px-6 lg:px-8 py-4">
          <nav className="flex items-center text-sm text-muted-foreground flex-wrap">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <Link href="/categories" className="hover:text-foreground transition-colors">
              Categories
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <Link
              href={`/categories/${parent.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {parent.name}
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-foreground">{category.name}</span>
          </nav>
        </div>

        {/* Hero Banner */}
        <section className="relative py-16 bg-secondary/30">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm tracking-[0.2em] uppercase text-primary mb-2">
                {seoContent.eyebrow}
              </p>
              <h1 className="font-serif text-4xl md:text-5xl mb-4">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground">{category.description}</p>
              )}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-6 lg:px-8 py-12">
          {/* Grandchildren subcategories, if any */}
          {category.children && category.children.length > 0 && (
            <div className="mb-8">
              <h2 className="font-serif text-xl mb-4">Subcategories</h2>
              <div className="flex flex-wrap gap-3">
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/categories/${category.slug}/${child.slug}`}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-full text-sm transition-colors"
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

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

          <div className="mt-16">
            <Suspense fallback={null}>
              <StorePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
              />
            </Suspense>
          </div>

          <div className="mt-16">
            <CategorySeoContent
              category={category}
              parent={parent}
              productCount={pagination.total}
              childCount={category.children.length}
              relatedLinks={relatedLinks}
              popularProductLinks={popularProductLinks}
              productNames={products.map((product) => product.name)}
            />
          </div>
        </div>
      </div>
    </>
  )
}
