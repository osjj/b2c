import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'

const baseUrl = getSiteUrl()
const pageUrl = `${baseUrl}/login`
const pageTitle = 'Login | Laifappe'
const pageDescription = 'Sign in to your Laifappe account to manage quotes, orders, and account details.'

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

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
