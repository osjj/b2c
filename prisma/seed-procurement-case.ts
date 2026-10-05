import 'dotenv/config'

import { Prisma, PrismaClient } from '@prisma/client'

import { southAfricaMiningDraft } from '../src/lib/cases/south-africa-draft'

/** Explicitly executed by the main agent only after schema verification. */
const client = new PrismaClient()

async function main(): Promise<void> {
  const existing = await client.caseStudy.findUnique({
    where: { slug: southAfricaMiningDraft.slug },
    select: { id: true, slug: true, status: true, publicationApproved: true, publishedAt: true, version: true },
  })
  if (existing) {
    process.stdout.write(`${JSON.stringify({ action: 'unchanged', ...existing })}\n`)
    return
  }
  try {
    const created = await client.caseStudy.create({
      data: {
        ...southAfricaMiningDraft,
        cooperationDate: new Date(`${southAfricaMiningDraft.cooperationDate}T00:00:00.000Z`),
        status: 'DRAFT', publicationApproved: false, publishedAt: null,
      },
      select: { id: true, slug: true, status: true, publicationApproved: true, publishedAt: true, version: true },
    })
    process.stdout.write(`${JSON.stringify({ action: 'created_unpublished_draft', ...created })}\n`)
  } catch (error) {
    // A competing create must never overwrite or change the existing record.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      process.stdout.write(`${JSON.stringify({ action: 'unchanged_concurrent_create', slug: southAfricaMiningDraft.slug })}\n`)
      return
    }
    throw error
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({ operation: 'seed_procurement_case', code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'UNEXPECTED' })}\n`)
  process.exitCode = 1
}).finally(() => client.$disconnect())
