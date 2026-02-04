import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Home, MessageSquare, ShoppingBag } from 'lucide-react'
import { getCategoriesBySlugs } from '@/actions/categories'
import { getSolutionBySlug, getProductsBySolution } from '@/actions/solutions'
import { formatUsageSceneLabel, type UsageScene } from '@/lib/usage-scenes'
import { type PpeCategoryItem, type MaterialItem } from '@/types/solution'
import {
  SolutionHero,
  HazardsSection,
  PpeSection,
  MaterialsSection,
  ProductsSection,
  StandardsSection,
  FaqSection,
} from '@/components/store/solution-detail'

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

  const usageScenesLabel = solution.usageScenes
    .slice(0, 2)
    .map((s: string) => formatUsageSceneLabel(s as UsageScene))
    .join(', ')

  const title = solution.metaTitle || solution.title
  const description =
    solution.metaDescription ||
    solution.subtitle ||
    `Discover PPE solutions for ${usageScenesLabel}. Safety equipment, standards, and products.`

  const keywords = solution.metaKeywords
    ? solution.metaKeywords.split(',').map((k: string) => k.trim())
    : [solution.title, usageScenesLabel, 'PPE', 'safety equipment', 'protective gear']

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

  const { products } = await getProductsBySolution(solution.usageScenes, { limit: 8 })

  const hazardsContent = solution.hazardsContent as EditorJSContent | null
  const standardsContent = solution.standardsContent as EditorJSContent | null
  const faqContent = solution.faqContent as EditorJSContent | null
  const ppeCategories = solution.ppeCategories as PpeCategoryItem[] | null
  const materials = solution.materials as MaterialItem[] | null
  const ppeCategorySlugs = ppeCategories?.map((item) => item.categorySlug) ?? []
  const ppeCategoryLabels = ppeCategorySlugs.length
    ? await getCategoriesBySlugs(ppeCategorySlugs, { includeInactive: true })
    : []

  const tocItems = [
    hazardsContent?.blocks?.length && { id: 'hazards', title: 'Hazards' },
    ppeCategories?.length && { id: 'ppe-categories', title: 'PPE' },
    materials?.length && { id: 'materials', title: 'Materials' },
    products.length > 0 && { id: 'products', title: 'Products' },
    standardsContent?.blocks?.length && { id: 'standards', title: 'Standards' },
    faqContent?.blocks?.length && { id: 'faq', title: 'FAQ' },
  ].filter(Boolean) as { id: string; title: string }[]

  const industryLabel = solution.usageScenes
    .slice(0, 2)
    .map((s: string) => formatUsageSceneLabel(s as UsageScene))
    .join(', ')
  const summaryStats = {
    ppeCount: ppeCategories?.length ?? 0,
    materialsCount: materials?.length ?? 0,
    productCount: products.length,
    hasHazards: Boolean(hazardsContent?.blocks?.length),
    hasStandards: Boolean(standardsContent?.blocks?.length),
    hasFaq: Boolean(faqContent?.blocks?.length),
  }

  return (
    <div className="bg-ppe-bg-page min-h-screen pb-20">
      {/* Breadcrumb */}
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

      {/* Hero with integrated TOC */}
      <SolutionHero
        title={solution.title}
        subtitle={solution.subtitle}
        usageScenes={solution.usageScenes}
        coverImage={solution.coverImage}
        tocItems={tocItems}
        stats={summaryStats}
      />

      {/* Main Content - Compact single column */}
      <div className="container mx-auto py-6 px-4 lg:px-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <HazardsSection content={hazardsContent} />
          <PpeSection categories={ppeCategories} categoryLabels={ppeCategoryLabels} />
          <MaterialsSection materials={materials} />
          <ProductsSection products={products} industryName={industryLabel} />
          <StandardsSection content={standardsContent} />
          <FaqSection content={faqContent} />
        </div>
      </div>

      {/* Fixed Bottom CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground">Need bulk pricing or OEM support?</p>
              <p className="text-xs text-muted-foreground">Contact our B2B team for custom quotes</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href="/products"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                Browse Products
              </Link>
              <Link
                href="/contact"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Get Quote
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
