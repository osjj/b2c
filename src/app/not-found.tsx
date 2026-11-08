import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildPageTitle } from '@/lib/seo-title'
import { getSiteUrl } from '@/lib/site-url'
import styles from './customer-pages.module.css'

const baseUrl = getSiteUrl()
const pageTitle = buildPageTitle('Page Not Found')
const pageDescription = 'The requested Laifappe page could not be found.'

export const metadata: Metadata = {
  title: {
    absolute: pageTitle,
  },
  description: pageDescription,
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: baseUrl,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className="container mx-auto flex min-h-screen max-w-4xl items-center px-6 py-24 lg:px-8">
        <div className={`${styles.panel} w-full min-w-0 p-5 sm:p-10`}>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            Laifappe
          </p>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <h1>
                This page is not available.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                The link may be outdated, the page may have moved, or the URL may be incorrect.
                You can return to the catalog, browse current product categories, or start from the
                homepage.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/categories">
                    Browse Categories
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="border bg-foreground p-5 text-background sm:p-6">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center border border-current text-[#ffad85]">
                <Search className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-extrabold">Popular next steps</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed">
                <li>
                  <Link href="/products" className="hover:underline">
                    View the full PPE product catalog
                  </Link>
                </li>
                <li>
                  <Link href="/solutions" className="hover:underline">
                    Explore industry PPE solutions
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:underline">
                    Contact Laifappe for help finding the right page
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
