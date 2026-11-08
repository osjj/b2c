import { notFound, permanentRedirect } from 'next/navigation'
import { Metadata } from 'next'
import { getCategories, getCategoryBySlug, getCategorySubtreeIds } from '@/actions/categories'
import { getProducts } from '@/actions/products'
import { CatalogCategoryHeader, CatalogListingLayout, CatalogProductResults } from '@/components/store/catalog-listing'
import { CategorySeoContent } from '@/components/store/category-seo-content'
import { CategoryJsonLd, BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo'
import { getSiteUrl } from '@/lib/site-url'
import { buildProductCategoryNavigation } from '@/lib/product-category-navigation'
import { getCategorySeoContent } from '@/lib/category-seo-content'
import { buildCategoryPagePath, buildCategoryPageTitle, normalizeCategoryPage } from '@/lib/category-pagination'

type Props = {
  params: Promise<{ slug: string; child: string }>
  searchParams: Promise<{ page?: string | string[] }>
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

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { child: childSlug, slug: parentSlug } = await params
  const page = normalizeCategoryPage((await searchParams).page)
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
  const categoryUrl = `${baseUrl}${buildCategoryPagePath(category.slug, parent.slug, page)}`
  const seoContent = getCategorySeoContent(category, parent)

  const title = buildCategoryPageTitle(category.metaTitle || seoContent.metaTitle, page)
  const description = category.metaDescription || seoContent.metaDescription

  return {
    title: {
      absolute: title,
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

export default async function NestedCategoryPage({ params, searchParams }: Props) {
  const { child: childSlug, slug: parentSlug } = await params
  const { page: pageParam } = await searchParams
  const page = normalizeCategoryPage(pageParam)

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
    permanentRedirect(buildCategoryPagePath(category.slug, parent.slug, page))
  }

  const subtreeIds = await getCategorySubtreeIds(category.id)
  const [{ products, pagination }, categories] = await Promise.all([
    getProducts({
      page,
      categoryIds: subtreeIds,
      limit: 12,
      activeOnly: true,
    }),
    getCategories(),
  ])
  const navigationCategories = buildProductCategoryNavigation(categories)
  const activeNavigationHref =
    navigationCategories.find((entry) => entry.id === category.id)?.href ??
    navigationCategories.find((entry) => entry.id === parent.id)?.href ??
    buildCategoryPagePath(category.slug, parent.slug)

  const baseUrl = getSiteUrl()
  const categoryUrl = `${baseUrl}${buildCategoryPagePath(category.slug, parent.slug, page)}`
  const seoContent = getCategorySeoContent(category, parent)
  const heroDescription = seoContent.heroDescription ?? category.description
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
        url={categoryUrl}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FaqJsonLd items={seoContent.faqs} />

      <CatalogListingLayout categories={navigationCategories} activeHref={activeNavigationHref}>
        <CatalogCategoryHeader
          name={category.name}
          description={heroDescription}
          image={category.image || parent.image}
          breadcrumbs={[
            { name: 'Home', href: '/' },
            { name: 'Categories', href: '/categories' },
            { name: parent.name, href: `/categories/${parent.slug}` },
          ]}
          subcategories={[
            ...parent.children.map(({ name, slug }) => ({ name, href: buildCategoryPagePath(slug, parent.slug) })),
            ...category.children.map(({ name, slug }) => ({ name, href: buildCategoryPagePath(slug, category.slug) })),
          ]}
          activeHref={buildCategoryPagePath(category.slug, parent.slug)}
        />
        <CatalogProductResults products={products} pagination={pagination} variant="category" />
        <div className="mt-12">
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
      </CatalogListingLayout>
    </>
  )
}
