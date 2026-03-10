# Store Components

Code templates for store frontend layout and components.

## src/app/(store)/layout.tsx

```tsx
import { Header } from "@/components/store/header"
import { Footer } from "@/components/store/footer"

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
```

## src/app/(store)/page.tsx

```tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gray-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Welcome to B2C Shop
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover amazing products at great prices. Quality you can trust.
          </p>
          <Button size="lg" asChild>
            <Link href="/products">Shop Now</Link>
          </Button>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">Featured Products</h2>
          <p className="text-muted-foreground">
            Products will be displayed here after applying the b2c-product skill.
          </p>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">Shop by Category</h2>
          <p className="text-muted-foreground">
            Categories will be displayed here after applying the b2c-product skill.
          </p>
        </div>
      </section>
    </div>
  )
}
```

## src/components/store/header.tsx

```tsx
import Link from "next/link"
import { ShoppingCart, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="/products" className="text-lg hover:text-primary">
                  Products
                </Link>
                <Link href="/categories" className="text-lg hover:text-primary">
                  Categories
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="text-xl font-bold">
            B2C Shop
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/products" className="text-sm hover:text-primary">
              Products
            </Link>
            <Link href="/categories" className="text-sm hover:text-primary">
              Categories
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
```

## src/components/store/footer.tsx

```tsx
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">B2C Shop</h3>
            <p className="text-sm text-muted-foreground">
              Your one-stop shop for quality products.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/products" className="hover:text-foreground">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-foreground">
                  Categories
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/account" className="hover:text-foreground">
                  My Account
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="hover:text-foreground">
                  Order History
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/contact" className="hover:text-foreground">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} B2C Shop. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
```

## src/app/(store)/products/page.tsx

```tsx
export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">All Products</h1>
      <p className="text-muted-foreground">
        Product listing will be implemented after applying the b2c-product skill.
      </p>
    </div>
  )
}
```

## src/app/(store)/cart/page.tsx

```tsx
export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
      <p className="text-muted-foreground">
        Cart functionality will be implemented after applying the b2c-cart skill.
      </p>
    </div>
  )
}
```
