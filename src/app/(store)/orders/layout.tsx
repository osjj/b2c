import type { Metadata } from 'next'
import { buildPageTitle } from '@/lib/seo-title'
import { getSiteUrl } from '@/lib/site-url'

const baseUrl = getSiteUrl()
const ordersUrl = `${baseUrl}/orders`
const ordersTitle = buildPageTitle('Order Lookup & History')
const ordersDescription =
  'Look up an order number, review recent purchases, and access post-checkout order details on Laifappe.'

export const metadata: Metadata = {
  title: {
    absolute: ordersTitle,
  },
  description: ordersDescription,
  alternates: {
    canonical: ordersUrl,
  },
  openGraph: {
    title: ordersTitle,
    description: ordersDescription,
    url: ordersUrl,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: ordersTitle,
    description: ordersDescription,
  },
  robots: { index: false, follow: true },
}

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
