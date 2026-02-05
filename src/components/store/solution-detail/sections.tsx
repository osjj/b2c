import type { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type {
  SolutionSectionItem,
  SectionHeroData,
  SectionParagraphsData,
  SectionListData,
  SectionTableData,
  SectionGroupData,
  SectionCalloutData,
  SectionCtaData,
  SectionFaqData,
} from '@/types/solution'

interface SolutionSectionsProps {
  sections: SolutionSectionItem[]
}

export function SolutionSections({ sections }: SolutionSectionsProps) {
  if (!sections || sections.length === 0) return null

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <SectionRenderer key={section.key} section={section} />
      ))}
    </div>
  )
}

function SectionRenderer({ section }: { section: SolutionSectionItem }) {
  const common = (children: ReactNode) => (
    <section id={section.key} className="scroll-mt-24 space-y-4">
      {section.title && (
        <h2 className="text-xl md:text-2xl font-semibold text-foreground">
          {section.title}
        </h2>
      )}
      {children}
    </section>
  )

  switch (section.type) {
    case 'hero': {
      const data = section.data as SectionHeroData
      const bullets = Array.isArray(data?.bullets) ? data.bullets : []
      return common(
        <div className="space-y-3">
          {data?.intro && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {data.intro}
            </p>
          )}
          {bullets.length > 0 && (
            <ul className="space-y-2 text-sm text-foreground">
              {bullets.map((bullet, index) => (
                <li key={`${bullet}-${index}`} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    }
    case 'paragraphs': {
      const data = section.data as SectionParagraphsData
      const paragraphs = Array.isArray(data?.paragraphs) ? data.paragraphs : []
      return common(
        <div className="space-y-3">
          {paragraphs.map((paragraph, index) => (
            <p key={`${section.key}-p-${index}`} className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      )
    }
    case 'list': {
      const data = section.data as SectionListData
      const items = Array.isArray(data?.items) ? data.items : []
      return common(
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={`${section.key}-i-${index}`} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
              <div className="space-y-1">
                {item.title && (
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                )}
                {item.text && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )
    }
    case 'table': {
      const data = section.data as SectionTableData
      const headers = Array.isArray(data?.headers) ? data.headers : []
      const rows = Array.isArray(data?.rows) ? data.rows : []
      return common(
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            {headers.length > 0 && (
              <thead className="bg-muted/50">
                <tr>
                  {headers.map((header, index) => (
                    <th key={`${section.key}-h-${index}`} className="px-4 py-2 text-left font-semibold text-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${section.key}-r-${rowIndex}`} className="border-t">
                  {row.map((cell, cellIndex) => (
                    <td key={`${section.key}-c-${rowIndex}-${cellIndex}`} className="px-4 py-2 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'group': {
      const data = section.data as SectionGroupData
      const groups = Array.isArray(data?.groups) ? data.groups : []
      return common(
        <div className="space-y-6">
          {groups.map((group, index) => {
            const items = Array.isArray(group.items) ? group.items : []
            return (
            <div key={`${section.key}-g-${index}`} className="rounded-lg border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {items.map((item, itemIndex) => (
                  <li key={`${section.key}-g-${index}-${itemIndex}`} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )})}
        </div>
      )
    }
    case 'callout': {
      const data = section.data as SectionCalloutData
      return common(
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {data?.text}
        </div>
      )
    }
    case 'cta': {
      const data = section.data as SectionCtaData
      return common(
        <div className="rounded-2xl border bg-foreground text-background px-6 py-6">
          <h3 className="text-lg font-semibold">{data?.title}</h3>
          {data?.text && (
            <p className="mt-2 text-sm text-background/80">{data.text}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {data?.primaryLabel && data?.primaryHref && (
              <Button asChild>
                <Link href={data.primaryHref}>{data.primaryLabel}</Link>
              </Button>
            )}
            {data?.secondaryLabel && data?.secondaryHref && (
              <Button variant="secondary" asChild>
                <Link href={data.secondaryHref}>{data.secondaryLabel}</Link>
              </Button>
            )}
          </div>
        </div>
      )
    }
    case 'faq': {
      const data = section.data as SectionFaqData
      const items = Array.isArray(data?.items) ? data.items : []
      return common(
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={`${section.key}-f-${index}`} className="rounded-lg border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">{item.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      )
    }
    default:
      return null
  }
}
