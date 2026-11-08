import type { Metadata } from 'next'
import styles from '../../customer-pages.module.css'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
}

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.page}>
      {children}
    </div>
  )
}
