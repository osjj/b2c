'use server'

import { prisma } from '@/lib/prisma'

export async function getPublishedBlogPosts({ skip = 0, take = 12 } = {}) {
  const where = { isPublished: true }
  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
        createdAt: true,
      },
    }),
    prisma.blogPost.count({ where }),
  ])

  return { posts, total }
}

export async function getBlogPostBySlug(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, isPublished: true },
  })
}
