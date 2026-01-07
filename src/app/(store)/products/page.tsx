"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Grid3X3, LayoutGrid, SlidersHorizontal, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

// Placeholder products
const products = [
  {
    id: "1",
    name: "Artisan Ceramic Vase",
    price: 89,
    image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=600&h=800&fit=crop",
    category: "Home Decor",
    isNew: true,
  },
  {
    id: "2",
    name: "Linen Blend Throw",
    price: 145,
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&h=800&fit=crop",
    category: "Textiles",
    isNew: false,
  },
  {
    id: "3",
    name: "Handwoven Basket Set",
    price: 68,
    image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=600&h=800&fit=crop",
    category: "Storage",
    isNew: false,
  },
  {
    id: "4",
    name: "Botanical Print",
    price: 120,
    image: "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=600&h=800&fit=crop",
    category: "Art",
    isNew: true,
  },
  {
    id: "5",
    name: "Marble Candle Holder",
    price: 55,
    image: "https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=600&h=800&fit=crop",
    category: "Home Decor",
    isNew: false,
  },
  {
    id: "6",
    name: "Wool Area Rug",
    price: 320,
    image: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&h=800&fit=crop",
    category: "Textiles",
    isNew: true,
  },
  {
    id: "7",
    name: "Minimalist Clock",
    price: 78,
    image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&h=800&fit=crop",
    category: "Home Decor",
    isNew: false,
  },
  {
    id: "8",
    name: "Ceramic Planter",
    price: 45,
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&h=800&fit=crop",
    category: "Garden",
    isNew: false,
  },
]

const categories = ["All", "Home Decor", "Textiles", "Storage", "Art", "Garden"]

function FilterSidebar({ className }: { className?: string }) {
  const [priceRange, setPriceRange] = useState([0, 500])

  return (
    <div className={cn("space-y-8", className)}>
      {/* Categories */}
      <div>
        <h4 className="font-serif text-lg mb-4">Categories</h4>
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors editorial-link"
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-serif text-lg mb-4">Price Range</h4>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={500}
          step={10}
          className="mb-4"
        />
        <div className="flex items-center gap-4">
          <Input
            type="number"
            value={priceRange[0]}
            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
            className="h-9"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="number"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            className="h-9"
          />
        </div>
      </div>

      {/* Availability */}
      <div>
        <h4 className="font-serif text-lg mb-4">Availability</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="rounded border-border" />
            <span className="text-muted-foreground">In Stock</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="rounded border-border" />
            <span className="text-muted-foreground">New Arrivals</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="rounded border-border" />
            <span className="text-muted-foreground">On Sale</span>
          </label>
        </div>
      </div>

      <Button variant="outline" className="w-full">
        <X className="h-4 w-4 mr-2" />
        Clear Filters
      </Button>
    </div>
  )
}

export default function ProductsPage() {
  const [gridCols, setGridCols] = useState<3 | 4>(4)

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative py-20 bg-secondary/30">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm tracking-[0.2em] uppercase text-primary mb-2 animate-fade-up">
              Our Collection
            </p>
            <h1 className="font-serif text-4xl md:text-6xl mb-4 animate-fade-up stagger-1">
              All Products
            </h1>
            <p className="text-muted-foreground animate-fade-up stagger-2">
              Discover our curated selection of thoughtfully designed pieces for modern living.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 lg:px-8 py-12">
        <div className="flex gap-12">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterSidebar />
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b">
              <p className="text-sm text-muted-foreground">
                Showing <span className="text-foreground font-medium">{products.length}</span> products
              </p>

              <div className="flex items-center gap-4">
                {/* Mobile Filter */}
                <Sheet>
                  <SheetTrigger asChild className="lg:hidden">
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle className="font-serif text-2xl">Filters</SheetTitle>
                    </SheetHeader>
                    <FilterSidebar className="mt-8" />
                  </SheetContent>
                </Sheet>

                {/* Sort */}
                <Select defaultValue="featured">
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="name">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>

                {/* Grid Toggle */}
                <div className="hidden md:flex items-center gap-1 border rounded-md p-1">
                  <button
                    onClick={() => setGridCols(3)}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      gridCols === 3 ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setGridCols(4)}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      gridCols === 4 ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div
              className={cn(
                "grid gap-6 lg:gap-8",
                gridCols === 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"
              )}
            >
              {products.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group opacity-0 animate-fade-up"
                  style={{ animationDelay: `${0.05 + index * 0.05}s` }}
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted mb-4">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors" />

                    {/* Badges */}
                    {product.isNew && (
                      <span className="absolute top-4 left-4 bg-primary text-primary-foreground text-xs px-3 py-1 tracking-wider uppercase">
                        New
                      </span>
                    )}

                    {/* Quick Add */}
                    <Button
                      size="sm"
                      className="absolute bottom-4 left-4 right-4 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                    >
                      Quick Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground tracking-wide mb-1">
                    {product.category}
                  </p>
                  <h3 className="font-serif text-lg mb-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-sm font-medium">${product.price}</p>
                </Link>
              ))}
            </div>

            {/* Load More */}
            <div className="mt-16 text-center">
              <Button variant="outline" size="lg" className="px-12">
                Load More Products
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
