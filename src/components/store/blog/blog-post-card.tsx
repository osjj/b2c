import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import styles from './blog-layout.module.css'

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
      className={styles.postCard}
    >
      <div className={styles.postMedia}>
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={styles.coverImage}
          />
        ) : (
          <span className={styles.imageFallback}>No cover image</span>
        )}
      </div>

      <div className={styles.postCopy}>
        <time dateTime={date.toISOString()} className={styles.sectionMeta}>
          {formatDate(date)}
        </time>
        <h3 className={styles.postTitle}>
          {title}
        </h3>
        {excerpt ? (
          <p className={styles.postExcerpt}>{excerpt}</p>
        ) : null}
        <span className={styles.textAction}>
          Read article
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
