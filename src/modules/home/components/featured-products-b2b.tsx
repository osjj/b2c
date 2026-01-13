"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Star } from "lucide-react"

const featuredProducts = [
  {
    id: "1",
    name: "Cut-Resistant Gloves Level 5",
    description: "HPPE liner with PU palm coating",
    price: "MOQ: 1000 pairs",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=500&fit=crop",
    rating: 4.8,
    certifications: ["CE EN388", "ANSI A5"],
  },
  {
    id: "2",
    name: "Steel Toe Safety Boots",
    description: "Oil and slip resistant, S3 rated",
    price: "MOQ: 500 pairs",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop",
    rating: 4.9,
    certifications: ["CE EN ISO 20345", "S3 SRC"],
  },
  {
    id: "3",
    name: "Hi-Vis Safety Vest Class 3",
    description: "Reflective strips, breathable mesh",
    price: "MOQ: 2000 pcs",
    image: "https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400&h=500&fit=crop",
    rating: 4.7,
    certifications: ["EN ISO 20471", "ANSI Class 3"],
  },
  {
    id: "4",
    name: "Industrial Safety Helmet",
    description: "ABS shell, 6-point suspension",
    price: "MOQ: 1000 pcs",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=500&fit=crop",
    rating: 4.8,
    certifications: ["CE EN397", "ANSI Z89.1"],
  },
]

export default function FeaturedProductsB2B() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <p className="text-sm tracking-wide uppercase text-primary mb-2 font-medium">
              Best Sellers
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Featured Products</h2>
          </div>
          <Link
            href="/products"
            className="text-sm font-medium text-primary hover:underline mt-4 md:mt-0 flex items-center gap-1"
          >
            View All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group bg-card rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                <img
                  src={product.image}
                  alt={product.name}
                  className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1 mb-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{product.rating}</span>
                </div>
                <h3 className="font-bold mb-1 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {product.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
                <p className="text-sm font-semibold text-primary">{product.price}</p>
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
