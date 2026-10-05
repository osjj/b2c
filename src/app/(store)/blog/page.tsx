import { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ChevronRight, Home } from 'lucide-react'
import { getPublishedBlogPosts } from '@/actions/blog'
import { BlogIndustrySolutions } from '@/components/store/blog/blog-industry-solutions'
import { prisma } from '@/lib/prisma'
import { BlogPostCard } from '@/components/store/blog/blog-post-card'
import { StorePagination } from '@/components/store/store-pagination'
import { getSiteUrl } from '@/lib/site-url'
import {
  getStoreBlogPageConfig,
  getStoreBlogPageRange,
  getStoreBlogTotalPages,
  normalizeBlogPage,
  splitFeaturedBlogPost,
} from '@/lib/store-blog-pagination'
import { formatDate } from '@/lib/utils'

type BlogIndexPageProps = {
  searchParams: Promise<{ page?: string | string[] }>
}

export const revalidate = 3600

const PAGE_TITLE = 'Blog · PPE Guides & Industry Solutions'
const PAGE_DESCRIPTION =
  'PPE selection guides, industry solutions and procurement checklists for construction, mining, warehouse and workshop buyers.'

export async function generateMetadata({ searchParams }: BlogIndexPageProps): Promise<Metadata> {
  const params = await searchParams
  const page = normalizeBlogPage(params.page)
  const title = page > 1 ? `${PAGE_TITLE} · Page ${page}` : PAGE_TITLE
  const pageUrl = `${getSiteUrl()}/blog${page > 1 ? `?page=${page}` : ''}`

  return {
    title,
    description: PAGE_DESCRIPTION,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description: PAGE_DESCRIPTION,
      url: pageUrl,
      type: 'website',
    },
  }
}

export default async function BlogIndexPage({ searchParams }: BlogIndexPageProps) {
  const params = await searchParams
  const page = normalizeBlogPage(params.page)
  const pageConfig = getStoreBlogPageConfig(page)
  const [{ posts, total }, solutions] = await Promise.all([
    getPublishedBlogPosts({
      skip: pageConfig.skip,
      take: pageConfig.take,
    }),
    prisma.solution.findMany({
      where: {
        isActive: true,
        slug: { notIn: ['ppe-safety-equipment-for-construction-sites'] },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, slug: true, title: true, excerpt: true, coverImage: true },
    }),
  ])
  const totalPages = getStoreBlogTotalPages(total)

  if (page > 1 && page > totalPages) {
    notFound()
  }

  const { featuredPost: featured, regularPosts: rest } = splitFeaturedBlogPost(posts, page)
  const visibleRange = getStoreBlogPageRange(page, posts.length, total)

  return (
    <div className="bg-ppe-bg-page min-h-screen pb-24">
      <nav className="container mx-auto py-2.5 px-4 lg:px-6 text-xs border-b bg-background/50">
        <ol className="flex items-center gap-1.5 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="text-foreground font-medium">Blog</li>
        </ol>
      </nav>

      {/* Page header */}
      <header className="container mx-auto px-4 lg:px-6 pt-16 pb-12 max-w-3xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary mb-4">
          Guides & Industry Solutions
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-5">
          PPE guides &amp;
          <br className="hidden sm:block" /> industry solutions.
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Find industry PPE plans, product selection guides and procurement checklists
          for construction, mining, warehouse and workshop teams.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-border" />
          <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            {total} article{total === 1 ? '' : 's'}
          </span>
          <span className="h-px w-12 bg-border" />
        </div>
        <nav aria-label="Browse guides by content type" className="mt-6 flex flex-wrap justify-center gap-3">
          {solutions.length > 0 ? (
            <Link href="#industry-solutions" className="inline-flex min-h-11 items-center rounded-md border bg-background px-5 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Industry solutions
            </Link>
          ) : null}
          <Link href="#articles" className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Articles &amp; checklists
          </Link>
        </nav>
      </header>

      <BlogIndustrySolutions solutions={solutions} />

      <div id="articles" className="scroll-mt-28">
        {total === 0 ? (
          <section className="container mx-auto px-4 lg:px-6">
            <div className="border rounded-2xl py-20 text-center bg-background">
              <p className="text-muted-foreground">No articles published yet.</p>
            </div>
          </section>
        ) : (
          <>
            {/* Featured article */}
            {featured ? (
              <section className="container mx-auto px-4 lg:px-6 mb-16">
                <Link
                  href={`/blog/${featured.slug}`}
                  className="group grid gap-8 lg:grid-cols-2 lg:gap-12 rounded-2xl border bg-background p-5 sm:p-8 lg:p-10 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] lg:aspect-[5/4] w-full overflow-hidden rounded-xl bg-muted">
                    {featured.coverImage ? (
                      <Image
                        src={featured.coverImage}
                        alt={featured.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        priority
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
                        No cover image
                      </div>
                    )}
                    <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm">
                      Featured
                    </span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <time className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
                      {formatDate(featured.publishedAt ?? featured.createdAt)}
                    </time>
                    <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl leading-tight mb-5 transition-colors group-hover:text-primary">
                      {featured.title}
                    </h2>
                    {featured.excerpt ? (
                      <p className="text-muted-foreground text-base leading-relaxed line-clamp-4 mb-6">
                        {featured.excerpt}
                      </p>
                    ) : null}
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      Read the full guide
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </section>
            ) : null}

            {/* Other posts grid */}
            {rest.length > 0 ? (
              <section className="container mx-auto px-4 lg:px-6">
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="font-serif text-2xl sm:text-3xl">
                    {page === 1 ? 'More articles' : 'Latest articles'}
                  </h2>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Page {page} · Articles {visibleRange.start}–{visibleRange.end} of {total}
                  </span>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => (
                    <BlogPostCard
                      key={post.id}
                      slug={post.slug}
                      title={post.title}
                      excerpt={post.excerpt}
                      coverImage={post.coverImage}
                      date={post.publishedAt ?? post.createdAt}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {totalPages > 1 ? (
              <div className="container mx-auto mt-12 px-4 lg:px-6">
                <Suspense fallback={null}>
                  <StorePagination currentPage={page} totalPages={totalPages} total={total} />
                </Suspense>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
