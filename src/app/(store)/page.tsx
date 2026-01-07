import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Star, Truck, Shield, RotateCcw } from "lucide-react"

// Placeholder featured products
const featuredProducts = [
  {
    id: "1",
    name: "Artisan Ceramic Vase",
    price: 89,
    image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=600&h=800&fit=crop",
    category: "Home Decor",
  },
  {
    id: "2",
    name: "Linen Blend Throw",
    price: 145,
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&h=800&fit=crop",
    category: "Textiles",
  },
  {
    id: "3",
    name: "Handwoven Basket Set",
    price: 68,
    image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=600&h=800&fit=crop",
    category: "Storage",
  },
  {
    id: "4",
    name: "Botanical Print",
    price: 120,
    image: "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=600&h=800&fit=crop",
    category: "Art",
  },
]

const categories = [
  {
    name: "Living Room",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&h=600&fit=crop",
    count: 42,
  },
  {
    name: "Bedroom",
    image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=600&fit=crop",
    count: 38,
  },
  {
    name: "Kitchen",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    count: 56,
  },
]

const features = [
  {
    icon: Truck,
    title: "Free Shipping",
    description: "On orders over $150",
  },
  {
    icon: Shield,
    title: "Secure Payment",
    description: "100% protected checkout",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description: "30-day return policy",
  },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background with overlay */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&h=1080&fit=crop')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        </div>

        <div className="container mx-auto px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl">
            <p className="text-sm tracking-[0.3em] uppercase text-primary mb-4 opacity-0 animate-fade-up">
              New Collection 2025
            </p>
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium leading-[0.9] mb-6 opacity-0 animate-fade-up stagger-1">
              Curated
              <br />
              <span className="italic font-normal">for Living</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mb-10 opacity-0 animate-fade-up stagger-2">
              Discover thoughtfully designed pieces that transform your space into a sanctuary of style and comfort.
            </p>
            <div className="flex flex-wrap gap-4 opacity-0 animate-fade-up stagger-3">
              <Button size="lg" className="luxury-btn h-14 px-10 text-sm tracking-wider" asChild>
                <Link href="/products">
                  Explore Collection
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-10 text-sm tracking-wider border-foreground/20 hover:bg-foreground hover:text-background"
                asChild
              >
                <Link href="/about">Our Story</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-muted-foreground to-transparent" />
        </div>
      </section>

      {/* Features Bar */}
      <section className="border-y bg-card">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-center gap-4 py-8 px-6 justify-center">
                <feature.icon className="h-6 w-6 text-primary" />
                <div>
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <p className="text-sm tracking-[0.2em] uppercase text-primary mb-2">Handpicked</p>
              <h2 className="font-serif text-4xl md:text-5xl">Featured Products</h2>
            </div>
            <Link
              href="/products"
              className="text-sm tracking-wide editorial-link text-muted-foreground hover:text-foreground mt-4 md:mt-0"
            >
              View All Products
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {featuredProducts.map((product, index) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group opacity-0 animate-fade-up"
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-muted mb-4">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors" />
                  <Button
                    size="sm"
                    className="absolute bottom-4 left-4 right-4 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                  >
                    Quick Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground tracking-wide mb-1">{product.category}</p>
                <h3 className="font-serif text-lg mb-1 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm font-medium">${product.price}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial Banner */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container mx-auto px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=1000&fit=crop"
                  alt="Interior"
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-48 h-48 border border-primary/20" />
            </div>
            <div className="lg:pl-12">
              <p className="text-sm tracking-[0.2em] uppercase text-primary mb-4">The Maison Philosophy</p>
              <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-6">
                Crafted with intention, designed for life
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Every piece in our collection is carefully selected for its quality, craftsmanship, and timeless design.
                We believe in creating spaces that inspire and comfort, with objects that tell a story and stand the test of time.
              </p>
              <Button variant="outline" className="h-12 px-8 tracking-wider" asChild>
                <Link href="/about">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-24">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm tracking-[0.2em] uppercase text-primary mb-2">Browse</p>
            <h2 className="font-serif text-4xl md:text-5xl">Shop by Room</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={`/categories/${category.name.toLowerCase().replace(" ", "-")}`}
                className="group relative aspect-[4/3] overflow-hidden"
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <h3 className="font-serif text-3xl mb-1">{category.name}</h3>
                  <p className="text-sm opacity-80">{category.count} Products</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-primary text-primary" />
              ))}
            </div>
            <blockquote className="font-serif text-2xl md:text-3xl italic leading-relaxed mb-8">
              &ldquo;The quality and attention to detail in every piece is remarkable. Maison has completely transformed how I think about my living space.&rdquo;
            </blockquote>
            <cite className="text-sm text-muted-foreground not-italic tracking-wide">
              Sarah M. &mdash; Verified Buyer
            </cite>
          </div>
        </div>
      </section>

      {/* Instagram Feed Placeholder */}
      <section className="py-24">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm tracking-[0.2em] uppercase text-primary mb-2">@maisonhome</p>
            <h2 className="font-serif text-4xl">Follow Our Journey</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
