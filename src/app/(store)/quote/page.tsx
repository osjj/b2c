import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, FileText, Mail } from 'lucide-react'
import { QuoteRequestForm } from '@/modules/home-new/components'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Request a PPE Quote | Laifappe',
  description:
    'Tell Laifappe what PPE you need and get a construction PPE quote within 24 hours.',
  alternates: {
    canonical: '/quote',
  },
}

type QuotePageProps = {
  searchParams: Promise<{ source?: string | string[] }>
}

function normalizeSource(source: string | string[] | undefined) {
  const value = Array.isArray(source) ? source[0] : source
  return value?.trim().slice(0, 80) || 'Quote page'
}

export default async function QuotePage({ searchParams }: QuotePageProps) {
  const params = await searchParams
  const source = normalizeSource(params.source)

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
          <div className="rounded-xl border bg-secondary/30 p-5 text-sm text-muted-foreground">
            Source tracked for this request: <span className="font-semibold text-foreground">{source}</span>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <QuoteRequestForm source={source} />
        </div>
      </section>
    </main>
  )
}
