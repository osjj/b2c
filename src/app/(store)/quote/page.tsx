import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, FileText, Mail } from 'lucide-react'
import { QuoteRequestForm } from '@/modules/home-new/components'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Request a PPE Quote | Laifappe',
  description:
    'Send Laifappe your PPE categories, quantities, standards, target market, and delivery country for a construction PPE quote.',
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
      <section className="border-b bg-background">
        <div className="container mx-auto px-6 py-14 lg:px-8 lg:py-18">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Construction PPE RFQ
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Request a PPE quote with the details buyers actually need
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Share categories, quantities, standards, size range, target market, packaging needs, and delivery country. The source field is passed into the quote email history for follow-up tracking.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-8 px-6 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)] lg:px-8 lg:py-14">
        <div className="space-y-5">
          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileText className="h-4 w-4" />
              RFQ fields to include
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {[
                'Worker roles or job phases: general labor, road crew, demolition, scaffolding, equipment operators.',
                'PPE categories and standards: ANSI, ASTM, NIOSH, EN, CE, or buyer-specific requirements.',
                'Estimated quantities, replacement stock, and size curve for fit-critical items.',
                'Delivery country, packaging format, sample needs, and requested quotation deadline.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/downloads/construction-ppe-rfq-template.pdf">
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

        <div className="rounded-xl border bg-background p-5 shadow-sm">
          <QuoteRequestForm
            eyebrow="Request quote"
            source={source}
            title={
              <>
                Send your PPE list.
                <br />
                We respond within 24 hours.
              </>
            }
          />
        </div>
      </section>
    </main>
  )
}
