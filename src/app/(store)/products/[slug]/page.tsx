import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import { getProductBySlug, getProducts } from '@/actions/products'
import { getTierPriceRange, type PriceTier } from '@/lib/pricing'
import { formatPrice } from '@/lib/utils'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { B2BProductActions } from '@/components/store/b2b-product-actions'
import { ProductCard } from '@/components/store/product-card'
import { ProductImageGallery } from '@/components/store/product-image-gallery'
import { ContentRenderer } from '@/components/store/content-renderer'
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo'
import { ProductSectionTabs } from '@/components/store/product-section-tabs'
import { buildPageTitle } from '@/lib/seo-title'
import { getSiteUrl } from '@/lib/site-url'

type Props = {
  params: Promise<{ slug: string }>
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
  const productImage = (product as any).ogImage || product.images[0]?.url
  const productImageAlt = product.images[0]?.alt || product.name

  // Use SEO fields from database if available, otherwise fallback to defaults
  const title = (product as any).metaTitle || product.name
  const description =
    (product as any).metaDescription ||
    product.description?.slice(0, 160) ||
    `Shop ${product.name} at Laifappe. High-quality protective equipment.`

  // Parse keywords from database or generate defaults
  const keywordsFromDb = (product as any).metaKeywords
  const keywords = keywordsFromDb
    ? keywordsFromDb.split(',').map((k: string) => k.trim())
    : [product.name, product.category?.name, 'PPE', 'safety equipment', product.sku].filter(Boolean)

  // OG fields with fallbacks
  const ogTitle = (product as any).ogTitle || title
  const ogDescription = (product as any).ogDescription || description

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
  const tierPriceRange = getTierPriceRange(normalizedPriceTiers)
  const displayPrice = tierPriceRange
    ? tierPriceRange.min === tierPriceRange.max
      ? formatPrice(tierPriceRange.min)
      : `${formatPrice(tierPriceRange.min)}~${formatPrice(tierPriceRange.max).replace(/^\$/, '')}`
    : formatPrice(Number(product.price))

  const baseUrl = getSiteUrl()

  // 过滤内部来源字段。既要匹配原始 key（sourceUrl1688 / offerId1688），
  // 也要匹配被 AI 规范化后的人类可读标签（"1688 Source URL" / "1688 Offer ID"）
  const INTERNAL_SPEC_KEYS_NORMALIZED = new Set([
    'sourceurl1688',
    'offerid1688',
    '1688sourceurl',
    '1688offerid',
  ])
  const isInternalSpec = (name: string) => {
    const n = (name || '').toLowerCase().replace(/[\s_\-]+/g, '')
    return INTERNAL_SPEC_KEYS_NORMALIZED.has(n)
  }
  const visibleSpecs = (product.specifications && Array.isArray(product.specifications))
    ? (product.specifications as Array<{name: string, value: string}>)
        .filter(spec => !isInternalSpec(spec.name))
    : []

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

  return (
    <>
      {/* SEO: Structured Data */}
      <ProductJsonLd product={product} baseUrl={baseUrl} />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <div>
      {/* Breadcrumb */}
      <div className="container mx-auto px-6 lg:px-8 py-4">
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

      {/* Product Detail - persistent two-column layout */}
      <div className="container mx-auto px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[3fr_2fr] gap-12 items-start">

          {/* LEFT COLUMN: Images + Content Sections */}
          <div className="order-2 lg:order-1">
            {/* Images */}
            <ProductImageGallery
              images={product.images}
              productName={product.name}
              hasDiscount={!!hasDiscount}
              discountPercentage={discountPercentage}
            />

            {/* Sticky Tab Navigation */}
            <ProductSectionTabs
              hasDescription={!!product.description}
              hasSpecifications={visibleSpecs.length > 0}
              hasDetails={!!product.content}
            />

            {/* Description Section */}
            {product.description && (
              <section id="description" className="pt-8 border-t mt-8">
                <h2 className="font-serif text-2xl mb-4">Description</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </section>
            )}
            {/* Specifications Section */}
            {visibleSpecs.length > 0 && (
              <section id="specifications" className="pt-8 border-t mt-8">
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
            {product.content && (
              <section id="product-details" className="pt-8 border-t mt-8">
                <h2 className="font-serif text-2xl mb-6">Product Details</h2>
                <ContentRenderer content={product.content as any} />
              </section>
            )}
          </div>
          {/* RIGHT COLUMN: Sticky Product Info */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-28 lg:self-start lg:z-[10] lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="space-y-6">
              {product.category && (
                <p className="text-sm tracking-[0.2em] uppercase text-primary">
                  {product.category.name}
                </p>
              )}

              <h1 className="font-serif text-3xl md:text-4xl">{product.name}</h1>

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
              {product.sku && (
                <p className="text-sm text-muted-foreground">
                  SKU: {product.sku}
                </p>
              )}

              {/* Add to Cart or Quote */}
              <div className="pt-4">
                {process.env.NEXT_PUBLIC_PROJECT_TYPE === "B2B" ? (
                  <B2BProductActions
                    productId={product.id}
                    productName={product.name}
                    productImage={product.images[0]?.url}
                    sku={product.sku || undefined}
                    defaultPrice={Number(product.price)}
                    priceTiers={normalizedPriceTiers}
                  />
                ) : (
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
                )}
              </div>
            </div>
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
