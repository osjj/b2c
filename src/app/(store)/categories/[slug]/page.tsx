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
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string | string[] }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug: requestedSlug } = await params
  const page = normalizeCategoryPage((await searchParams).page)
  const slug = requestedSlug === 'uncategorized' ? 'other-supplies' : requestedSlug
  const category = await getCategoryBySlug(slug)

  if (!category) {
    return {
      title: 'Category Not Found',
      description: 'The requested category could not be found.',
    }
  }

  const baseUrl = getSiteUrl()
  const categoryUrl = `${baseUrl}${buildCategoryPagePath(category.slug, category.parent?.slug, page)}`
  const seoContent = getCategorySeoContent(category)

  // Use SEO fields from database if available, otherwise fallback to defaults
  const title = buildCategoryPageTitle(category.metaTitle || seoContent.metaTitle, page)
  const description =
    category.metaDescription ||
    seoContent.metaDescription

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

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = normalizeCategoryPage(pageParam)

  if (slug === 'uncategorized') {
    permanentRedirect(buildCategoryPagePath('other-supplies', null, page))
  }

  const category = await getCategoryBySlug(slug)

  if (!category) {
    notFound()
  }

  // A child category always canonicalizes to /categories/{parent}/{slug} to keep
  // the hierarchy signal in the URL. Preserve any external link equity via 301.
  if (category.parent) {
    permanentRedirect(buildCategoryPagePath(category.slug, category.parent.slug, page))
  }

  // Roll up the whole subtree so the parent page keeps its listing after products
  // are moved into more-specific child categories.
  const subtreeIds = await getCategorySubtreeIds(category.id)
  const [{ products, pagination }, categories] = await Promise.all([
    getProducts({
      page,
      categoryIds: subtreeIds,
      includeUncategorized: category.slug === 'other-supplies',
      limit: 12,
      activeOnly: true,
    }),
    getCategories(),
  ])

  if (page > 1 && page > pagination.totalPages) {
    notFound()
  }

  const navigationCategories = buildProductCategoryNavigation(categories)

  const baseUrl = getSiteUrl()
  const categoryUrl = `${baseUrl}${buildCategoryPagePath(category.slug, null, page)}`
  const seoContent = getCategorySeoContent(category)
  const heroDescription = seoContent.heroDescription ?? category.description
  const relatedLinks = category.children.map((child) => ({
    name: child.name,
    href: `/categories/${category.slug}/${child.slug}`,
  }))
  const popularProductLinks = products.slice(0, 4).map((product) => ({
    name: product.name,
    href: `/products/${product.slug}`,
  }))

  // Breadcrumb items for JSON-LD
  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Categories', url: `${baseUrl}/categories` },
    { name: category.name, url: `${baseUrl}/categories/${category.slug}` },
  ]

  return (
    <>
      {/* SEO: Structured Data */}
      <CategoryJsonLd category={category} products={products} baseUrl={baseUrl} url={categoryUrl} />
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FaqJsonLd items={seoContent.faqs} />

      <CatalogListingLayout categories={navigationCategories} activeHref={`/categories/${category.slug}`}>
        <CatalogCategoryHeader
          name={category.name}
          description={category.slug === 'foot-protection' ? 'Safety footwear for industrial work' : heroDescription}
          image={category.image}
          breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Categories', href: '/categories' }]}
          subcategories={relatedLinks}
          isFootProtection={category.slug === 'foot-protection'}
        />
        <CatalogProductResults products={products} pagination={pagination} variant="category" />
        <div className="mt-12">
          <CategorySeoContent
            category={category}
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
