import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface BlogPostCardProps {
  slug: string
  title: string
  excerpt: string | null
  coverImage: string | null
  date: Date
}

export function BlogPostCard({ slug, title, excerpt, coverImage, date }: BlogPostCardProps) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-background transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
            No cover image
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <time className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {formatDate(date)}
        </time>
        <h3 className="font-serif text-xl leading-tight text-foreground transition-colors group-hover:text-primary line-clamp-2">
          {title}
        </h3>
        {excerpt ? (
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{excerpt}</p>
        ) : null}
        <span className="mt-auto pt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Read article
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  )
}
