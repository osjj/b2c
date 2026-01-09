import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getProductBySlug, getProducts } from '@/actions/products'
import { formatPrice } from '@/lib/utils'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { ProductCard } from '@/components/store/product-card'

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

  return (
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
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden bg-muted">
              {product.images[0] ? (
                <Image
                  src={product.images[0].url}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
              {hasDiscount && (
                <span className="absolute top-4 right-4 bg-red-500 text-white text-sm px-3 py-1">
                  -{discountPercentage}%
                </span>
              )}
            </div>

            {/* Thumbnail gallery */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.slice(0, 4).map((image, index) => (
                  <div
                    key={image.id}
                    className="relative aspect-square overflow-hidden bg-muted cursor-pointer border-2 border-transparent hover:border-primary transition-colors"
                  >
                    <Image
                      src={image.url}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

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

            {product.description && (
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
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

            {/* SKU */}
            {product.sku && (
              <p className="text-sm text-muted-foreground">
                SKU: {product.sku}
              </p>
            )}

            {/* Add to Cart */}
            {product.stock > 0 ? (
              <div className="pt-4">
                <AddToCartButton productId={product.id} size="lg" className="w-full md:w-auto px-12">
                  Add to Cart
                </AddToCartButton>
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
  )
}
