import type { Metadata } from 'next'
import { buildPageTitle } from '@/lib/seo-title'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {children}
      </div>
    </div>
  )
}
