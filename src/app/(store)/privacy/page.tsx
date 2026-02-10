import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | MAISON',
  description: 'Privacy policy for MAISON B2B PPE store.',
}

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-6 lg:px-8 py-12 md:py-16 max-w-4xl">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: February 8, 2026</p>

      <div className="space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Information We Collect</h2>
          <p>
            We collect contact information, order details, shipping information, and communications you submit to process
            orders and provide support.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">How We Use Information</h2>
          <p>
            Data is used for order fulfillment, customer service, product recommendations, fraud prevention, and improving
            service quality.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Data Sharing</h2>
          <p>
            We only share data with service providers required to deliver our services, such as payment, logistics, and
            infrastructure partners.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Your Rights</h2>
          <p>
            You can request access, correction, or deletion of your personal data by contacting our support team.
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t text-sm">
        <Link href="/contact" className="text-primary hover:underline">
          Contact us for privacy-related requests
        </Link>
      </div>
    </div>
  )
}
