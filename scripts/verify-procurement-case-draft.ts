// Read-only post-bootstrap proof for the user-authorized shared database.
import 'dotenv/config'

import { PrismaClient } from '@prisma/client'

import { southAfricaMiningDraft } from '../src/lib/cases/south-africa-draft'
import { publicCaseView, toAdminCaseView } from '../src/lib/cases/types'
import { parseCasePrivateImage } from '../src/lib/cases/private-image-path'
import { makeSouthAfricaPublicImagePlan } from '../src/lib/cases/south-africa-public-images'

const client = new PrismaClient()

async function main(): Promise<void> {
  const record = await client.caseStudy.findUnique({ where: { slug: southAfricaMiningDraft.slug } })
  if (!record) throw new Error('Draft missing')
  const admin = toAdminCaseView(record)
  const publicView = publicCaseView(admin)
  const publicMatches = await client.caseStudy.count({
    where: { slug: admin.slug, status: 'PUBLISHED', publicationApproved: true, publishedAt: { lte: new Date() } },
  })
  if (admin.status !== 'DRAFT' || admin.publicationApproved || admin.publishedAt || publicMatches) throw new Error('Draft visibility guard failed')
  if (JSON.stringify(admin.procurement) !== JSON.stringify(southAfricaMiningDraft.procurement)) throw new Error('Confirmed quantities differ')
  if ('privateNotes' in publicView || 'publicationApproved' in publicView) throw new Error('Private projection failed')
  const expectedImageArg = process.argv.find((value) => value.startsWith('--expect-images='))
  const expectedPublicArg = process.argv.find((value) => value.startsWith('--expect-public-images='))
  if (expectedImageArg && expectedPublicArg) throw new Error('Choose one image verification mode')
  if (expectedImageArg || expectedPublicArg) {
    const expectedImages = Number((expectedImageArg || expectedPublicArg)?.split('=')[1])
    if (!Number.isInteger(expectedImages) || expectedImages < 1 || expectedImages > 30) throw new Error('Invalid expected image count')
    if (admin.gallery.length !== expectedImages || new Set(admin.gallery.map((image) => image.url)).size !== expectedImages) throw new Error('Gallery count/uniqueness failed')
    for (const image of admin.gallery) {
      if (!image.alt || !image.caption) throw new Error('Gallery descriptions failed')
      if (expectedImageArg && parseCasePrivateImage(image.url)?.caseId !== admin.id) throw new Error('Private gallery ownership failed')
    }
    if (expectedPublicArg && !makeSouthAfricaPublicImagePlan(admin, process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com').alreadyPublic) throw new Error('Approved public image plan failed')
    if (admin.coverImage !== admin.gallery[0]?.url || admin.coverAlt !== admin.gallery[0]?.alt) throw new Error('Cover/galleria mismatch')
    if (admin.cooperationDate !== '2026-08-02') throw new Error('Cooperation date differs')
  }
  process.stdout.write(`${JSON.stringify({ id: admin.id, slug: admin.slug, status: admin.status, publishedAt: admin.publishedAt, publicationApproved: admin.publicationApproved, version: admin.version, cooperationDate: admin.cooperationDate, procurement: admin.procurement.map(({ name, quantity, unit }) => ({ name, quantity, unit })), publicMatches, galleryCount: admin.gallery.length })}\n`)
}

main().catch(() => {
  process.stderr.write('Procurement draft verification failed; no database changes performed.\n')
  process.exitCode = 1
}).finally(() => client.$disconnect())
