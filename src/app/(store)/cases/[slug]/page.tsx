import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CaseDetail } from '@/components/cases/case-detail'
import { serializeCaseJsonLd } from '@/components/cases/case-format'
import { getPublishedCase } from '@/lib/cases/data'
import { COMPANY_NAME } from '@/lib/company'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const caseStudy = await getPublishedCase(slug)
  if (!caseStudy) return {
    title: 'Procurement Case Not Found',
    description: 'This procurement case is not available.',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: { title: 'Procurement Case Not Found', description: 'This procurement case is not available.', images: [] },
    twitter: { title: 'Procurement Case Not Found', description: 'This procurement case is not available.', card: 'summary', images: [] },
  }
  const title = caseStudy.seoTitle || caseStudy.title
  const description = caseStudy.seoDescription || caseStudy.summary
  const url = `${getSiteUrl()}/cases/${caseStudy.slug}`
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: {
      title, description, type: 'article', url,
      publishedTime: caseStudy.publishedAt || undefined,
      modifiedTime: caseStudy.updatedAt,
      images: caseStudy.coverImage ? [{ url: caseStudy.coverImage, alt: caseStudy.coverAlt }] : [],
    },
    twitter: { card: caseStudy.coverImage ? 'summary_large_image' : 'summary', title, description, images: caseStudy.coverImage ? [caseStudy.coverImage] : [] },
  }
}

export default async function CasePage({ params }: Props) {
  const { slug } = await params
  const caseStudy = await getPublishedCase(slug)
  if (!caseStudy) notFound()
  const baseUrl = getSiteUrl()
  const url = `${baseUrl}/cases/${caseStudy.slug}`
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article', '@id': `${url}#article`,
        headline: caseStudy.title,
        description: caseStudy.seoDescription || caseStudy.summary,
        url, mainEntityOfPage: url,
        ...(caseStudy.coverImage ? { image: new URL(caseStudy.coverImage, baseUrl).href } : {}),
        ...(caseStudy.publishedAt ? { datePublished: caseStudy.publishedAt } : {}),
        dateModified: caseStudy.updatedAt,
        author: { '@type': 'Organization', name: COMPANY_NAME },
        publisher: { '@type': 'Organization', name: COMPANY_NAME, url: baseUrl },
        inLanguage: 'en',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Procurement cases', item: `${baseUrl}/cases` },
          { '@type': 'ListItem', position: 3, name: caseStudy.title, item: url },
        ],
      },
    ],
  }
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeCaseJsonLd(structuredData) }} /><CaseDetail caseStudy={caseStudy} /></>
}
