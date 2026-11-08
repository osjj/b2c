import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { buildPageTitle } from '@/lib/seo-title'
import { User, Package, MapPin, Settings } from 'lucide-react'
import styles from '../../customer-pages.module.css'

const accountLinks = [
  { href: '/account', label: 'Profile', icon: User },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/settings', label: 'Settings', icon: Settings },
]

export const metadata: Metadata = {
  title: {
    default: buildPageTitle('My Account'),
    template: '%s | Account | Laifappe',
  },
  description: 'Manage your Laifappe profile, saved addresses, and account order history.',
  robots: {
    index: false,
    follow: true,
  },
}

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login?callbackUrl=/account')
  }

  return (
    <div className={styles.page}>
      <div className={`container ${styles.accountBody}`}>
        <aside>
          <nav aria-label="Account navigation" className={styles.accountNav}>
            {accountLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={styles.accountLink}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
