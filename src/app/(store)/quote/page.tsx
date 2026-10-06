import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, FileText, Mail } from 'lucide-react'
import { QuoteRequestForm } from '@/modules/home-new/components'
import { Button } from '@/components/ui/button'
import { getPublishedCase } from '@/lib/cases/data'
import { quotePageSource, resolveCaseInquiryContext } from '@/lib/cases/inquiry'

export const metadata: Metadata = {
  title: 'Request a PPE Quote | Laifappe',
  description:
    'Tell Laifappe what PPE you need and get a construction PPE quote within 24 hours.',
  alternates: {
    canonical: '/quote',
  },
}

type QuotePageProps = {
  searchParams: Promise<{ source?: string | string[]; case?: string | string[] }>
}

export default async function QuotePage({ searchParams }: QuotePageProps) {
  const params = await searchParams
  const context = await resolveCaseInquiryContext(params.case, getPublishedCase)
  const source = context?.source ?? quotePageSource(params.source)

  return (
    <main className="min-h-screen bg-ppe-bg-page">
      <h1 className="sr-only">Request a PPE quote</h1>

      <section className="container mx-auto grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,1.18fr)] lg:px-8 lg:py-14">
        <div className="order-2 space-y-5 lg:order-1">
          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileText className="h-4 w-4" />
              Optional details that help us quote faster
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {[
                'Product type or jobsite use: high-vis clothing, respirators, gloves, helmets, footwear, or mixed PPE kits.',
                'Estimated quantity, size range, standards, or delivery country if you already know them.',
                'You can start with a short message. We will ask for missing details during follow-up.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link
                  href="/downloads/construction-ppe-rfq-template"
                  data-source="quote-page"
                >
                  RFQ template
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href="mailto:sales@laifappe.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Email sales
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="order-1 min-w-0 space-y-5 lg:order-2">
          {context && (
            <aside aria-label="Your procurement case reference" className="rounded-xl border bg-secondary/30 p-5 text-sm">
              <p className="text-muted-foreground">Discuss a similar project</p>
              <Link href={context.caseHref} className="mt-2 flex min-h-11 items-center gap-2 font-semibold text-foreground hover:underline">
                <span className="min-w-0 break-words">{context.title}</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
              <p className="mt-2 leading-relaxed text-muted-foreground">Edit the message below to describe your own PPE requirements.</p>
            </aside>
          )}
          <QuoteRequestForm key={context?.slug ?? 'quote-page'} source={source} initialMessage={context?.initialMessage} />
        </div>
      </section>
    </main>
  )
}
