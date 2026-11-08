import { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
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
import styles from '@/components/store/blog/blog-layout.module.css'

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
    <div className={styles.page}>
      <div className={styles.frame}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <ol>
            <li><Link href="/">Home</Link></li>
            <li aria-current="page">Blog</li>
          </ol>
        </nav>

        <header className={styles.indexMasthead}>
          <div>
            <h1 className={styles.indexTitle}>PPE guides &amp; industry solutions.</h1>
            <p className={styles.indexIntro}>
              Find industry PPE plans, product selection guides and procurement checklists
              for construction, mining, warehouse and workshop teams.
            </p>
          </div>
          <div className={styles.indexActions}>
            <nav aria-label="Browse guides by content type" className={styles.jumpLinks}>
              {solutions.length > 0 ? (
                <Link href="#industry-solutions" className={styles.solidButton}>
                  Industry solutions
                </Link>
              ) : null}
              <Link href="#articles" className={solutions.length > 0 ? styles.outlineButton : styles.solidButton}>
                Articles &amp; checklists
              </Link>
            </nav>
            <p className={styles.sectionMeta}>
              {total} article{total === 1 ? '' : 's'}
            </p>
          </div>
        </header>

        <BlogIndustrySolutions solutions={solutions} />

        <div id="articles" className={styles.articleArchive}>
          {total === 0 ? (
            <p className={styles.empty}>No articles published yet.</p>
          ) : (
            <>
              {featured ? (
                <section aria-label="Featured guide" className={styles.featuredSection}>
                  <Link href={`/blog/${featured.slug}`} className={styles.featuredCard}>
                    <div className={styles.featuredMedia}>
                      {featured.coverImage ? (
                        <Image
                          src={featured.coverImage}
                          alt={featured.title}
                          fill
                          sizes="(max-width: 719px) 100vw, 48vw"
                          className={styles.coverImage}
                          priority
                        />
                      ) : (
                        <span className={styles.imageFallback}>No cover image</span>
                      )}
                    </div>
                    <div className={styles.featuredCopy}>
                      <p className={styles.eyebrow}>Featured guide</p>
                      <time dateTime={(featured.publishedAt ?? featured.createdAt).toISOString()} className={styles.sectionMeta}>
                        {formatDate(featured.publishedAt ?? featured.createdAt)}
                      </time>
                      <h2 className={styles.featuredTitle}>{featured.title}</h2>
                      {featured.excerpt ? (
                        <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
                      ) : null}
                      <span className={styles.textAction}>
                        Read the full guide
                        <ArrowRight size={18} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </section>
              ) : null}

              {rest.length > 0 ? (
                <section className={styles.postsSection}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                      {page === 1 ? 'Articles & checklists' : 'Latest articles'}
                    </h2>
                    <span className={styles.sectionMeta}>
                      Page {page} · Articles {visibleRange.start}–{visibleRange.end} of {total}
                    </span>
                  </div>
                  <div className={styles.postGrid}>
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
                <div className={styles.pagination}>
                  <Suspense fallback={null}>
                    <StorePagination currentPage={page} totalPages={totalPages} total={total} />
                  </Suspense>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
