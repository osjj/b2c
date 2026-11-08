import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { getProductBySlug, getProducts } from '@/actions/products'
import { getTierPriceRange, type PriceTier } from '@/lib/pricing'
import { formatPrice } from '@/lib/utils'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { B2BProductActions, type B2BProductVariant } from '@/components/store/b2b-product-actions'
import { ProductCard } from '@/components/store/product-card'
import { ProductImageGallery } from '@/components/store/product-image-gallery'
import { ContentRenderer } from '@/components/store/content-renderer'
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo'
import { ProductSectionTabs } from '@/components/store/product-section-tabs'
import styles from '@/components/store/product-detail.module.css'
import {
  buildProductMetaDescription,
  buildProductMetaTitle,
} from '@/lib/product-seo'
import { getSiteUrl } from '@/lib/site-url'
import { buildProductCategoryBreadcrumbs } from '@/lib/product-category-breadcrumbs'
import {
  getStorefrontVisibleProductSpecifications,
  type ProductSpecification,
} from '@/lib/product-specification-visibility'

type ProductContent = Parameters<typeof ContentRenderer>[0]['content']

type ProcurementSummaryItem = {
  label: string
  value: string
}

type ProductVariantOptionValue = B2BProductVariant['options'][string]
type ProductVariantOptions = Record<string, ProductVariantOptionValue>

type Props = {
  params: Promise<{ slug: string }>
}

function getSpecValue(specs: ProductSpecification[], names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase())
  return specs.find((spec) => normalizedNames.includes(spec.name.toLowerCase()))?.value
}

function isProductVariantOptionValue(value: unknown): value is ProductVariantOptionValue {
  return (
    value === null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  )
}

function normalizeVariantOptions(value: unknown): ProductVariantOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.entries(value).reduce<ProductVariantOptions>((options, [key, optionValue]) => {
    if (isProductVariantOptionValue(optionValue)) {
      options[key] = optionValue
    }
    return options
  }, {})
}

function ProductProcurementSummary({
  items,
}: {
  items: ProcurementSummaryItem[]
}) {
  if (items.length === 0) return null

  return (
    <div className={styles.summary}>
      <a href="#specifications" className={styles.summaryTitle}>
        Specifications <ArrowRight aria-hidden="true" />
      </a>
      <dl aria-label="Procurement summary">
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function SpecificationList({ specifications }: { specifications: ProductSpecification[] }) {
  return (
    <dl className={styles.specifications}>
      {specifications.map(({ name, value }, index) => (
        <div key={index}>
          <dt>{name}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: requestedSlug } = await params
  const product = await getProductBySlug(requestedSlug)

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.',
    }
  }

  const baseUrl = getSiteUrl()
  const productUrl = `${baseUrl}/products/${product.slug}`
  const productImage = product.ogImage || product.images[0]?.url
  const productImageAlt = product.images[0]?.alt || product.name

  // Curated SEO fields win; generated fallbacks stop at clean phrase/sentence boundaries.
  const title = buildProductMetaTitle(product)
  const description = buildProductMetaDescription(product)

  // Parse keywords from database or generate defaults
  const keywordsFromDb = product.metaKeywords
  const keywords = keywordsFromDb
    ? keywordsFromDb.split(',').map((k: string) => k.trim())
    : [product.name, product.category?.name, 'PPE', 'safety equipment', product.sku].filter(Boolean)

  // OG fields with fallbacks
  const ogTitle = product.ogTitle || title
  const ogDescription = product.ogDescription || description

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: keywords as string[],
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: productUrl,
      siteName: 'Laifappe',
      images: productImage
        ? [
            {
              url: productImage,
              width: 800,
              height: 800,
              alt: productImageAlt,
            },
          ]
        : [],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: productImage ? [productImage] : [],
    },
    alternates: {
      canonical: productUrl,
    },
    other: {
      'product:price:amount': String(product.price),
      'product:price:currency': 'USD',
    },
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  if (product.slug !== slug) {
    permanentRedirect(`/products/${product.slug}`)
  }

  // Get related products from same category
  const { products: relatedProducts } = product.categoryId
    ? await getProducts({
        categoryId: product.categoryId,
        limit: 4,
        activeOnly: true
      })
    : { products: [] }

  const filteredRelated = relatedProducts.filter((p) => p.id !== product.id).slice(0, 4)
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price)
  const discountPercentage = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)
    : 0
  const normalizedPriceTiers: PriceTier[] = product.priceTiers?.map((tier) => ({
    id: tier.id,
    minQuantity: tier.minQuantity,
    maxQuantity: tier.maxQuantity,
    price: Number(tier.price),
    sortOrder: tier.sortOrder,
  })) || []
  const normalizedVariants: B2BProductVariant[] = product.variants?.map((variant) => ({
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    price: Number(variant.price),
    stock: variant.stock,
    options: normalizeVariantOptions(variant.options),
  })) || []
  const tierPriceRange = getTierPriceRange(normalizedPriceTiers)
  const displayPrice = tierPriceRange
    ? tierPriceRange.min === tierPriceRange.max
      ? formatPrice(tierPriceRange.min)
      : `${formatPrice(tierPriceRange.min)}~${formatPrice(tierPriceRange.max).replace(/^\$/, '')}`
    : formatPrice(Number(product.price))

  const baseUrl = getSiteUrl()

  const visibleSpecs = getStorefrontVisibleProductSpecifications(product.specifications)
  const productContent = product.content as unknown as ProductContent
  const minimumOrderFromTier = normalizedPriceTiers.length > 0
    ? `${Math.min(...normalizedPriceTiers.map((tier) => tier.minQuantity))}+ units`
    : null
  const procurementSummaryItems = [
    { label: 'Material', value: getSpecValue(visibleSpecs, ['Upper material', 'Material']) },
    { label: 'Toe', value: getSpecValue(visibleSpecs, ['Toe protection', 'Toe cap']) },
    { label: 'MOQ', value: getSpecValue(visibleSpecs, ['Minimum order']) || minimumOrderFromTier },
    { label: 'Package', value: getSpecValue(visibleSpecs, ['Package size']) },
    { label: 'G.W.', value: getSpecValue(visibleSpecs, ['Gross weight']) },
    { label: 'Origin', value: getSpecValue(visibleSpecs, ['Origin']) },
    { label: 'Standard', value: getSpecValue(visibleSpecs, ['Standard reference', 'Standard']) },
  ].filter((item): item is ProcurementSummaryItem => Boolean(item.value))

  const productAttributes = product.attributeValues
    .filter((attributeValue) => attributeValue.attribute.isActive)
    .sort((a, b) => a.attribute.sortOrder - b.attribute.sortOrder)
    .flatMap((attributeValue): ProductSpecification[] => {
      const selectedValues = attributeValue.optionIds
        .map((id) => attributeValue.attribute.options?.find((option) => option.id === id)?.value)
        .filter(Boolean)
        .join(', ')
      const booleanValue = attributeValue.boolValue === null
        ? ''
        : attributeValue.boolValue ? 'Yes' : 'No'
      const value = attributeValue.textValue
        || attributeValue.option?.value
        || (attributeValue.optionIds.length ? selectedValues : booleanValue)
      return value ? [{ name: attributeValue.attribute.name, value }] : []
    })
  const hasSpecifications = visibleSpecs.length > 0
    || productAttributes.length > 0
    || procurementSummaryItems.length > 0

  // Visible navigation and JSON-LD share public category destinations.
  const categoryBreadcrumbs = buildProductCategoryBreadcrumbs(product.category)
  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Products', url: `${baseUrl}/products` },
    ...categoryBreadcrumbs.map(({ name, href }) => ({ name, url: `${baseUrl}${href}` })),
    { name: product.name, url: `${baseUrl}/products/${product.slug}` },
  ]

  const purchaseSummary = <ProductProcurementSummary items={procurementSummaryItems.slice(0, 3)} />

  return (
    <>
      <ProductJsonLd product={product} baseUrl={baseUrl} />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <div className={styles.page}>
        <div className={styles.shell}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span className={styles.breadcrumbItem}>
              <ChevronRight aria-hidden="true" />
              <Link href="/products">Products</Link>
            </span>
            {categoryBreadcrumbs.map(({ name, href }) => (
              <span className={styles.breadcrumbItem} key={href}>
                <ChevronRight aria-hidden="true" />
                <Link href={href}>{name}</Link>
              </span>
            ))}
            <span className={styles.breadcrumbItem}>
              <ChevronRight aria-hidden="true" />
              <span aria-current="page">{product.name}</span>
            </span>
          </nav>

          <div className={styles.hero}>
            <div className={styles.heading}>
              <h1>{product.name}</h1>
              <div className={styles.headlinePrice}>
                <span>{displayPrice}</span>
                {hasDiscount && <s>{formatPrice(Number(product.comparePrice))}</s>}
                {product.sku && normalizedVariants.length === 0 && (
                  <span className={styles.sku}>SKU: {product.sku}</span>
                )}
              </div>
            </div>
            <div className={styles.media}>
              <ProductImageGallery
                images={product.images}
                productName={product.name}
                hasDiscount={Boolean(hasDiscount)}
                discountPercentage={discountPercentage}
                catalog
              />
            </div>
            <div className={styles.purchase}>
              {process.env.NEXT_PUBLIC_PROJECT_TYPE === 'B2B' ? (
                <B2BProductActions
                  productId={product.id}
                  productName={product.name}
                  productImage={product.images[0]?.url}
                  sku={product.sku || undefined}
                  defaultPrice={Number(product.price)}
                  priceTiers={normalizedPriceTiers}
                  variants={normalizedVariants}
                  summary={purchaseSummary}
                  catalog
                />
              ) : (
                <div className={styles.orderPanel}>
                  {purchaseSummary}
                  <AddToCartButton
                    productId={product.id}
                    productName={product.name}
                    productPrice={Number(product.price)}
                    productImage={product.images[0]?.url}
                    size="lg"
                    className={styles.orderButton}
                  >
                    Add to Cart <ArrowRight aria-hidden="true" />
                  </AddToCartButton>
                </div>
              )}
            </div>
          </div>
        </div>

        <ProductSectionTabs
          hasDescription={Boolean(product.description)}
          hasSpecifications={hasSpecifications}
          hasDetails={Boolean(productContent)}
        />

        <div className={styles.shell}>
          {product.description && (
            <section id="description" className={styles.contentSection}>
              <h2>Description</h2>
              <p className="max-w-[75ch] whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            </section>
          )}

          {hasSpecifications && (
            <section id="specifications" className={styles.contentSection}>
              <h2>Specifications</h2>
              {visibleSpecs.length > 0 ? (
                <SpecificationList specifications={visibleSpecs} />
              ) : procurementSummaryItems.length > 0 && (
                <SpecificationList specifications={procurementSummaryItems.map(({ label, value }) => ({ name: label, value }))} />
              )}
              {productAttributes.length > 0 && (
                <div className={visibleSpecs.length > 0 || procurementSummaryItems.length > 0 ? 'mt-6' : undefined}>
                  <h3 className="mb-2 text-sm font-semibold">Product Attributes</h3>
                  <SpecificationList specifications={productAttributes} />
                </div>
              )}
            </section>
          )}

          {productContent && (
            <section id="product-details" className={styles.contentSection}>
              <h2>Product Details</h2>
              <ContentRenderer content={productContent} seamlessDetailImages />
            </section>
          )}

          {filteredRelated.length > 0 && (
            <section className={styles.contentSection}>
              <h2>Related Products</h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
                {filteredRelated.map((relatedProduct, index) => (
                  <ProductCard
                    key={relatedProduct.id}
                    product={relatedProduct}
                    index={index}
                    variant="catalog"
                    deferImage
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
