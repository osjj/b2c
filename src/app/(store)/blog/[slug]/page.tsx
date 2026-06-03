import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ChevronRight, Clock, Home } from 'lucide-react'
import { getBlogPostBySlug } from '@/actions/blog'
import { BlogCommercialLinksSection } from '@/components/store/blog/blog-commercial-links-section'
import { BlogContentRenderer } from '@/components/store/blog/blog-content-renderer'
import { TableOfContents } from '@/components/store/solution-detail/table-of-contents'
import { ToolRecommendationsSection } from '@/components/store/tool-recommendations-section'
import { getBlogCommercialLinks } from '@/lib/blog-commercial-links'
import { extractTocFromContent, stripHtml } from '@/lib/blog-toc'
import { getToolRecommendationsForBlog } from '@/lib/tool-recommendations'
import { formatDate } from '@/lib/utils'
import { getSiteUrl } from '@/lib/site-url'
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo'

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
    <div className="bg-ppe-bg-page min-h-screen pb-24">
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
      <nav className="container mx-auto py-2.5 px-4 lg:px-6 text-xs border-b bg-background/50">
        <ol className="flex items-center gap-1.5 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li>
            <Link href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="text-foreground font-medium truncate max-w-[240px]">{post.title}</li>
        </ol>
      </nav>

      {/* Hero header */}
      <header className="container mx-auto px-4 lg:px-6 pt-12 pb-8 max-w-4xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary mb-5">
          Safety Guide
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-[1.1] tracking-tight mb-6">
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-3xl mx-auto mb-7">
            {post.excerpt}
          </p>
        ) : null}
        <div className="flex items-center justify-center gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <time>{formatDate(displayDate)}</time>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {readingMinutes} min read
          </span>
        </div>
      </header>

      {/* Hero image */}
      {post.coverImage ? (
        <div className="container mx-auto px-4 lg:px-6 max-w-5xl mb-12">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border shadow-sm">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              className="object-cover"
              priority
            />
          </div>
        </div>
      ) : null}

      {/* Article body */}
      <div className="container mx-auto px-4 lg:px-6">
        {tocItems.length > 0 ? (
          <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
            <aside className="hidden lg:block">
              <TableOfContents items={tocItems} />
            </aside>
            <article className="max-w-3xl mx-auto w-full">
              <BlogLightCta links={commercialLinks} />
              <BlogContentRenderer content={content} />
              <BlogCommercialLinksSection links={commercialLinks} />
              <ToolRecommendationsSection
                tools={relatedTools}
                title="Turn this guide into a faster PPE shortlist"
                description="Use the matching tools to check footwear sizing, decode certification labels, or estimate order quantities before you move from research to purchasing."
              />
              <BlogFooter />
            </article>
          </div>
        ) : (
          <article className="max-w-3xl mx-auto w-full">
            <BlogLightCta links={commercialLinks} />
            <BlogContentRenderer content={content} />
            <BlogCommercialLinksSection links={commercialLinks} />
            <ToolRecommendationsSection
              tools={relatedTools}
              title="Turn this guide into a faster PPE shortlist"
              description="Use the matching tools to check footwear sizing, decode certification labels, or estimate order quantities before you move from research to purchasing."
            />
            <BlogFooter />
          </article>
        )}
      </div>
    </div>
  )
}

function BlogLightCta({ links }: { links: ReturnType<typeof getBlogCommercialLinks> }) {
  if (!links) {
    return null
  }

  return (
    <section className="mb-10 rounded-xl border bg-background p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Buyer next step
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Turn this guide into a sourced PPE shortlist with standards, quantities, and role-based kit notes.
          </p>
        </div>
        <Link
          href={links.cta.href}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {links.cta.label}
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

function BlogFooter() {
  return (
    <div className="mt-16 pt-8 border-t">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all articles
      </Link>
    </div>
  )
}
