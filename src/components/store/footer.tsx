'use client'

import Link from "next/link"
import { Instagram, Facebook, Twitter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

export function Footer() {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')

  const footerLinks = {
    shop: [
      { href: "/products", label: tNav('products') },
      { href: "/new-arrivals", label: tNav('newArrivals') },
      { href: "/categories", label: tNav('categories') },
      { href: "/sale", label: tNav('deals') },
    ],
    help: [
      { href: "/shipping", label: t('shippingInfo') },
      { href: "/faq", label: t('faq') },
      { href: "/contact", label: t('contactUs') },
      { href: "/size-guide", label: t('sizeGuide') },
    ],
    about: [
      { href: "/about", label: t('aboutUs') },
      { href: "/sustainability", label: t('careers') },
      { href: "/careers", label: t('careers') },
      { href: "/press", label: t('press') },
    ],
  }
  return (
    <footer className="border-t bg-secondary/30 relative overflow-hidden">
      {/* Decorative element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-border to-transparent" />

      <div className="container mx-auto px-6 lg:px-8 pt-20 pb-12">
        {/* Newsletter Section */}
        <div className="text-center mb-16 max-w-xl mx-auto">
          <h3 className="font-serif text-3xl mb-3">{t('subscribeNewsletter')}</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {t('newsletter')}
          </p>
          <form className="flex gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder={t('enterEmail')}
              className="flex-1 bg-background border-border/50 focus:border-primary"
            />
            <Button className="luxury-btn px-8">
              {t('subscribe')}
            </Button>
          </form>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-16 mb-16">
          <div>
            <h4 className="font-serif text-lg mb-6 tracking-wide">{tNav('shop')}</h4>
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
            <h4 className="font-serif text-lg mb-6 tracking-wide">{tNav('help')}</h4>
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
            <h4 className="font-serif text-lg mb-6 tracking-wide">{t('aboutUs')}</h4>
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
            <h4 className="font-serif text-lg mb-6 tracking-wide">{t('followUs')}</h4>
            <div className="flex gap-4">
              <Link
                href="#"
                className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              {t('customerService')}<br />
              <a href="mailto:hello@maison.com" className="hover:text-foreground transition-colors">
                hello@maison.com
              </a>
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} Maison. {t('allRightsReserved')}</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {t('privacyPolicy')}
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {t('termsOfService')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
