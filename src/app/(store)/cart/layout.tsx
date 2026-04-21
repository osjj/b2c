import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'

const baseUrl = getSiteUrl()
const pageUrl = `${baseUrl}/cart`
const pageTitle = 'Shopping Cart | Laifappe'
const pageDescription = 'Review the products in your cart before requesting a quote or checkout.'

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: pageUrl,
  },
  robots: {
    index: false,
    follow: true,
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
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
