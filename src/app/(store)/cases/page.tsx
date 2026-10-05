import type { Metadata } from 'next'
import { CaseListing } from '@/components/cases/case-listing'
import { listPublishedCases } from '@/lib/cases/data'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

const title = 'PPE Procurement Cases | LAIFAPPE'
const description = 'Explore documented PPE procurement projects: buyer requirements, order quantities, customization and the sample-to-shipment process.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${getSiteUrl()}/cases` },
  openGraph: { title, description, type: 'website', url: `${getSiteUrl()}/cases`, images: [] },
  twitter: { card: 'summary', title, description, images: [] },
}

export default async function CasesPage() {
  return <CaseListing cases={await listPublishedCases()} />
}
