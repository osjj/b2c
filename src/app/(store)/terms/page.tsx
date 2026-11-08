import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../information.module.css'

export const metadata: Metadata = {
  title: 'Terms of Service | Laifappe',
  description: 'Terms of service for Laifappe B2B PPE store.',
  robots: { index: false, follow: true },
}

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.reading}>
        <header className={styles.heading}>
          <h1>Terms of Service</h1>
          <p>Last updated: February 8, 2026</p>
        </header>

        <div className={styles.document}>
          <section>
            <h2>Orders and Payment</h2>
            <p>
              Orders are subject to stock availability and confirmation. Pricing, shipping fees, and payment terms are
              shown during checkout or quote processing.
            </p>
          </section>
          <section>
            <h2>Product Information</h2>
            <p>
              We make reasonable efforts to ensure product information is accurate. Product images and descriptions may
              differ from final delivered goods due to batch and supplier updates.
            </p>
          </section>
          <section>
            <h2>Returns and Support</h2>
            <p>
              For return requests or order issues, contact support with order number and problem details. Resolution will be
              handled according to order status and applicable regulations.
            </p>
          </section>
          <section>
            <h2>Liability</h2>
            <p>
              Our liability is limited to the amount paid for the affected order to the extent permitted by law.
            </p>
          </section>
        </div>

        <div className={styles.footer}>
          <Link href="/contact">
            Contact us for contract and legal questions
          </Link>
        </div>
      </div>
    </div>
  )
}
