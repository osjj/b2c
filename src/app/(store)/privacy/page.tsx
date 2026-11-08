import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../information.module.css'

export const metadata: Metadata = {
  title: 'Privacy Policy | Laifappe',
  description: 'Privacy policy for Laifappe B2B PPE store.',
  robots: { index: false, follow: true },
}

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.reading}>
        <header className={styles.heading}>
          <h1>Privacy Policy</h1>
          <p>Last updated: February 8, 2026</p>
        </header>

        <div className={styles.document}>
          <section>
            <h2>Information We Collect</h2>
            <p>
              We collect contact information, order details, shipping information, and communications you submit to process
              orders and provide support.
            </p>
          </section>
          <section>
            <h2>How We Use Information</h2>
            <p>
              Data is used for order fulfillment, customer service, product recommendations, fraud prevention, and improving
              service quality.
            </p>
          </section>
          <section>
            <h2>Data Sharing</h2>
            <p>
              We only share data with service providers required to deliver our services, such as payment, logistics, and
              infrastructure partners.
            </p>
          </section>
          <section>
            <h2>Your Rights</h2>
            <p>
              You can request access, correction, or deletion of your personal data by contacting our support team.
            </p>
          </section>
        </div>

        <div className={styles.footer}>
          <Link href="/contact">
            Contact us for privacy-related requests
          </Link>
        </div>
      </div>
    </div>
  )
}
