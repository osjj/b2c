'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'

export type BlogPostState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
}

const blogPostSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens'),
  title: z.string().min(1, 'Title is required'),
  excerpt: z.string().max(500).optional().nullable(),
  coverImage: z.string().optional().nullable(),
  content: z.any().optional().nullable(),
  isPublished: z.boolean().default(false),
  seoTitle: z.string().max(160).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
  seoKeywords: z.string().optional().nullable(),
})

function parseFormData(formData: FormData) {
  const contentRaw = formData.get('content')
  let parsedContent: unknown = null
  if (typeof contentRaw === 'string' && contentRaw.trim()) {
    try {
      parsedContent = JSON.parse(contentRaw)
    } catch {
      parsedContent = null
    }
  }

  return {
    slug: String(formData.get('slug') || '').trim(),
    title: String(formData.get('title') || '').trim(),
    excerpt: (formData.get('excerpt') as string | null)?.trim() || null,
    coverImage: (formData.get('coverImage') as string | null)?.trim() || null,
    content: parsedContent,
    isPublished: formData.get('isPublished') === 'true',
    seoTitle: (formData.get('seoTitle') as string | null)?.trim() || null,
    seoDescription: (formData.get('seoDescription') as string | null)?.trim() || null,
    seoKeywords: (formData.get('seoKeywords') as string | null)?.trim() || null,
  }
}

export async function createBlogPost(
  _prev: BlogPostState,
  formData: FormData,
): Promise<BlogPostState> {
  const user = await requireAdmin()

  const parsed = blogPostSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return {
      error: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const existing = await prisma.blogPost.findUnique({ where: { slug: parsed.data.slug } })
  if (existing) {
    return { error: 'A blog post with this slug already exists', errors: { slug: ['Slug already taken'] } }
  }

  await prisma.blogPost.create({
    data: {
      slug: parsed.data.slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt,
      coverImage: parsed.data.coverImage,
      content: (parsed.data.content ?? null) as Prisma.InputJsonValue,
      isPublished: parsed.data.isPublished,
      publishedAt: parsed.data.isPublished ? new Date() : null,
      seoTitle: parsed.data.seoTitle,
      seoDescription: parsed.data.seoDescription,
      seoKeywords: parsed.data.seoKeywords,
      authorId: user.id,
    },
  })

  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  redirect('/admin/blog')
}

export async function updateBlogPost(
  id: string,
  _prev: BlogPostState,
  formData: FormData,
): Promise<BlogPostState> {
  await requireAdmin()

  const parsed = blogPostSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return {
      error: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) {
    return { error: 'Blog post not found' }
  }

  // If slug is changing, make sure the new one isn't taken.
  if (parsed.data.slug !== existing.slug) {
    const clash = await prisma.blogPost.findUnique({ where: { slug: parsed.data.slug } })
    if (clash) {
      return { error: 'A blog post with this slug already exists', errors: { slug: ['Slug already taken'] } }
    }
  }

  // Manage publishedAt: set on first publish, preserve when staying published, clear on unpublish.
  let publishedAt = existing.publishedAt
  if (parsed.data.isPublished && !existing.isPublished) {
    publishedAt = new Date()
  } else if (!parsed.data.isPublished) {
    publishedAt = null
  }

  await prisma.blogPost.update({
    where: { id },
    data: {
      slug: parsed.data.slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt,
      coverImage: parsed.data.coverImage,
      content: (parsed.data.content ?? null) as Prisma.InputJsonValue,
      isPublished: parsed.data.isPublished,
      publishedAt,
      seoTitle: parsed.data.seoTitle,
      seoDescription: parsed.data.seoDescription,
      seoKeywords: parsed.data.seoKeywords,
    },
  })

  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  revalidatePath(`/blog/${parsed.data.slug}`)
  if (parsed.data.slug !== existing.slug) {
    revalidatePath(`/blog/${existing.slug}`)
  }
  redirect('/admin/blog')
}

export async function deleteBlogPost(id: string) {
  await requireAdmin()
  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) return
  await prisma.blogPost.delete({ where: { id } })
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  revalidatePath(`/blog/${existing.slug}`)
}

export async function toggleBlogPostPublish(id: string) {
  await requireAdmin()
  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) return
  const nowPublishing = !existing.isPublished
  await prisma.blogPost.update({
    where: { id },
    data: {
      isPublished: nowPublishing,
      publishedAt: nowPublishing ? existing.publishedAt ?? new Date() : null,
    },
  })
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  revalidatePath(`/blog/${existing.slug}`)
}

export async function getAdminBlogPosts(params: {
  page?: number
  pageSize?: number
  search?: string
  status?: 'all' | 'published' | 'draft'
}) {
  await requireAdmin()

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20))
  const search = params.search?.trim() ?? ''
  const status = params.status ?? 'all'

  const where: Prisma.BlogPostWhereInput = {}
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status === 'published') where.isPublished = true
  if (status === 'draft') where.isPublished = false

  const [total, posts] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  return {
    posts,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

export async function getAdminBlogPost(id: string) {
  await requireAdmin()
  return prisma.blogPost.findUnique({ where: { id } })
}
