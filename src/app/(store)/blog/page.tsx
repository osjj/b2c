import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronRight, Home } from 'lucide-react'
import { getPublishedBlogPosts } from '@/actions/blog'
import { BlogPostCard } from '@/components/store/blog/blog-post-card'
import { formatDate } from '@/lib/utils'
import { getSiteUrl } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Blog · Safety & PPE Guides',
  description:
    'In-depth safety footwear, PPE selection and workplace protection guides for procurement managers, safety officers and site supervisors.',
  alternates: {
    canonical: `${getSiteUrl()}/blog`,
  },
  openGraph: {
    title: 'Blog · Safety & PPE Guides',
    description:
      'In-depth safety footwear, PPE selection and workplace protection guides.',
    url: `${getSiteUrl()}/blog`,
    type: 'website',
  },
}

export const revalidate = 300

export default async function BlogIndexPage() {
  const posts = await getPublishedBlogPosts()
  const [featured, ...rest] = posts

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
          Insights & Guides
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-5">
          Safety, standards &amp;
          <br className="hidden sm:block" /> workplace protection.
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Practical, research-backed guides on industrial safety footwear, PPE selection, and
          workplace protection — written for procurement managers, safety officers and site
          supervisors.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-border" />
          <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            {posts.length} article{posts.length === 1 ? '' : 's'}
          </span>
          <span className="h-px w-12 bg-border" />
        </div>
      </header>

      {posts.length === 0 ? (
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
              <div className="flex items-end justify-between mb-6">
                <h2 className="font-serif text-2xl sm:text-3xl">More articles</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {rest.length} more
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
        </>
      )}
    </div>
  )
}
