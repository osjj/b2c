import Link from "next/link"
import { Instagram, Facebook, Twitter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const footerLinks = {
  shop: [
    { href: "/products", label: "All Products" },
    { href: "/products?sort=best-sellers", label: "Best Sellers" },
    { href: "/categories", label: "Categories" },
    { href: "/solutions", label: "Industry Solutions" },
  ],
  help: [
    { href: "/orders?tab=lookup", label: "Order Lookup" },
    { href: "/orders", label: "My Orders" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact Us" },
    { href: "/account/orders", label: "Account Orders" },
  ],
  about: [
    { href: "/about", label: "Our Story" },
    { href: "/cases", label: "Case Studies" },
    { href: "/news", label: "News" },
    { href: "/contact?topic=partnership", label: "Partnership" },
  ],
}

const socialLinks = [
  { href: "https://www.instagram.com/", label: "Instagram", icon: Instagram },
  { href: "https://www.facebook.com/", label: "Facebook", icon: Facebook },
  { href: "https://twitter.com/", label: "Twitter", icon: Twitter },
]

export function Footer() {
  return (
    <footer className="border-t bg-secondary/30 relative overflow-hidden">
      {/* Decorative element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-border to-transparent" />

      <div className="container mx-auto px-6 lg:px-8 pt-20 pb-12">
        {/* Newsletter Section */}
        <div className="text-center mb-16 max-w-xl mx-auto">
          <h3 className="font-serif text-3xl mb-3">Join Our World</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Subscribe for exclusive offers, featured products, and curated industry stories.
          </p>
          <form className="flex gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-background border-border/50 focus:border-primary"
            />
            <Button className="luxury-btn px-8">
              Subscribe
            </Button>
          </form>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-16 mb-16">
          <div>
            <h4 className="font-serif text-lg mb-6 tracking-wide">Shop</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors editorial-link"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-lg mb-6 tracking-wide">Help</h4>
            <ul className="space-y-3">
              {footerLinks.help.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors editorial-link"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-lg mb-6 tracking-wide">About</h4>
            <ul className="space-y-3">
              {footerLinks.about.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors editorial-link"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-lg mb-6 tracking-wide">Follow</h4>
            <div className="flex gap-4">
              {socialLinks.map((item) => {
                const Icon = item.icon
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Customer Service<br />
              <a href="mailto:info@laifappe.com" className="hover:text-foreground transition-colors">
                info@laifappe.com
              </a>
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} Maison. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">
              Cookie Settings
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
