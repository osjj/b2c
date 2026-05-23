import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { getSiteUrl } from '@/lib/site-url'

export const revalidate = 3600
export const dynamic = 'force-dynamic'

const TOOLS_HUB_LASTMOD = new Date('2026-04-20')
const AI_QUOTE_TOOL_LASTMOD = new Date('2026-04-20')
const PPE_CALCULATOR_TOOL_LASTMOD = new Date('2026-04-20')
const SIZE_GUIDE_TOOL_LASTMOD = new Date('2026-04-25')
const COMPLIANCE_TOOL_LASTMOD = new Date('2026-04-25')
const HOME_LASTMOD = new Date('2026-05-09')
const PRODUCTS_HUB_LASTMOD = new Date('2026-04-23')
const CATEGORIES_HUB_LASTMOD = new Date('2026-04-23')
const ABOUT_LASTMOD = new Date('2026-04-20')
const CASES_LASTMOD = new Date('2026-04-20')
const NEWS_LASTMOD = new Date('2026-04-20')
const SOLUTIONS_HUB_LASTMOD = new Date('2026-05-09')
const BLOG_HUB_LASTMOD = new Date('2026-05-09')
const EXCLUDED_SOLUTION_SLUGS = new Set(['ppe-safety-equipment-for-construction-sites'])

type SitemapProduct = {
  slug: string
  updatedAt: Date
}

type SitemapCategory = {
  slug: string
  updatedAt: Date
  parent: {
    slug: string
    isActive: boolean
  } | null
}

type SitemapSolution = {
  slug: string
  updatedAt: Date
}

type SitemapBlogPost = {
  slug: string
  publishedAt: Date | null
  createdAt: Date
}

function buildStaticPages(baseUrl: string): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: HOME_LASTMOD,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: PRODUCTS_HUB_LASTMOD,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: CATEGORIES_HUB_LASTMOD,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: ABOUT_LASTMOD,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cases`,
      lastModified: CASES_LASTMOD,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: NEWS_LASTMOD,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/solutions`,
      lastModified: SOLUTIONS_HUB_LASTMOD,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: BLOG_HUB_LASTMOD,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: TOOLS_HUB_LASTMOD,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/ai-quote`,
      lastModified: AI_QUOTE_TOOL_LASTMOD,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/ppe-calculator`,
      lastModified: PPE_CALCULATOR_TOOL_LASTMOD,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/size-guide`,
      lastModified: SIZE_GUIDE_TOOL_LASTMOD,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/compliance-checker`,
      lastModified: COMPLIANCE_TOOL_LASTMOD,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}

async function safeQuery<T>(query: Promise<T>, fallback: T): Promise<T> {
  try {
    return await query
  } catch {
    return fallback
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const staticPages = buildStaticPages(baseUrl)

  const [products, categories, solutions, blogPosts] = await Promise.all([
    safeQuery<SitemapProduct[]>(
      prisma.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      [],
    ),
    safeQuery<SitemapCategory[]>(
      prisma.category.findMany({
        where: { isActive: true },
        select: {
          slug: true,
          updatedAt: true,
          parent: { select: { slug: true, isActive: true } },
        },
      }),
      [],
    ),
    safeQuery<SitemapSolution[]>(
      prisma.solution.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      [],
    ),
    safeQuery<SitemapBlogPost[]>(
      prisma.blogPost.findMany({
        where: { isPublished: true },
        select: { slug: true, publishedAt: true, createdAt: true },
      }),
      [],
    ),
  ])

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((category) => !category.parent || category.parent.isActive)
    .map((category) => ({
      url: category.parent
        ? `${baseUrl}/categories/${category.parent.slug}/${category.slug}`
        : `${baseUrl}/categories/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: category.parent ? 0.6 : 0.7,
    }))

  const solutionPages: MetadataRoute.Sitemap = solutions
    .map((solution) => ({
      url: `${baseUrl}/solutions/${solution.slug}`,
      lastModified: solution.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
    .filter((solution) => {
      const slug = solution.url.split('/').pop()
      return slug ? !EXCLUDED_SOLUTION_SLUGS.has(slug) : true
    })

  const blogPostPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.publishedAt ?? post.createdAt,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    ...staticPages,
    ...productPages,
    ...categoryPages,
    ...solutionPages,
    ...blogPostPages,
  ]
}
