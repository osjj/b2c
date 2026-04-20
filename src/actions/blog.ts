'use server'

import { prisma } from '@/lib/prisma'

export async function getPublishedBlogPosts() {
  return prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
      createdAt: true,
    },
  })
}

export async function getBlogPostBySlug(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, isPublished: true },
  })
}
