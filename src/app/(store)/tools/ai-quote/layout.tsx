import type { Metadata } from 'next'
import { buildPageTitle } from '@/lib/seo-title'
import { getSiteUrl } from '@/lib/site-url'

export const metadata: Metadata = {
  title: {
    absolute: buildPageTitle('AI Quote Generator | PPE & Safety Equipment Procurement Tool'),
  },
  description:
    'Describe your workforce, job site, and hazards — our AI instantly generates a customized PPE procurement quote matched to your real product catalog. Export to PDF or Excel in seconds.',
  keywords: [
    'PPE quote generator',
    'safety equipment procurement',
    'AI quote tool',
    'personal protective equipment',
    'industrial safety',
    'workplace safety gear',
    'bulk PPE order',
    'safety equipment quote',
  ],
  openGraph: {
    title: 'AI Quote Generator | PPE & Safety Equipment Procurement',
    description:
      'Instantly generate a customized safety equipment quote from a natural language description of your workforce and job site hazards.',
    type: 'website',
    locale: 'en_US',
    url: `${getSiteUrl()}/tools/ai-quote`,
    images: [
      {
        url: '/og-image-main.webp',
        width: 1200,
        height: 630,
        alt: 'AI Quote Generator — free PPE procurement tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Quote Generator | PPE Procurement Tool',
    description:
      'Describe your workforce and job site — get a customized PPE procurement quote in seconds.',
    images: ['/og-image-main.webp'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/tools/ai-quote',
  },
}

export default function AiQuoteLayout({ children }: { children: React.ReactNode }) {
  const siteUrl = getSiteUrl()

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${siteUrl}/tools` },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'AI Quote',
        item: `${siteUrl}/tools/ai-quote`,
      },
    ],
  }

  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'AI Quote Generator',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    url: `${siteUrl}/tools/ai-quote`,
    description:
      'Describe your workforce and hazards to instantly generate a customized PPE procurement quote matched to the live product catalog.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      {children}
    </>
  )
}
