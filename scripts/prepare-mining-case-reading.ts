import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

import { SOUTH_AFRICA_READING_ID, SOUTH_AFRICA_READING_SLUG, southAfricaReadingCandidate } from '../src/lib/cases/south-africa-reading-candidate'
import { toCaseView } from '../src/lib/cases/types'

async function main() {
  // Reject unknown/apply switches. This command only acquires eligible public data.
  if (process.argv.length > 3 || (process.argv[2] && !process.argv[2].startsWith('--out='))) throw new Error('Usage: tsx scripts/prepare-mining-case-reading.ts [--out=directory]')
  const directory = resolve(process.argv[2]?.slice('--out='.length) || 'output/case-improvement-20261006')
  const prisma = new PrismaClient()
  try {
    const record = await prisma.caseStudy.findFirst({
      where: { id: SOUTH_AFRICA_READING_ID, slug: SOUTH_AFRICA_READING_SLUG, status: 'PUBLISHED', publicationApproved: true, publishedAt: { lte: new Date() } },
      select: {
        id: true, slug: true, title: true, summary: true, country: true, industry: true,
        cooperationDate: true, buyerProfile: true, coverImage: true, coverAlt: true,
        procurement: true, customization: true, sections: true, timeline: true, gallery: true,
        relatedLinks: true, featured: true, sortOrder: true, seoTitle: true, seoDescription: true,
        version: true, publishedAt: true, createdAt: true, updatedAt: true,
      },
    })
    if (!record) throw new Error('Eligible public source unavailable')
    const source = toCaseView(record)
    const candidate = southAfricaReadingCandidate(source)
    await mkdir(directory, { recursive: true })
    for (const [file, value] of Object.entries({ 'before.json': source, 'candidate.json': candidate, 'provenance.json': { acquiredAt: new Date().toISOString(), id: source.id, slug: source.slug, version: source.version, updatedAt: source.updatedAt, mode: 'read-only-local-candidate' } })) {
      await writeFile(resolve(directory, file), `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    }
    console.log(`Local candidate prepared from public version ${source.version}: ${directory}`)
  } finally { await prisma.$disconnect() }
}

main().catch(() => {
  // Prisma errors may include connection details. Do not print raw failures.
  console.error('Read-only preparation failed. Check the command arguments, public source and database connection locally.')
  process.exitCode = 1
})
