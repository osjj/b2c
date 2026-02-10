import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy | MAISON',
  description: 'Cookie policy for MAISON B2B PPE store.',
}

export default function CookiesPage() {
  return (
    <div className="container mx-auto px-6 lg:px-8 py-12 md:py-16 max-w-4xl">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">Cookie Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: February 8, 2026</p>

      <div className="space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">What Cookies We Use</h2>
          <p>
            We use essential cookies for login and shopping flow, preference cookies for basic settings, and analytics
            cookies to understand site performance.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Why We Use Cookies</h2>
          <p>
            Cookies help keep your cart and account session stable, improve page loading, and support customer service and
            operational analysis.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Managing Cookies</h2>
          <p>
            You can control or delete cookies in your browser settings. Disabling essential cookies may affect core
            features like checkout and account access.
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t text-sm">
        <Link href="/privacy" className="text-primary hover:underline">
          Read our full Privacy Policy
        </Link>
      </div>
    </div>
  )
}
