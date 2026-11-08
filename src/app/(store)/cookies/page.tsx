import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteUrl } from '@/lib/site-url'
import styles from '../information.module.css'

const baseUrl = getSiteUrl()
const pageUrl = `${baseUrl}/cookies`
const pageTitle = 'Cookie Policy | Laifappe'
const pageDescription = 'Cookie policy for Laifappe B2B PPE store.'

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: pageUrl,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
  },
  robots: { index: false, follow: true },
}

export default function CookiesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.reading}>
        <header className={styles.heading}>
          <h1>Cookie Policy</h1>
          <p>Last updated: February 8, 2026</p>
        </header>

        <div className={styles.document}>
          <section>
            <h2>What Cookies We Use</h2>
            <p>
              We use essential cookies for login and shopping flow, preference cookies for basic settings, and analytics
              cookies to understand site performance.
            </p>
          </section>
          <section>
            <h2>Why We Use Cookies</h2>
            <p>
              Cookies help keep your cart and account session stable, improve page loading, and support customer service and
              operational analysis.
            </p>
          </section>
          <section>
            <h2>Managing Cookies</h2>
            <p>
              You can control or delete cookies in your browser settings. Disabling essential cookies may affect core
              features like checkout and account access.
            </p>
          </section>
        </div>

        <div className={styles.footer}>
          <Link href="/privacy">
            Read our full Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}
