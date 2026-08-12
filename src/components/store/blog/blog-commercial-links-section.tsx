import Link from 'next/link'
import {
  ArrowRight,
  Boxes,
  ClipboardCheck,
  ShoppingBag,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BlogCommercialLinks } from '@/lib/blog-commercial-links'

interface BlogCommercialLinksSectionProps {
  links: BlogCommercialLinks | undefined
}

export function BlogCommercialLinksSection({ links }: BlogCommercialLinksSectionProps) {
  if (!links) {
    return null
  }

  return (
    <section className="mt-14 rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Related PPE
          </p>
          <h2 className="mt-3 font-serif text-2xl leading-tight text-foreground sm:text-3xl">
            Source the PPE covered in this guide
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Move from research to a buyer shortlist with the matching solution page,
            category paths, selected PPE options, and RFQ next steps.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
            <Link
              href={links.cta.href}
              data-source={links.cta.source}
              className="rounded-full border px-3 py-1.5 transition-colors hover:border-primary/40 hover:text-primary"
            >
              Request quote
            </Link>
            <Link
              href={links.solution.href}
              data-source={links.solution.source}
              className="rounded-full border px-3 py-1.5 transition-colors hover:border-primary/40 hover:text-primary"
            >
              Build PPE kit
            </Link>
            {links.solution.href !==
              '/solutions/ppe-safety-equipment-for-mining-quarrying' && (
              <Link
                data-download-asset="construction-ppe-checklist"
                data-download-source="blog-commercial-links"
                href="/downloads/construction-ppe-checklist.pdf"
                className="rounded-full border px-3 py-1.5 transition-colors hover:border-primary/40 hover:text-primary"
              >
                Download checklist
              </Link>
            )}
            {links.resources?.map((resource) => (
              <Link
                key={`${resource.href}-${resource.label}`}
                href={resource.href}
                data-source={resource.source}
                className="rounded-full border px-3 py-1.5 transition-colors hover:border-primary/40 hover:text-primary"
              >
                {resource.label}
              </Link>
            ))}
          </div>
        </div>

        <Button asChild size="lg" className="shrink-0">
          <Link href={links.cta.href} data-source={links.cta.source}>
            <ClipboardCheck className="h-4 w-4" />
            {links.cta.label}
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <SectionLabel icon={Boxes} label="Solution" />
          <Link
            href={links.solution.href}
            data-source={links.solution.source}
            className="mt-3 inline-flex items-center gap-2 text-base font-semibold text-primary underline-offset-4 hover:underline"
          >
            {links.solution.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div>
          <SectionLabel icon={Tags} label="PPE categories" />
          <div className="mt-3 flex flex-wrap gap-2">
            {links.categories.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                data-source={category.source}
                className="rounded-full border bg-muted/30 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {category.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 border-t pt-7">
        <SectionLabel icon={ShoppingBag} label="Buyer shortlist" />
        <ul className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {links.products.map((product) => (
            <li key={product.href}>
              <Link
                href={product.href}
                data-source={product.source}
                className="group inline-flex items-start gap-2 text-sm font-medium leading-relaxed text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                <span>{product.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </div>
  )
}
