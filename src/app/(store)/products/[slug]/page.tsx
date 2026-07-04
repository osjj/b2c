import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
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
import { buildPageTitle } from '@/lib/seo-title'
import { getSiteUrl } from '@/lib/site-url'

type ProductSpecification = {
  name: string
  value: string
}

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

function isProductSpecification(spec: unknown): spec is ProductSpecification {
  if (!spec || typeof spec !== 'object') {
    return false
  }

  const candidate = spec as Record<string, unknown>
  return typeof candidate.name === 'string' && typeof candidate.value === 'string'
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
    <dl
      aria-label="Procurement summary"
      className="grid grid-cols-2 gap-x-3 gap-y-2 border-y bg-muted/30 px-3 py-3 text-xs sm:grid-cols-3 lg:grid-cols-2 lg:gap-x-4 lg:gap-y-3 lg:px-4 lg:py-4 lg:text-sm"
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1">
          <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground lg:text-[11px]">
            {item.label}
          </dt>
          <dd className="break-words font-semibold leading-snug text-foreground">
            {item.value}
          </dd>
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

  // Use SEO fields from database if available, otherwise fallback to defaults
  const title = product.metaTitle || product.name
  const description =
    product.metaDescription ||
    product.description?.slice(0, 160) ||
    `Shop ${product.name} at Laifappe. High-quality protective equipment.`

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
      absolute: buildPageTitle(title),
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

  // 过滤内部来源字段。既要匹配原始 key（sourceUrl1688 / offerId1688），
  // 也要匹配被 AI 规范化后的人类可读标签（"1688 Source URL" / "1688 Offer ID"）
  const HIDDEN_FRONTEND_SPEC_KEYS_NORMALIZED = new Set([
    'sourceurl',
    'sourcelink',
    'sourcepageurl',
    'originalsourceurl',
    'alibabasourceurl',
    '1688sourceurl',
    'sourceurl1688',
  ])
  const isInternalSpec = (name: string) => {
    const n = (name || '').toLowerCase().replace(/[\s_\-]+/g, '')
    return HIDDEN_FRONTEND_SPEC_KEYS_NORMALIZED.has(n)
  }
  const visibleSpecs = (product.specifications && Array.isArray(product.specifications))
    ? product.specifications
        .filter(isProductSpecification)
        .filter(spec => !isInternalSpec(spec.name))
    : []
  const productContent = product.content as unknown as ProductContent
  const minimumOrderFromTier = normalizedPriceTiers.length > 0
    ? `${Math.min(...normalizedPriceTiers.map((tier) => tier.minQuantity))}+ units`
    : null
  const procurementSummaryItems = [
    { label: 'MOQ', value: getSpecValue(visibleSpecs, ['Minimum order']) || minimumOrderFromTier },
    { label: 'Package', value: getSpecValue(visibleSpecs, ['Package size']) },
    { label: 'G.W.', value: getSpecValue(visibleSpecs, ['Gross weight']) },
    { label: 'Origin', value: getSpecValue(visibleSpecs, ['Origin']) },
    { label: 'Standard', value: getSpecValue(visibleSpecs, ['Standard reference', 'Standard']) },
  ].filter((item): item is ProcurementSummaryItem => Boolean(item.value))

  // Breadcrumb items for JSON-LD. Child categories resolve to their nested URL
  // so the breadcrumb matches the page's canonical location.
  const categoryPath = product.category
    ? product.category.parent && product.category.parent.isActive
      ? `/categories/${product.category.parent.slug}/${product.category.slug}`
      : `/categories/${product.category.slug}`
    : null
  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Products', url: `${baseUrl}/products` },
    ...(product.category && categoryPath
      ? product.category.parent && product.category.parent.isActive
        ? [
            {
              name: product.category.parent.name,
              url: `${baseUrl}/categories/${product.category.parent.slug}`,
            },
            { name: product.category.name, url: `${baseUrl}${categoryPath}` },
          ]
        : [{ name: product.category.name, url: `${baseUrl}${categoryPath}` }]
      : []),
    { name: product.name, url: `${baseUrl}/products/${product.slug}` },
  ]

  const productInfoContent = (
    <>
      {product.category && (
        <p className="text-sm tracking-[0.2em] uppercase text-primary">
          {product.category.name}
        </p>
      )}

      <h1
        className="line-clamp-3 font-serif text-2xl leading-tight sm:text-3xl md:line-clamp-none md:text-4xl"
        title={product.name}
      >
        {product.name}
      </h1>

      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold">
          {displayPrice}
        </span>
        {hasDiscount && (
          <span className="text-lg text-muted-foreground line-through">
            {formatPrice(Number(product.comparePrice))}
          </span>
        )}
      </div>

      <ProductProcurementSummary items={procurementSummaryItems} />

      <div className="lg:hidden">
        <ProductImageGallery
          images={product.images}
          productName={product.name}
          hasDiscount={!!hasDiscount}
          discountPercentage={discountPercentage}
        />
      </div>

      {/* Product Attributes */}
      {product.attributeValues && product.attributeValues.length > 0 && (
        <div className="space-y-3">
          {product.attributeValues
            .filter(av => av.attribute.isActive)
            .sort((a, b) => a.attribute.sortOrder - b.attribute.sortOrder)
            .map((av) => {
              let displayValue = ''
              if (av.textValue) {
                displayValue = av.textValue
              } else if (av.option) {
                displayValue = av.option.value
              } else if (av.optionIds && av.optionIds.length > 0) {
                const optionValues = av.optionIds
                  .map(id => av.attribute.options?.find(opt => opt.id === id)?.value)
                  .filter(Boolean)
                displayValue = optionValues.join(', ')
              } else if (av.boolValue !== null) {
                displayValue = av.boolValue ? 'Yes' : 'No'
              }
              if (!displayValue) return null

              return (
                <div key={av.id} className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {av.attribute.name}
                  </p>
                  <p className="text-sm font-medium">{displayValue}</p>
                </div>
              )
            })}
        </div>
      )}

      {/* SKU */}
      {product.sku && normalizedVariants.length === 0 && (
        <p className="text-sm text-muted-foreground">
          SKU: {product.sku}
        </p>
      )}
    </>
  )

  return (
    <>
      {/* SEO: Structured Data */}
      <ProductJsonLd product={product} baseUrl={baseUrl} />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <div className="bg-background text-foreground">
      {/* Breadcrumb */}
      <div className="container mx-auto hidden px-6 py-4 md:block lg:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link href="/products" className="hover:text-foreground transition-colors">
            Products
          </Link>
          {product.category && categoryPath && (
            <>
              {product.category.parent && product.category.parent.isActive && (
                <>
                  <ChevronRight className="h-4 w-4 mx-2" />
                  <Link
                    href={`/categories/${product.category.parent.slug}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {product.category.parent.name}
                  </Link>
                </>
              )}
              <ChevronRight className="h-4 w-4 mx-2" />
              <Link
                href={categoryPath}
                className="hover:text-foreground transition-colors"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-foreground" aria-current="page">{product.name}</span>
        </nav>
      </div>

      <ProductSectionTabs
        hasDescription={!!product.description}
        hasSpecifications={visibleSpecs.length > 0}
        hasDetails={!!productContent}
      />

      {/* Product Detail - persistent two-column layout */}
      <div className="container mx-auto px-4 py-4 md:px-6 md:py-8 lg:px-8">
        <div className="grid lg:grid-cols-[3fr_2fr] gap-12 items-start">

          {/* LEFT COLUMN: Images + Content Sections */}
          <div className="order-2 lg:order-1">
            {/* Images */}
            <div className="hidden lg:block">
              <ProductImageGallery
                images={product.images}
                productName={product.name}
                hasDiscount={!!hasDiscount}
                discountPercentage={discountPercentage}
              />
            </div>

            {/* Description Section */}
            {product.description && (
              <section id="description" className="scroll-mt-[150px] pt-8 border-t mt-8">
                <h2 className="font-serif text-2xl mb-4">Description</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </section>
            )}
            {/* Specifications Section */}
            {visibleSpecs.length > 0 && (
              <section id="specifications" className="scroll-mt-[150px] pt-8 border-t mt-8">
                <h2 className="font-serif text-2xl mb-4">Specifications</h2>
                <div className="bg-muted/30 rounded-lg overflow-hidden">
                  <dl className="divide-y">
                    {visibleSpecs.map((spec, index) => (
                      <div key={index} className="flex py-3 px-4">
                        <dt className="w-1/3 text-muted-foreground">{spec.name}</dt>
                        <dd className="w-2/3 font-medium">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>
            )}

            {/* Product Details Section */}
            {productContent && (
              <section id="product-details" className="scroll-mt-[150px] pt-8 border-t mt-8">
                <h2 className="font-serif text-2xl mb-6">Product Details</h2>
                <ContentRenderer content={productContent} />
              </section>
            )}
          </div>
          {/* RIGHT COLUMN: Sticky Product Info */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-28 lg:z-[10] lg:self-start">
            {process.env.NEXT_PUBLIC_PROJECT_TYPE === "B2B" ? (
              <B2BProductActions
                productId={product.id}
                productName={product.name}
                productImage={product.images[0]?.url}
                sku={product.sku || undefined}
                defaultPrice={Number(product.price)}
                priceTiers={normalizedPriceTiers}
                variants={normalizedVariants}
              >
                {productInfoContent}
              </B2BProductActions>
            ) : (
              <div className="space-y-4 lg:space-y-6">
                {productInfoContent}
                <div className="pt-4">
                  <AddToCartButton
                    productId={product.id}
                    productName={product.name}
                    productPrice={Number(product.price)}
                    productImage={product.images[0]?.url}
                    size="lg"
                    className="w-full"
                  >
                    Add to Cart
                  </AddToCartButton>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Related Products */}
      {filteredRelated.length > 0 && (
        <section className="container mx-auto px-6 lg:px-8 py-16 border-t">
          <h2 className="font-serif text-2xl mb-8">Related Products</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredRelated.map((relatedProduct, index) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} index={index} />
            ))}
          </div>
        </section>
      )}
      </div>
    </>
  )
}
