import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'

const baseUrl = getSiteUrl()
const pageUrl = `${baseUrl}/register`
const pageTitle = 'Register | Laifappe'
const pageDescription =
  'Create a Laifappe account to manage PPE orders, save company details, and request quotes faster.'

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
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
