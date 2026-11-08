import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { buildPageTitle } from '@/lib/seo-title'
import styles from '../customer-pages.module.css'

export const metadata: Metadata = {
  title: {
    default: buildPageTitle('Account Access'),
    template: '%s | Laifappe',
  },
  description: 'Sign in or create a Laifappe account to manage quotes, orders, and account settings.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className={`${styles.page} ${styles.auth}`}>
      <div className={styles.authInner}>
        <Link href="/" className={styles.brand} aria-label="Laifappe homepage">
          <Image src="/favicon.ico" alt="" width={38} height={38} />
          LAIFAPPE
        </Link>
        {children}
      </div>
    </main>
  )
}
