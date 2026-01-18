import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { getCollectionProducts } from "@/actions/collections"

export default async function FeaturedProductsB2B() {
  const data = await getCollectionProducts("best-sellers", 8)

  if (!data || data.products.length === 0) {
    return null
  }

  const { collection, products } = data

  return (
    <section className="py-20">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <p className="text-sm tracking-wide uppercase text-primary mb-2 font-medium">
              {collection.name}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Featured Products</h2>
          </div>
          <Link
            // href={`/collections/${collection.slug}`}
             href="/products"
            className="text-sm font-medium text-primary hover:underline mt-4 md:mt-0 flex items-center gap-1"
          >
            View All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group bg-card rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-white">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    No Image
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold mb-1 group-hover:text-primary transition-colors line-clamp-2">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}
                <div className="flex items-baseline gap-2">
                  {product.lowestTierPrice ? (
                    <>
                      <span className="text-sm text-muted-foreground">From</span>
                      <span className="font-semibold text-primary">
                        ${product.lowestTierPrice.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-primary">
                      ${product.price.toFixed(2)}
                    </span>
                  )}
                  {product.comparePrice && product.comparePrice > product.price && (
                    <span className="text-sm text-muted-foreground line-through">
                      ${product.comparePrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button size="lg" variant="outline" asChild>
            <Link href="/products">
              Browse All Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
