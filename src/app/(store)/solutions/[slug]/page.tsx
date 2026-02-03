import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Factory, HardHat, Home, ShieldCheck } from 'lucide-react'
import { getSolutionBySlug, getProductsBySolution } from '@/actions/solutions'
import { INDUSTRY_LABELS, type PpeCategoryItem, type MaterialItem } from '@/types/solution'
import { Button } from '@/components/ui/button'
import {
  SolutionHero,
  TableOfContents,
  HazardsSection,
  PpeSection,
  MaterialsSection,
  ProductsSection,
  StandardsSection,
  FaqSection,
} from '@/components/store/solution-detail'

// Editor.js content type matching ContentRenderer expectations
interface EditorJSContent {
  time?: number
  version?: string
  blocks: Array<{
    id: string
    type: string
    data: Record<string, any>
  }>
}

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const solution = await getSolutionBySlug(slug)

  if (!solution) {
    return {
      title: 'Solution Not Found',
      description: 'The requested solution could not be found.',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const solutionUrl = `${baseUrl}/solutions/${slug}`

  const title = solution.metaTitle || solution.title
  const description =
    solution.metaDescription ||
    solution.subtitle ||
    `Discover PPE solutions for ${INDUSTRY_LABELS[solution.industry]}. Safety equipment, standards, and products.`

  const keywords = solution.metaKeywords
    ? solution.metaKeywords.split(',').map((k: string) => k.trim())
    : [solution.title, INDUSTRY_LABELS[solution.industry], 'PPE', 'safety equipment', 'protective gear']

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: solutionUrl,
      siteName: 'PPE Pro',
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

  // Fetch related products
  const { products } = await getProductsBySolution(solution.industry, { limit: 8 })

  // Type assertions for JSON fields
  const hazardsContent = solution.hazardsContent as EditorJSContent | null
  const standardsContent = solution.standardsContent as EditorJSContent | null
  const faqContent = solution.faqContent as EditorJSContent | null
  const ppeCategories = solution.ppeCategories as PpeCategoryItem[] | null
  const materials = solution.materials as MaterialItem[] | null

  // Build table of contents
  const tocItems = [
    hazardsContent?.blocks?.length && { id: 'hazards', title: 'Common Hazards' },
    ppeCategories?.length && { id: 'ppe-categories', title: 'PPE Categories' },
    materials?.length && { id: 'materials', title: 'Materials' },
    products.length > 0 && { id: 'products', title: 'Recommended Products' },
    standardsContent?.blocks?.length && { id: 'standards', title: 'Standards & Certifications' },
    faqContent?.blocks?.length && { id: 'faq', title: 'FAQ' },
  ].filter(Boolean) as { id: string; title: string }[]

  const industryLabel = INDUSTRY_LABELS[solution.industry]
  const summaryStats = {
    ppeCount: ppeCategories?.length ?? 0,
    materialsCount: materials?.length ?? 0,
    productCount: products.length,
    hasHazards: Boolean(hazardsContent?.blocks?.length),
    hasStandards: Boolean(standardsContent?.blocks?.length),
    hasFaq: Boolean(faqContent?.blocks?.length),
  }

  return (
    <div className="bg-ppe-bg-page">
      {/* Breadcrumb */}
      <nav className="container mx-auto py-4 px-6 lg:px-8 text-sm">
        <ol className="flex items-center gap-2 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              <Home className="h-4 w-4" />
            </Link>
          </li>
          <ChevronRight className="h-4 w-4" />
          <li>
            <Link href="/solutions" className="hover:text-foreground transition-colors">
              Solutions
            </Link>
          </li>
          <ChevronRight className="h-4 w-4" />
          <li className="text-foreground font-medium truncate">{solution.title}</li>
        </ol>
      </nav>

      {/* Hero */}
      <SolutionHero
        title={solution.title}
        subtitle={solution.subtitle}
        industry={solution.industry}
        coverImage={solution.coverImage}
        stats={summaryStats}
      />

      {/* Focus Strip */}
      <section className="border-y bg-background/80">
        <div className="container mx-auto py-6 px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-background/80 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <HardHat className="h-5 w-5 text-primary" />
                Operational Focus
              </div>
              <p className="mt-3 text-base font-semibold text-foreground">
                Built for real jobsite conditions.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Align PPE choices with hazards, workflow, and compliance targets.
              </p>
            </div>
            <div className="rounded-2xl border bg-background/80 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Compliance Ready
              </div>
              <p className="mt-3 text-base font-semibold text-foreground">
                Standards-driven guidance.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Certifications, materials, and documentation mapped to your needs.
              </p>
            </div>
            <div className="rounded-2xl border bg-background/80 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Factory className="h-5 w-5 text-primary" />
                Scalable Supply
              </div>
              <p className="mt-3 text-base font-semibold text-foreground">
                OEM/ODM support at volume.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Custom specs, branding, and bulk fulfillment for procurement teams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto py-10 px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-12">
          {/* Content Sections */}
          <div className="space-y-12">
            <HazardsSection content={hazardsContent} />
            <PpeSection categories={ppeCategories} />
            <MaterialsSection materials={materials} />
            <ProductsSection products={products} industryName={industryLabel} />
            <StandardsSection content={standardsContent} />
            <FaqSection content={faqContent} />
          </div>

          {/* Sidebar - Table of Contents */}
          <aside className="hidden lg:block space-y-6">
            <div className="rounded-2xl border bg-background/90 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Procurement Support
              </p>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                Need a tailored PPE plan?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Talk with our specialists about compliance, lead times, and custom specs.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button asChild>
                  <Link href="/products">Browse Products</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/cases">View Success Cases</Link>
                </Button>
              </div>
            </div>
            <TableOfContents items={tocItems} />
          </aside>
        </div>
      </div>
    </div>
  )
}
