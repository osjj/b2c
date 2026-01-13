"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

const categories = [
  {
    name: "Safety Gloves",
    description: "Cut-resistant, heat-resistant, chemical protection",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
    count: 120,
    href: "/products?category=gloves",
  },
  {
    name: "Safety Footwear",
    description: "Steel toe, composite toe, ESD protection",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=400&fit=crop",
    count: 85,
    href: "/products?category=footwear",
  },
  {
    name: "Workwear",
    description: "High-visibility, flame-resistant, waterproof",
    image: "https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=600&h=400&fit=crop",
    count: 95,
    href: "/products?category=workwear",
  },
  {
    name: "Head Protection",
    description: "Hard hats, bump caps, face shields",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop",
    count: 45,
    href: "/products?category=head-protection",
  },
  {
    name: "Eye Protection",
    description: "Safety glasses, goggles, face shields",
    image: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&h=400&fit=crop",
    count: 60,
    href: "/products?category=eye-protection",
  },
  {
    name: "Respiratory",
    description: "Masks, respirators, filters",
    image: "https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=600&h=400&fit=crop",
    count: 40,
    href: "/products?category=respiratory",
  },
]

export default function CategoryGrid() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Product Categories</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive range of PPE solutions for every industry and application
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="group relative aspect-[3/2] overflow-hidden rounded-lg"
            >
              <img
                src={category.image}
                alt={category.name}
                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{category.name}</h3>
                    <p className="text-sm text-white/80">{category.description}</p>
                    <p className="text-xs text-white/60 mt-1">{category.count} Products</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-primary transition-colors">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
