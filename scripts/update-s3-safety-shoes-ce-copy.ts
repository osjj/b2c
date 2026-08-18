import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import { z } from 'zod'

const PRODUCT_ID = 'cmsyr46t60001umfw545h83ca'
const PRODUCT_SLUG = 's3-high-cut-cowhide-steel-toe-safety-shoes'
const AUDIT_PATH = path.resolve('output/s3-cowhide-solid-sole-safety-shoes-review/ce-copy-update-audit.json')

const OLD_DESCRIPTION = 'High-cut black cowhide industrial safety shoes with a source-stated S3 classification, steel toe and puncture-resistant construction. The exact S3 standard, midsole material and performance claims require documentary verification before publication.'
const NEW_DESCRIPTION = 'CE-certified S3 high-cut industrial safety shoes with a black cowhide leather upper, protective steel toe cap and puncture-resistant midsole. Built for reliable protection, durability and comfort in construction, manufacturing, warehousing and other demanding workplaces.'
const OLD_META_DESCRIPTION = 'High-cut cowhide safety shoes with steel toe and puncture-resistant construction. Source-stated S3 classification; documentation requires verification.'
const NEW_META_DESCRIPTION = 'CE-certified S3 high-cut cowhide safety shoes with steel toe protection and a puncture-resistant midsole for demanding industrial workplaces.'
const OLD_SAFETY_CLASSIFICATION = 'S3 (source-stated; exact standard/version and certificate not provided)'
const OLD_VERIFICATION_NOTE = 'S3, compression, puncture, slip, abrasion, water and oil resistance claims require product-specific supporting documents before publication'
const NEW_VERIFICATION_NOTE = 'CE certificate available for this product; add the certificate number and applicable standard to the compliance record when provided.'

const specificationSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
})
const specificationsSchema = z.array(specificationSchema)

type Specification = z.infer<typeof specificationSchema>
type ProductRecord = Awaited<ReturnType<typeof readProduct>>

const prisma = new PrismaClient()

async function readProduct() {
  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: { id: 'asc' } },
      priceTiers: { orderBy: { id: 'asc' } },
    },
  })
  if (!product || product.slug !== PRODUCT_SLUG) {
    throw new Error('Target product draft was not found')
  }
  return product
}

function parseSpecifications(value: Prisma.JsonValue | null): Specification[] {
  return specificationsSchema.parse(value)
}

function protectedSnapshot(product: ProductRecord): string {
  return JSON.stringify({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price.toString(),
    comparePrice: product.comparePrice?.toString() ?? null,
    cost: product.cost?.toString() ?? null,
    sku: product.sku,
    barcode: product.barcode,
    stock: product.stock,
    lowStock: product.lowStock,
    weight: product.weight?.toString() ?? null,
    categoryId: product.categoryId,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    content: product.content,
    usageScenes: product.usageScenes,
    metaTitle: product.metaTitle,
    metaKeywords: product.metaKeywords,
    ogTitle: product.ogTitle,
    ogDescription: product.ogDescription,
    ogImage: product.ogImage,
    sortOrder: product.sortOrder,
    gallery: product.images,
    variants: product.variants,
    priceTiers: product.priceTiers,
  })
}

function findSpecification(specifications: Specification[], name: string): Specification | undefined {
  return specifications.find((item) => item.name === name)
}

function assertCurrentCopy(product: ProductRecord): Specification[] {
  const specifications = parseSpecifications(product.specifications)
  const checks = {
    inactive: !product.isActive && !product.isFeatured,
    oldDescription: product.description === OLD_DESCRIPTION,
    oldMetaDescription: product.metaDescription === OLD_META_DESCRIPTION,
    oldSafetyClassification: findSpecification(specifications, 'Safety Classification')?.value === OLD_SAFETY_CLASSIFICATION,
    noCertificationField: !findSpecification(specifications, 'Certification'),
    oldVerificationNote: findSpecification(specifications, 'Verification Note')?.value === OLD_VERIFICATION_NOTE,
  }
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length > 0) {
    throw new Error('Current copy no longer matches the approved update baseline: ' + failed.join(', '))
  }
  return specifications
}

function buildSpecifications(specifications: Specification[]): Specification[] {
  return specifications.flatMap((item) => {
    if (item.name === 'Safety Classification') {
      return [
        { name: 'Safety Classification', value: 'S3' },
        { name: 'Certification', value: 'CE' },
      ]
    }
    if (item.name === 'Verification Note') {
      return [{ name: 'Verification Note', value: NEW_VERIFICATION_NOTE }]
    }
    return [item]
  })
}

function specificationsOutsideScope(specifications: Specification[]): Specification[] {
  const allowedNames = new Set(['Safety Classification', 'Certification', 'Verification Note'])
  return specifications.filter((item) => !allowedNames.has(item.name))
}

function assertUpdatedCopy(product: ProductRecord, beforeSpecifications: Specification[]): void {
  const specifications = parseSpecifications(product.specifications)
  const checks = {
    inactive: !product.isActive && !product.isFeatured,
    description: product.description === NEW_DESCRIPTION,
    metaDescription: product.metaDescription === NEW_META_DESCRIPTION,
    safetyClassification: findSpecification(specifications, 'Safety Classification')?.value === 'S3',
    certification: findSpecification(specifications, 'Certification')?.value === 'CE',
    verificationNote: findSpecification(specifications, 'Verification Note')?.value === NEW_VERIFICATION_NOTE,
    noOldHedging: !JSON.stringify({
      description: product.description,
      metaDescription: product.metaDescription,
      specifications,
    }).includes('certificate not provided'),
    unrelatedSpecificationsPreserved: JSON.stringify(specificationsOutsideScope(specifications)) === JSON.stringify(specificationsOutsideScope(beforeSpecifications)),
  }
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length > 0) {
    throw new Error('Updated copy verification failed: ' + failed.join(', '))
  }
}

async function execute(): Promise<void> {
  const before = await readProduct()
  const beforeSpecifications = assertCurrentCopy(before)
  const beforeProtected = protectedSnapshot(before)
  const nextSpecifications = buildSpecifications(beforeSpecifications)
  await prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({
      where: { id: PRODUCT_ID },
      select: {
        updatedAt: true,
        isActive: true,
        isFeatured: true,
        description: true,
        metaDescription: true,
        specifications: true,
      },
    })
    if (!current || current.updatedAt.getTime() !== before.updatedAt.getTime()) {
      throw new Error('Product changed after preflight')
    }
    if (current.isActive || current.isFeatured) {
      throw new Error('Product is no longer an inactive draft')
    }
    if (current.description !== OLD_DESCRIPTION || current.metaDescription !== OLD_META_DESCRIPTION) {
      throw new Error('Product copy changed after preflight')
    }
    const currentSpecifications = parseSpecifications(current.specifications)
    if (JSON.stringify(currentSpecifications) !== JSON.stringify(beforeSpecifications)) {
      throw new Error('Product specifications changed after preflight')
    }
    await tx.product.update({
      where: { id: PRODUCT_ID },
      data: {
        description: NEW_DESCRIPTION,
        metaDescription: NEW_META_DESCRIPTION,
        specifications: nextSpecifications,
      },
    })
  }, { isolationLevel: 'Serializable', timeout: 30_000 })
  const after = await readProduct()
  assertUpdatedCopy(after, beforeSpecifications)
  if (protectedSnapshot(after) !== beforeProtected) {
    throw new Error('A protected commercial, media, SEO or publication field changed')
  }
  const protectedSnapshotSha256 = createHash('sha256').update(beforeProtected).digest('hex')
  await writeFile(AUDIT_PATH, JSON.stringify({
    productId: PRODUCT_ID,
    productSlug: PRODUCT_SLUG,
    userStatement: 'This product has a CE certificate',
    changes: {
      description: { before: OLD_DESCRIPTION, after: NEW_DESCRIPTION },
      metaDescription: { before: OLD_META_DESCRIPTION, after: NEW_META_DESCRIPTION },
      safetyClassification: { before: OLD_SAFETY_CLASSIFICATION, after: 'S3' },
      certification: { before: null, after: 'CE' },
      verificationNote: { before: OLD_VERIFICATION_NOTE, after: NEW_VERIFICATION_NOTE },
    },
    intentionallyNotInvented: ['certificate number', 'applicable standard number/version'],
    protectedSnapshotSha256,
    completedAt: new Date().toISOString(),
  }, null, 2) + '\n', 'utf8')
  process.stdout.write(JSON.stringify({
    mode: 'execute',
    productId: after.id,
    description: after.description,
    metaDescription: after.metaDescription,
    certification: findSpecification(parseSpecifications(after.specifications), 'Certification'),
    isActive: after.isActive,
    isFeatured: after.isFeatured,
    protectedSnapshotSha256,
  }, null, 2) + '\n')
}

async function verify(): Promise<void> {
  const product = await readProduct()
  const specifications = parseSpecifications(product.specifications)
  assertUpdatedCopy(product, specificationsOutsideScope(specifications))
  process.stdout.write(JSON.stringify({
    mode: 'verify',
    productId: product.id,
    description: product.description,
    metaDescription: product.metaDescription,
    safetyClassification: findSpecification(specifications, 'Safety Classification'),
    certification: findSpecification(specifications, 'Certification'),
    verificationNote: findSpecification(specifications, 'Verification Note'),
    price: product.price.toString(),
    stock: product.stock,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    galleryCount: product.images.length,
    variantCount: product.variants.length,
    priceTierCount: product.priceTiers.length,
  }, null, 2) + '\n')
}

async function dryRun(): Promise<void> {
  const product = await readProduct()
  assertCurrentCopy(product)
  process.stdout.write(JSON.stringify({
    mode: 'dry-run',
    productId: product.id,
    currentPricePreserved: product.price.toString(),
    currentInactiveStatePreserved: !product.isActive && !product.isFeatured,
    proposedDescription: NEW_DESCRIPTION,
    proposedMetaDescription: NEW_META_DESCRIPTION,
    proposedSafetyClassification: 'S3',
    proposedCertification: 'CE',
    certificateNumberInvented: false,
    standardVersionInvented: false,
  }, null, 2) + '\n')
}

async function main(): Promise<void> {
  if (process.argv.includes('--execute')) return execute()
  if (process.argv.includes('--verify')) return verify()
  return dryRun()
}

main()
  .catch((error: unknown) => {
    process.stderr.write('CE copy update failed: ' + (error instanceof Error ? error.message : String(error)) + '\n')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
