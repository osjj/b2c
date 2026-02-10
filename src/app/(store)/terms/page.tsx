import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | MAISON',
  description: 'Terms of service for MAISON B2B PPE store.',
}

export default function TermsPage() {
  return (
    <div className="container mx-auto px-6 lg:px-8 py-12 md:py-16 max-w-4xl">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: February 8, 2026</p>

      <div className="space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Orders and Payment</h2>
          <p>
            Orders are subject to stock availability and confirmation. Pricing, shipping fees, and payment terms are
            shown during checkout or quote processing.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Product Information</h2>
          <p>
            We make reasonable efforts to ensure product information is accurate. Product images and descriptions may
            differ from final delivered goods due to batch and supplier updates.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Returns and Support</h2>
          <p>
            For return requests or order issues, contact support with order number and problem details. Resolution will be
            handled according to order status and applicable regulations.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Liability</h2>
          <p>
            Our liability is limited to the amount paid for the affected order to the extent permitted by law.
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t text-sm">
        <Link href="/contact" className="text-primary hover:underline">
          Contact us for contract and legal questions
        </Link>
      </div>
    </div>
  )
}
