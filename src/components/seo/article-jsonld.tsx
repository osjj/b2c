interface ArticleJsonLdProps {
  type?: 'Article' | 'BlogPosting' | 'TechArticle'
  headline: string
  description: string
  url: string
  image?: string | null
  datePublished: Date
  dateModified: Date
  authorName?: string
  publisherName?: string
  publisherLogoUrl?: string
}

export function ArticleJsonLd({
  type = 'Article',
  headline,
  description,
  url,
  image,
  datePublished,
  dateModified,
  authorName = 'Laifappe Team',
  publisherName = 'Laifappe',
  publisherLogoUrl,
}: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': type,
    headline,
    description,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    url,
    image: image ? [image] : undefined,
    datePublished: datePublished.toISOString(),
    dateModified: dateModified.toISOString(),
    author: {
      '@type': 'Organization',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      logo: publisherLogoUrl
        ? {
            '@type': 'ImageObject',
            url: publisherLogoUrl,
          }
        : undefined,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
