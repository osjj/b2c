import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, FileText, Mail } from 'lucide-react'
import { QuoteRequestForm } from '@/modules/home-new/components'
import { getPublishedCase } from '@/lib/cases/data'
import { quotePageSource, resolveCaseInquiryContext } from '@/lib/cases/inquiry'
import { FootwearAllocationInquiry } from '@/components/store/footwear-allocation-inquiry'
import { GloveMarkingInquiry } from '@/components/store/glove-marking-inquiry'
import styles from './quote-page.module.css'

export const metadata: Metadata = {
  title: 'Request a PPE Quote | Laifappe',
  description:
    'Tell Laifappe what PPE you need and get a construction PPE quote within 24 hours.',
  alternates: {
    canonical: '/quote',
  },
}

type QuotePageProps = {
  searchParams: Promise<{ source?: string | string[]; case?: string | string[]; tool?: string | string[]; draft?: string | string[] }>
}

export default async function QuotePage({ searchParams }: QuotePageProps) {
  const params = await searchParams
  const context = await resolveCaseInquiryContext(params.case, getPublishedCase)
  const source = context?.source ?? quotePageSource(params.source)

  return (
    <div className={styles.page} data-quote-page>
      <div className={styles.container}>
        <header className={styles.heading}>
          <h1>Request a PPE quote</h1>
        </header>

        <div className={styles.layout}>
          <div className={styles.formArea} data-quote-theme="industrial">
            {context && (
              <aside aria-label="Your procurement case reference" className={styles.caseReference}>
                <p>Discuss a similar project</p>
                <Link href={context.caseHref}>
                  <span>{context.title}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <p>Edit the message below to describe your own PPE requirements.</p>
              </aside>
            )}
            {!context && params.tool === 'footwear-size-allocation' ? (
              <FootwearAllocationInquiry key={typeof params.draft === 'string' ? params.draft : 'missing-draft'} draftId={typeof params.draft === 'string' ? params.draft : ''} />
            ) : !context && params.tool === 'glove-marking-decoder' ? (
              <GloveMarkingInquiry key={typeof params.draft === 'string' ? params.draft : 'missing-glove-draft'} draftId={typeof params.draft === 'string' ? params.draft : ''} />
            ) : (
              <QuoteRequestForm key={context?.slug ?? 'quote-page'} source={source} initialMessage={context?.initialMessage} />
            )}
          </div>

          <aside className={styles.details} aria-labelledby="quote-details-title">
            <h2 id="quote-details-title">
              <FileText size={20} aria-hidden="true" />
              Optional details that help us quote faster
            </h2>
            <ul className={styles.checklist}>
              {[
                'Product type or jobsite use: high-vis clothing, respirators, gloves, helmets, footwear, or mixed PPE kits.',
                'Estimated quantity, size range, standards, or delivery country if you already know them.',
                'You can start with a short message. We will ask for missing details during follow-up.',
              ].map((item) => (
                <li key={item}>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              <Link href="/downloads/construction-ppe-rfq-template" data-source="quote-page">
                RFQ template
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a href="mailto:sales@laifappe.com">
                <Mail size={16} aria-hidden="true" />
                Email sales
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
