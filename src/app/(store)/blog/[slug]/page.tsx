import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from 'lucide-react'
import { getBlogPostBySlug } from '@/actions/blog'
import { BlogCommercialLinksSection } from '@/components/store/blog/blog-commercial-links-section'
import { BlogContentRenderer } from '@/components/store/blog/blog-content-renderer'
import { BlogTocNavigation } from '@/components/store/blog/blog-toc-navigation'
import { getBlogCommercialLinks } from '@/lib/blog-commercial-links'
import { extractTocFromContent, stripHtml } from '@/lib/blog-toc'
import {
  getToolRecommendationsForBlog,
  shouldShowBlogToolShortcuts,
} from '@/lib/tool-recommendations'
import { formatDate } from '@/lib/utils'
import { getSiteUrl } from '@/lib/site-url'
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo'
import styles from '@/components/store/blog/blog-layout.module.css'

type Props = {
  params: Promise<{ slug: string }>
}

type EditorContent = Parameters<typeof BlogContentRenderer>[0]['content']

export const revalidate = 3600
export const dynamic = 'force-static'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Article Not Found',
      description: 'The requested article could not be found.',
    }
  }

  const baseUrl = getSiteUrl()
  const postUrl = `${baseUrl}/blog/${slug}`

  const title = post.seoTitle || post.title
  const description =
    post.seoDescription || post.excerpt || `Read ${post.title} on our blog.`

  const keywords = post.seoKeywords
    ? post.seoKeywords.split(',').map((k) => k.trim()).filter(Boolean)
    : [post.title]

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: postUrl,
      type: 'article',
      publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      images: post.coverImage
        ? [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.coverImage ? [post.coverImage] : [],
    },
    alternates: {
      canonical: postUrl,
    },
  }
}

function estimateReadingTime(content: EditorContent): number {
  if (!content?.blocks?.length) return 1
  let words = 0
  for (const block of content.blocks) {
    const text =
      (block.data as { text?: string })?.text ??
      (Array.isArray((block.data as { items?: unknown }).items)
        ? ((block.data as { items: unknown[] }).items as unknown[])
            .map((it) => (typeof it === 'string' ? it : (it as { content?: string })?.content || ''))
            .join(' ')
        : '')
    words += stripHtml(String(text)).split(/\s+/).filter(Boolean).length
  }
  return Math.max(1, Math.round(words / 220))
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const displayDate = post.publishedAt ?? post.createdAt
  const content = post.content as EditorContent
  const tocItems = extractTocFromContent(content)
  const readingMinutes = estimateReadingTime(content)
  const commercialLinks = getBlogCommercialLinks(slug)
  const relatedTools = getToolRecommendationsForBlog({
    slug,
    title: post.title,
    excerpt: post.excerpt,
  })
  const showToolShortcuts = shouldShowBlogToolShortcuts(slug)
  const baseUrl = getSiteUrl()
  const postUrl = `${baseUrl}/blog/${post.slug}`
  const description =
    post.seoDescription || post.excerpt || `Read ${post.title} on the Laifappe blog.`
  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Blog', url: `${baseUrl}/blog` },
    { name: post.title, url: postUrl },
  ]

  return (
    <div className={`${styles.page} ${styles.detailPage}`}>
      <ArticleJsonLd
        type="BlogPosting"
        headline={post.title}
        description={description}
        url={postUrl}
        image={post.coverImage}
        datePublished={post.publishedAt ?? post.createdAt}
        dateModified={post.updatedAt}
        publisherLogoUrl={`${baseUrl}/logo.png`}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <div className={styles.frame}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <ol>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li aria-current="page">{post.title}</li>
          </ol>
        </nav>

        <header className={styles.detailMasthead}>
          <p className={styles.eyebrow}>Safety Guide</p>
          <h1 className={styles.detailTitle}>{post.title}</h1>
          {post.excerpt ? <p className={styles.detailIntro}>{post.excerpt}</p> : null}
          <div className={styles.detailMeta}>
            <time dateTime={displayDate.toISOString()}>
              <CalendarDays size={15} aria-hidden="true" />
              {formatDate(displayDate)}
            </time>
            <span>
              <Clock size={15} aria-hidden="true" />
              {readingMinutes} min read
            </span>
          </div>
        </header>

        <div className={styles.detailGrid} data-toc={tocItems.length > 0}>
          {tocItems.length > 0 ? (
            <aside className={styles.tocColumn}>
              <BlogTocNavigation items={tocItems} />
            </aside>
          ) : null}
          <article className={styles.detailArticle}>
            {post.coverImage ? (
              <div className={styles.detailCover}>
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(max-width: 959px) 94vw, 72vw"
                  className={styles.coverImage}
                  priority
                  fetchPriority="high"
                />
              </div>
            ) : null}

            <div className={styles.articleBody}>
              {content?.blocks?.length ? (
                <div className={styles.readingSheet}>
                  <BlogContentRenderer content={content} />
                </div>
              ) : null}
              {commercialLinks || relatedTools.length > 0 ? (
                <div className={styles.resourceStack}>
                  <BlogLightCta links={commercialLinks} />
                  {showToolShortcuts ? <BlogPlanningTools tools={relatedTools} compact /> : null}
                  <BlogCommercialLinksSection links={commercialLinks} />
                  {!showToolShortcuts ? <BlogPlanningTools tools={relatedTools} /> : null}
                </div>
              ) : null}
              <BlogFooter />
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}

function BlogPlanningTools({
  tools,
  compact = false,
}: {
  tools: ReturnType<typeof getToolRecommendationsForBlog>
  compact?: boolean
}) {
  if (tools.length === 0) {
    return null
  }

  return (
    <section className={styles.resourcePanel}>
      {compact ? (
        <h2 className={styles.resourceTitle}>Planning tools</h2>
      ) : (
        <>
          <p className={styles.resourceKicker}>Related Tools</p>
          <h2 className={styles.resourceTitle}>Turn this guide into a faster PPE shortlist</h2>
        </>
      )}
      <p className={styles.resourceCopy}>
        {compact
          ? 'Use these tools before moving from this guide into quantities, sizing, labels, or RFQ planning.'
          : 'Use the matching tools to check footwear sizing, decode certification labels, or estimate order quantities before you move from research to purchasing.'}
      </p>
      <ul className={styles.toolList}>
        {(compact ? tools.slice(0, 3) : tools).map((tool, index) => (
          <li key={tool.id}>
            <Link href={tool.href} className={styles.toolLink}>
              <span className={styles.toolNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.toolText}>
                <span className={styles.toolMeta}>{tool.eyebrow}</span>
                <strong>{tool.title}</strong>
                {!compact ? <span className={styles.toolDescription}>{tool.description}</span> : null}
                {!compact ? <span className={styles.toolAction}>{tool.cta}</span> : null}
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function BlogLightCta({ links }: { links: ReturnType<typeof getBlogCommercialLinks> }) {
  if (!links) {
    return null
  }

  return (
    <section className={styles.buyerPanel}>
      <div>
        <h2 className={styles.resourceTitle}>Buyer next step</h2>
        <p className={styles.resourceCopy}>
          Turn this guide into a sourced PPE shortlist with standards, quantities, and role-based kit notes.
        </p>
      </div>
      <Link href={links.cta.href} data-source={links.cta.source} className={styles.solidButton}>
        {links.cta.label}
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </section>
  )
}

function BlogFooter() {
  return (
    <div className={styles.detailFooter}>
      <Link
        href="/blog"
        className={styles.textAction}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to all articles
      </Link>
    </div>
  )
}
