import 'server-only'

import type { Prisma } from '@prisma/client'

import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

import { hasCasePrivateImages, toAdminCaseView, toCaseView } from './types'
import type { AdminCaseView, CaseView } from './types'

/** A database-level whitelist, in addition to the runtime output projection. */
const publicCaseSelect = {
  id: true, slug: true, title: true, summary: true, country: true, industry: true,
  cooperationDate: true, buyerProfile: true, coverImage: true, coverAlt: true,
  procurement: true, customization: true, sections: true, timeline: true, gallery: true,
  relatedLinks: true, featured: true, sortOrder: true, seoTitle: true, seoDescription: true,
  version: true, publishedAt: true, createdAt: true, updatedAt: true,
} satisfies Prisma.CaseStudySelect

export function publishedCaseFilter(now = new Date()): Prisma.CaseStudyWhereInput {
  return { status: 'PUBLISHED', publicationApproved: true, publishedAt: { lte: now } }
}

export async function listPublishedCases(): Promise<CaseView[]> {
  const records = await prisma.caseStudy.findMany({
    where: publishedCaseFilter(), select: publicCaseSelect,
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { publishedAt: 'desc' }, { id: 'asc' }],
  })
  // Fail closed even if a direct DB write bypasses the publication validator.
  return records.map(toCaseView).filter((record) => !hasCasePrivateImages(record))
}

export async function getPublishedCase(slug: string): Promise<CaseView | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) return null
  const record = await prisma.caseStudy.findFirst({
    where: { ...publishedCaseFilter(), slug }, select: publicCaseSelect,
  })
  if (!record) return null
  const view = toCaseView(record)
  return hasCasePrivateImages(view) ? null : view
}

export async function listAdminCases(): Promise<AdminCaseView[]> {
  await requireAdmin()
  const records = await prisma.caseStudy.findMany({ orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] })
  return records.map(toAdminCaseView)
}

export async function getAdminCase(id: string): Promise<AdminCaseView | null> {
  await requireAdmin()
  if (!id || id.length > 200) return null
  const record = await prisma.caseStudy.findUnique({ where: { id } })
  return record ? toAdminCaseView(record) : null
}
