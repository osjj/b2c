import { notFound, permanentRedirect } from 'next/navigation'
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

type NestedCategoryContext = {
  category: NonNullable<Awaited<ReturnType<typeof getCategoryBySlug>>>
  matchesParentSlug: boolean
}

// Resolve the child category once, then validate whether the requested parent
// slug still matches the active taxonomy. This lets us 301 old nested paths to
// the new canonical URL after category moves.
async function resolveNestedCategory(
  parentSlug: string,
  childSlug: string,
): Promise<NestedCategoryContext | null> {
  const child = await getCategoryBySlug(childSlug)
  if (!child || !child.parent) return null
  if (!child.parent.isActive) return null

  return {
    category: child,
    matchesParentSlug: child.parent.slug === parentSlug,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { child: childSlug, slug: parentSlug } = await params
  const resolved = await resolveNestedCategory(parentSlug, childSlug)

  if (!resolved) {
    return {
      title: 'Category Not Found',
      description: 'The requested category could not be found.',
    }
  }

  const { category } = resolved
  const parent = category.parent

  if (!parent) {
    return {
      title: 'Category Not Found',
      description: 'The requested category could not be found.',
    }
  }

  const baseUrl = getSiteUrl()
  const categoryUrl = `${baseUrl}/categories/${parent.slug}/${childSlug}`
  const seoContent = getCategorySeoContent(category, parent)

  const title = category.metaTitle || seoContent.metaTitle
  const description = category.metaDescription || seoContent.metaDescription

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
  const { child: childSlug, slug: parentSlug } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const resolved = await resolveNestedCategory(parentSlug, childSlug)

  if (!resolved) {
    notFound()
  }

  const { category, matchesParentSlug } = resolved
  const parent = category.parent

  if (!parent) {
    notFound()
  }

  if (!matchesParentSlug) {
    permanentRedirect(`/categories/${parent.slug}/${category.slug}`)
  }

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
        <div className="container mx-auto px-6 py-4 lg:px-8">
          <nav className="flex flex-wrap items-center text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="mx-2 h-4 w-4" />
            <Link href="/categories" className="hover:text-foreground transition-colors">
              Categories
            </Link>
            <ChevronRight className="mx-2 h-4 w-4" />
            <Link
              href={`/categories/${parent.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {parent.name}
            </Link>
            <ChevronRight className="mx-2 h-4 w-4" />
            <span className="text-foreground">{category.name}</span>
          </nav>
        </div>

        <section className="relative bg-secondary/30 py-16">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-2 text-sm uppercase tracking-[0.2em] text-primary">
                {seoContent.eyebrow}
              </p>
              <h1 className="mb-4 font-serif text-4xl md:text-5xl">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground">{category.description}</p>
              )}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-6 py-12 lg:px-8">
          {category.children && category.children.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 font-serif text-xl">Subcategories</h2>
              <div className="flex flex-wrap gap-3">
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/categories/${category.slug}/${child.slug}`}
                    className="rounded-full bg-secondary px-4 py-2 text-sm transition-colors hover:bg-secondary/80"
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{products.length}</span> of{' '}
              <span className="font-medium text-foreground">{pagination.total}</span> products
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
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
