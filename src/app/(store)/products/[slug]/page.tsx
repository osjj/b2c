import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import { getProductBySlug, getProducts } from '@/actions/products'
import { formatPrice } from '@/lib/utils'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { AddToQuoteButton } from '@/components/store/add-to-quote-button'
import { B2BProductActions } from '@/components/store/b2b-product-actions'
import { ProductCard } from '@/components/store/product-card'
import { ProductImageGallery } from '@/components/store/product-image-gallery'
import { ContentRenderer } from '@/components/store/content-renderer'
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const productUrl = `${baseUrl}/products/${slug}`
  const productImage = (product as any).ogImage || product.images[0]?.url
  const productImageAlt = product.images[0]?.alt || product.name

  // Use SEO fields from database if available, otherwise fallback to defaults
  const title = (product as any).metaTitle || product.name
  const description =
    (product as any).metaDescription ||
    product.description?.slice(0, 160) ||
    `Shop ${product.name} at PPE Pro. High-quality protective equipment.`

  // Parse keywords from database or generate defaults
  const keywordsFromDb = (product as any).metaKeywords
  const keywords = keywordsFromDb
    ? keywordsFromDb.split(',').map((k: string) => k.trim())
    : [product.name, product.category?.name, 'PPE', 'safety equipment', product.sku].filter(Boolean)

  // OG fields with fallbacks
  const ogTitle = (product as any).ogTitle || title
  const ogDescription = (product as any).ogDescription || description

  return {
    title,
    description,
    keywords: keywords as string[],
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: productUrl,
      siteName: 'PPE Pro',
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
      'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Breadcrumb items for JSON-LD
  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Products', url: `${baseUrl}/products` },
    ...(product.category
      ? [{ name: product.category.name, url: `${baseUrl}/categories/${product.category.slug}` }]
      : []),
    { name: product.name, url: `${baseUrl}/products/${product.slug}` },
  ]

  return (
    <>
      {/* SEO: Structured Data */}
      <ProductJsonLd product={product as any} baseUrl={baseUrl} />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <div>
      {/* Breadcrumb */}
      <div className="container mx-auto px-6 lg:px-8 py-4">
        <nav className="flex items-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link href="/products" className="hover:text-foreground transition-colors">
            Products
          </Link>
          {product.category && (
            <>
              <ChevronRight className="h-4 w-4 mx-2" />
              <Link
                href={`/products?category=${product.category.id}`}
                className="hover:text-foreground transition-colors"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-foreground">{product.name}</span>
        </nav>
      </div>

      {/* Product Detail */}
      <div className="container mx-auto px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Images */}
          <ProductImageGallery
            images={product.images}
            productName={product.name}
            hasDiscount={!!hasDiscount}
            discountPercentage={discountPercentage}
          />

          {/* Info */}
          <div className="space-y-6">
            {product.category && (
              <p className="text-sm tracking-[0.2em] uppercase text-primary">
                {product.category.name}
              </p>
            )}

            <h1 className="font-serif text-3xl md:text-4xl">{product.name}</h1>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-medium">
                {formatPrice(Number(product.price))}
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
                      // For multiselect, find option values from attribute options
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

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {product.stock > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">
                    In Stock ({product.stock} available)
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm text-muted-foreground">Out of Stock</span>
                </>
              )}
            </div>

            {/* Add to Cart or Quote based on project type */}
            {product.stock > 0 ? (
              <div className="pt-4">
                {process.env.NEXT_PUBLIC_PROJECT_TYPE === 'B2B' ? (
                  <B2BProductActions
                    productId={product.id}
                    productName={product.name}
                    productImage={product.images[0]?.url}
                    sku={product.sku || undefined}
                    defaultPrice={Number(product.price)}
                    priceTiers={product.priceTiers?.map(t => ({
                      id: t.id,
                      minQuantity: t.minQuantity,
                      maxQuantity: t.maxQuantity,
                      price: Number(t.price),
                      sortOrder: t.sortOrder,
                    })) || []}
                    stock={product.stock}
                  />
                ) : (
                  <AddToCartButton
                    productId={product.id}
                    productName={product.name}
                    productPrice={Number(product.price)}
                    productImage={product.images[0]?.url}
                    stock={product.stock}
                    size="lg"
                    className="w-full"
                  >
                    Add to Cart
                  </AddToCartButton>
                )}
              </div>
            ) : (
              <div className="pt-4">
                <p className="text-muted-foreground">
                  This product is currently out of stock.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Description Section */}
        {product.description && (
          <div className="mt-12 border-t pt-8">
            <h2 className="font-serif text-2xl mb-4">Description</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}

        {/* Specifications Section */}
        {product.specifications && Array.isArray(product.specifications) && product.specifications.length > 0 && (
          <div className="mt-12 border-t pt-8">
            <h2 className="font-serif text-2xl mb-4">Specifications</h2>
            <div className="bg-muted/30 rounded-lg overflow-hidden">
              <dl className="divide-y">
                {(product.specifications as Array<{name: string, value: string}>).map((spec, index) => (
                  <div key={index} className="flex py-3 px-4">
                    <dt className="w-1/3 text-muted-foreground">{spec.name}</dt>
                    <dd className="w-2/3 font-medium">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* Product Details Section (Editor.js Content) */}
        {product.content && (
          <div className="mt-12 border-t pt-8">
            <h2 className="font-serif text-2xl mb-6">Product Details</h2>
            <ContentRenderer content={product.content as any} />
          </div>
        )}
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
