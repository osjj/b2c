import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { getSolutionBySlug } from '@/actions/solutions'
import { formatUsageSceneLabel, type UsageScene } from '@/lib/usage-scenes'
import { SolutionHero, SolutionSections } from '@/components/store/solution-detail'
import { TableOfContents } from '@/components/store/solution-detail/table-of-contents'
import type { SolutionSectionItem } from '@/types/solution'
import { prisma } from '@/lib/prisma'
import {
  RECOMMENDED_PPE_BLOCK_KEY,
  resolveRecommendationMode,
} from '@/lib/solution-recommendations'
import type { ProductImage, Category } from '@prisma/client'

type Props = {
  params: Promise<{ slug: string }>
}

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

  return (
    <div className="bg-ppe-bg-page min-h-screen pb-16">
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
            </div>
          </div>
        ) : (
          <div className="max-w-4xl space-y-6">
            <SolutionSections sections={sections} productsBySectionKey={productsBySectionKey} />
          </div>
        )}
      </div>
    </div>
  )
}
