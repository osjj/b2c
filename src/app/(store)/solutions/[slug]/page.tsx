import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Download,
  Factory,
  FileCheck,
  Home,
  ShieldCheck,
} from 'lucide-react'
import { getSolutionBySlug } from '@/actions/solutions'
import { formatUsageSceneLabel, type UsageScene } from '@/lib/usage-scenes'
import { SolutionHero, SolutionSections } from '@/components/store/solution-detail'
import { TableOfContents } from '@/components/store/solution-detail/table-of-contents'
import { ToolRecommendationsSection } from '@/components/store/tool-recommendations-section'
import type { SolutionSectionItem } from '@/types/solution'
import type { SectionFaqData } from '@/types/solution'
import { prisma } from '@/lib/prisma'
import {
  RECOMMENDED_PPE_BLOCK_KEY,
  resolveRecommendationMode,
} from '@/lib/solution-recommendations'
import { getToolRecommendationsForSolution } from '@/lib/tool-recommendations'
import type { ProductImage, Category } from '@prisma/client'
import { getSiteUrl } from '@/lib/site-url'
import { ArticleJsonLd, BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo'

type Props = {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600
export const dynamic = 'force-static'

type RecommendedProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  stock: number
  isActive: boolean
  isFeatured: boolean
  images: ProductImage[]
  category: Category | null
  priceTiers?: Array<{
    id: string
    minQuantity: number
    maxQuantity: number | null
    price: number
    sortOrder: number
  }>
}

const TRUST_PROOF_ITEMS = [
  {
    title: 'Standards',
    description: 'CE, EN, ANSI/ISEA and buyer-specific standard checks can be mapped before quoting.',
    icon: ShieldCheck,
  },
  {
    title: 'Certification',
    description: 'Certificate samples and product compliance files are available for qualified bulk buyers.',
    icon: Award,
  },
  {
    title: 'Sample docs',
    description: 'Use sample sheets, RFQ templates, and size standards before finalizing order quantities.',
    icon: FileCheck,
  },
  {
    title: 'Factory proof',
    description: 'Direct factory supply with OEM/ODM support, inspection workflow, and repeat order handling.',
    icon: Factory,
  },
]

const PROCUREMENT_DOWNLOADS = [
  {
    id: 'construction-ppe-checklist',
    href: '/downloads/construction-ppe-checklist.pdf',
    label: 'Checklist PDF',
    description: 'Field-ready construction PPE checklist for site supervisors.',
    action: 'Download',
    isDownload: true,
  },
  {
    id: 'construction-ppe-rfq-template',
    href: '/downloads/construction-ppe-rfq-template',
    label: 'RFQ template',
    description: 'Open the template page before downloading or sending a quote request.',
    action: 'Open template',
    isDownload: false,
  },
  {
    id: 'ppe-size-standards-planning-sheet',
    href: '/downloads/ppe-size-standards-planning-sheet.xlsx',
    label: 'Size sheet',
    description: 'Spreadsheet for sizing, standards, and replacement planning.',
    action: 'Download',
    isDownload: true,
  },
]

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const solution = await getSolutionBySlug(slug)

  if (!solution) {
    return {
      title: 'Solution Not Found',
      description: 'The requested solution could not be found.',
    }
  }

  const baseUrl = getSiteUrl()
  const solutionUrl = `${baseUrl}/solutions/${slug}`

  const usageScenesLabel = solution.usageScenes
    .slice(0, 2)
    .map((s: string) => formatUsageSceneLabel(s as UsageScene))
    .join(', ')

  const title = solution.seoTitle || solution.title
  const description =
    solution.seoDescription ||
    solution.excerpt ||
    `Discover PPE solutions for ${usageScenesLabel}. Safety equipment, standards, and products.`

  const keywords = solution.seoKeywords
    ? solution.seoKeywords.split(',').map((k: string) => k.trim())
    : [solution.title, usageScenesLabel, 'PPE', 'safety equipment', 'protective gear']

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: solutionUrl,
      siteName: 'Laifappe',
      images: solution.coverImage
        ? [
            {
              url: solution.coverImage,
              width: 1200,
              height: 630,
              alt: solution.title,
            },
          ]
        : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: solution.coverImage ? [solution.coverImage] : [],
    },
    alternates: {
      canonical: solutionUrl,
    },
  }
}

export default async function SolutionDetailPage({ params }: Props) {
  const { slug } = await params
  const solution = await getSolutionBySlug(slug)

  if (!solution) {
    notFound()
  }

  const sections = ((solution.sections || []) as unknown as SolutionSectionItem[])
    .filter((section) => section.enabled)
    .sort((a, b) => a.sort - b.sort)

  const recommendedSection = sections.find((section) => section.key === RECOMMENDED_PPE_BLOCK_KEY)
  const recommendationMode = resolveRecommendationMode(
    (recommendedSection?.data as { mode?: unknown } | undefined)?.mode
  )
  const manualProductIds = (solution.productLinks || [])
    .filter((link) => link.blockKey === RECOMMENDED_PPE_BLOCK_KEY)
    .sort((a, b) => a.sort - b.sort)
    .map((link) => link.productId)

  let recommendedProducts: RecommendedProduct[] = []

  if (recommendedSection) {
    if (recommendationMode === 'manual' && manualProductIds.length > 0) {
      const rawProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          id: { in: manualProductIds },
        },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          priceTiers: { orderBy: { sortOrder: 'asc' } },
        },
      })

      const productOrder = new Map(manualProductIds.map((id, index) => [id, index]))
      recommendedProducts = rawProducts
        .sort((a, b) => (productOrder.get(a.id) ?? 9999) - (productOrder.get(b.id) ?? 9999))
        .map((product) => ({
          ...product,
          price: Number(product.price),
          comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
          priceTiers: product.priceTiers.map((tier) => ({
            ...tier,
            price: Number(tier.price),
          })),
        }))
    }

    if (recommendationMode === 'rule' && solution.usageScenes.length > 0) {
      const rawProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          usageScenes: { hasSome: solution.usageScenes },
        },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          priceTiers: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: 6,
      })

      recommendedProducts = rawProducts.map((product) => ({
        ...product,
        price: Number(product.price),
        comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
        priceTiers: product.priceTiers.map((tier) => ({
          ...tier,
          price: Number(tier.price),
        })),
      }))
    }
  }

  const productsBySectionKey =
    recommendedSection && recommendedProducts.length > 0
      ? { [recommendedSection.key]: recommendedProducts }
      : {}

  const tocItems = sections
    .filter((section) => section.title)
    .map((section) => ({ id: section.key, title: section.title as string }))
  const hasToc = tocItems.length > 0
  const relatedTools = getToolRecommendationsForSolution({
    slug,
    title: solution.title,
    excerpt: solution.excerpt,
    usageScenes: solution.usageScenes,
  })
  const baseUrl = getSiteUrl()
  const solutionUrl = `${baseUrl}/solutions/${solution.slug}`
  const description =
    solution.seoDescription ||
    solution.excerpt ||
    `PPE solution guide for ${solution.title}.`
  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Solutions', url: `${baseUrl}/solutions` },
    { name: solution.title, url: solutionUrl },
  ]
  const faqItems = sections.flatMap((section) => {
    if (section.type !== 'faq') {
      return []
    }

    const data = section.data as SectionFaqData
    return Array.isArray(data.items)
      ? data.items
          .filter((item) => item.q && item.a)
          .map((item) => ({ question: item.q, answer: item.a }))
      : []
  })
  const solutionSource = `solution-${slug}`
  const solutionResourceSections = (
    <>
      <SolutionTrustProofSection />
      <SolutionProcurementDownloads source={solutionSource} />
      <ToolRecommendationsSection
        tools={relatedTools}
        title="Move from PPE guidance to order planning"
        description="These tools help buyers convert the solution into sizing checks, compliance review, quantity planning, and a faster quote request."
      />
    </>
  )

  return (
    <div className="bg-ppe-bg-page min-h-screen pb-16">
      <ArticleJsonLd
        type="TechArticle"
        headline={solution.title}
        description={description}
        url={solutionUrl}
        image={solution.coverImage}
        datePublished={solution.createdAt}
        dateModified={solution.updatedAt}
        publisherLogoUrl={`${baseUrl}/logo.png`}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FaqJsonLd items={faqItems} />
      <nav className="container mx-auto py-2.5 px-4 lg:px-6 text-xs border-b bg-background/50">
        <ol className="flex items-center gap-1.5 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li>
            <Link href="/solutions" className="hover:text-foreground transition-colors">
              Solutions
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="text-foreground font-medium truncate max-w-[200px]">{solution.title}</li>
        </ol>
      </nav>

      <SolutionHero
        title={solution.title}
        excerpt={solution.excerpt}
        usageScenes={solution.usageScenes}
        coverImage={solution.coverImage}
      />

      <div className="container mx-auto py-8 px-4 lg:px-6">
        {hasToc ? (
          <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <TableOfContents items={tocItems} />
            </aside>
            <div className="max-w-4xl space-y-6">
              <SolutionSections sections={sections} productsBySectionKey={productsBySectionKey} />
              {solutionResourceSections}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl space-y-6">
            <SolutionSections sections={sections} productsBySectionKey={productsBySectionKey} />
            {solutionResourceSections}
          </div>
        )}
      </div>
    </div>
  )
}

function SolutionTrustProofSection() {
  return (
    <section className="overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Trust proof
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Standards ready
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Verify standards before sending an RFQ
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Review the required standards, certificate samples, document needs, and factory capability before confirming
            quantities, packaging, and delivery details.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {TRUST_PROOF_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="rounded-xl border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  </div>
                  <p className="text-sm leading-5 text-muted-foreground">{item.description}</p>
                </article>
              )
            })}
          </div>
        </div>
        <div className="relative min-h-[260px] border-t bg-muted/40 lg:border-l lg:border-t-0">
          <Image
            src="/newpage/xuanchuan/zhengshu02.png"
            alt="Laifappe PPE certification document sample"
            fill
            sizes="(max-width: 1024px) 100vw, 260px"
            className="object-contain p-4"
          />
        </div>
      </div>
    </section>
  )
}

function SolutionProcurementDownloads({ source }: { source: string }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Related downloads
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Turn this solution into a buying brief
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Download the checklist, RFQ template, and size sheet, then send quantities and standards through the quote
            form.
          </p>
        </div>
        <Link
          href="/quote"
          data-source={source}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Request quote
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {PROCUREMENT_DOWNLOADS.map((asset) => (
          <Link
            key={asset.id}
            href={asset.href}
            data-source={source}
            download={asset.isDownload ? true : undefined}
            data-download-asset={asset.isDownload ? asset.id : undefined}
            data-download-source={asset.isDownload ? source : undefined}
            className="group flex min-w-0 flex-col rounded-xl border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-foreground">{asset.label}</span>
            <span className="mt-2 text-sm leading-5 text-muted-foreground">{asset.description}</span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary">
              {asset.action}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3 border-t pt-5 text-sm">
        {[
          { href: '/blog/construction-ppe-checklist', label: 'Checklist guide' },
          { href: '/blog/bulk-construction-ppe-procurement', label: 'Bulk buying' },
          { href: '/tools/ppe-calculator', label: 'PPE calculator' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex min-h-10 items-center rounded-md border px-4 font-medium text-foreground transition-colors hover:bg-muted"
          >
            <CheckCircle2 className="mr-2 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
