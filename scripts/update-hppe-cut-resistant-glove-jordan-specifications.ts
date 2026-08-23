import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import { z } from 'zod'

const PRODUCT_ID = 'cmnv8xzul000fumsoftuppnjm'
const PRODUCT_SLUG = 'hppe-cut-resistant-nitrile-palm-coated-anti-slip-work'
const PRODUCT_NAME = 'HPPE Cut-Resistant Nitrile Palm-Coated Anti-Slip Work Gloves'
const NOTION_SOURCE = 'https://app.notion.com/p/3c2d505a0030807b9586df14ddf66964?pvs=204'
const AUDIT_DIR = path.resolve('output/hppe-cut-resistant-glove-jordan-spec-update')
const SNAPSHOT_PATH = path.join(AUDIT_DIR, 'protected-snapshot.json')
const AUDIT_PATH = path.join(AUDIT_DIR, 'update-audit.json')

const OLD_DESCRIPTION = 'Made from HPPE with a textured nitrile palm coating, these work gloves deliver reliable cut resistance, secure grip, and flexible dexterity for industrial handling and general-purpose tasks. OEM/ODM customization for logos, colors, and packaging is available to meet private-label and sourcing needs.'
const NEW_DESCRIPTION = 'Cut-resistant work gloves made with an HPPE, spandex, nylon and glass-fiber liner and a black sandy nitrile palm coating. Source documentation identifies EN ISO 21420:2020 and EN 388:2016+A1:2018 performance level 4X43D. Available in heather gray and black, in sizes S to 2XL.'

const TARGET_SIZE_VALUES = ['S', 'M', 'L', 'XL', '2XL'] as const
const EXPECTED_OLD_SIZE_VALUES = ['M', 'S', 'L', '2XL', '3XL'] as const
const EXPECTED_COLOR_VALUES = ['Black', 'Gray'] as const

const specificationSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
})
const specificationsSchema = z.array(specificationSchema)

type Specification = z.infer<typeof specificationSchema>
type ProductRecord = Awaited<ReturnType<typeof readProduct>>

const TARGET_SPECIFICATIONS: Specification[] = [
  { name: 'Product Type', value: 'Mechanical-risk cut-resistant work gloves' },
  { name: 'Liner Material', value: 'HPPE (high-performance polyethylene), spandex, nylon and glass fiber' },
  { name: 'Coating', value: 'Black sandy nitrile palm coating' },
  { name: 'Color', value: 'Heather gray and black' },
  { name: 'Standards', value: 'EN ISO 21420:2020; EN 388:2016+A1:2018' },
  { name: 'EN 388 Performance Level', value: '4X43D' },
  { name: 'EN 388 Breakdown', value: 'Abrasion 4; Coup cut X (not tested/not applicable); Tear 4; Puncture 3; TDM cut D' },
  { name: 'Source-Image Features', value: 'Cut resistance, abrasion resistance, oil resistance, enhanced grip/anti-slip and breathability' },
  { name: 'Available Sizes', value: 'S, M, L, XL, 2XL' },
  { name: 'Nominal Total Length', value: 'S: 23 cm; M: 24 cm; L: 25 cm; XL: 26 cm; 2XL: detailed measurement not provided' },
  { name: 'S Measurements', value: 'Middle finger 72 mm (±5 mm); palm width 91 mm (±7 mm); cuff width 73 mm (±7 mm); cuff length 76 mm (±7 mm); total length 230 mm (±10 mm)' },
  { name: 'M Measurements', value: 'Middle finger 74 mm (±5 mm); palm width 97 mm (±7 mm); cuff width 75 mm (±7 mm); cuff length 80 mm (±7 mm); total length 240 mm (±10 mm)' },
  { name: 'L Measurements', value: 'Middle finger 78 mm (±5 mm); palm width 106 mm (±7 mm); cuff width 78 mm (±7 mm); cuff length 83 mm (±7 mm); total length 250 mm (±10 mm)' },
  { name: 'XL Measurements', value: 'Middle finger 81 mm (±5 mm); palm width 108 mm (±7 mm); cuff width 80 mm (±7 mm); cuff length 86 mm (±7 mm); total length 260 mm (±10 mm)' },
  { name: 'Evidence Note', value: 'The EN 388 rating follows the supplied performance evidence. Feature wording is based on source imagery; no separate function-specific test reports were provided.' },
]

const prisma = new PrismaClient()

async function readProduct() {
  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: { id: 'asc' } },
      priceTiers: { orderBy: { sortOrder: 'asc' } },
      slugRedirects: { orderBy: { slug: 'asc' } },
      attributeValues: {
        orderBy: { attributeId: 'asc' },
        include: {
          attribute: {
            include: { options: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      },
    },
  })
  if (!product || product.slug !== PRODUCT_SLUG || product.name !== PRODUCT_NAME) {
    throw new Error('Target product was not found with the expected identity')
  }
  return product
}

function parseSpecifications(value: Prisma.JsonValue | null): Specification[] {
  return specificationsSchema.parse(value)
}

function attributeValue(product: ProductRecord, code: string) {
  const value = product.attributeValues.find((item) => item.attribute.code === code)
  if (!value) throw new Error('Required product attribute is missing: ' + code)
  return value
}

function selectedOptionValues(product: ProductRecord, code: string): string[] {
  const value = attributeValue(product, code)
  const byId = new Map(value.attribute.options.map((option) => [option.id, option.value]))
  return value.optionIds.map((optionId) => {
    const optionValue = byId.get(optionId)
    if (!optionValue) throw new Error('Unknown option ID on ' + code + ' attribute: ' + optionId)
    return optionValue
  })
}

function optionIdsForValues(product: ProductRecord, code: string, values: readonly string[]): string[] {
  const attribute = attributeValue(product, code).attribute
  return values.map((value) => {
    const matching = attribute.options.filter((option) => option.value === value)
    if (matching.length !== 1) {
      throw new Error('Expected exactly one ' + code + ' option for ' + value + ', found ' + matching.length)
    }
    const option = matching[0]
    if (!option) throw new Error('Option lookup failed for ' + code + ': ' + value)
    return option.id
  })
}

function sameArray(actual: readonly string[], expected: readonly string[]): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected)
}

function protectedSnapshotData(product: ProductRecord) {
  return {
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
    metaDescription: product.metaDescription,
    metaKeywords: product.metaKeywords,
    metaTitle: product.metaTitle,
    ogDescription: product.ogDescription,
    ogImage: product.ogImage,
    ogTitle: product.ogTitle,
    sortOrder: product.sortOrder,
    usageScenes: product.usageScenes,
    category: product.category,
    images: product.images,
    variants: product.variants,
    priceTiers: product.priceTiers,
    slugRedirects: product.slugRedirects,
    attributesOutsideSize: product.attributeValues.filter((item) => item.attribute.code !== 'size'),
  }
}

function protectedSnapshot(product: ProductRecord): string {
  return JSON.stringify(protectedSnapshotData(product))
}

function assertBaseline(product: ProductRecord): void {
  const specifications = parseSpecifications(product.specifications)
  const baselineChecks = {
    activeFeatured: product.isActive && product.isFeatured,
    description: product.description === OLD_DESCRIPTION,
    specificationCount: specifications.length === 26,
    oldModel: specifications.some((item) => item.name === 'Model Number' && item.value === 'BSP-056'),
    oldSource: specifications.some((item) => item.name === 'Source URL' && item.value.includes('alibaba.com')),
    oldSizes: sameArray(selectedOptionValues(product, 'size'), EXPECTED_OLD_SIZE_VALUES),
    colors: sameArray(selectedOptionValues(product, 'color'), EXPECTED_COLOR_VALUES),
    galleryCount: product.images.length === 6,
    variantCount: product.variants.length === 0,
    priceTierCount: product.priceTiers.length === 3,
  }
  const failed = Object.entries(baselineChecks).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length > 0) {
    throw new Error('Current product no longer matches the approved update baseline: ' + failed.join(', '))
  }
}

function assertUpdated(product: ProductRecord): void {
  const specifications = parseSpecifications(product.specifications)
  const publicData = JSON.stringify({ description: product.description, specifications })
  const removedUnsupportedPattern = /BSP-056|touchscreen|waterproof|anti-static|heat-resistant|anti-vibration|chemical-resistant|cleanroom|cold-resistant|198\.45|latex-free|silicone-free|powder-free|impact protection|sterile/i
  const updatedChecks = {
    description: product.description === NEW_DESCRIPTION,
    specifications: JSON.stringify(specifications) === JSON.stringify(TARGET_SPECIFICATIONS),
    sizes: sameArray(selectedOptionValues(product, 'size'), TARGET_SIZE_VALUES),
    colors: sameArray(selectedOptionValues(product, 'color'), EXPECTED_COLOR_VALUES),
    unsupportedOldParametersRemoved: !removedUnsupportedPattern.test(publicData),
    conflictingModelOmitted: !/SR100|XY-130/i.test(publicData),
    certificationRating: specifications.some((item) => item.name === 'EN 388 Performance Level' && item.value === '4X43D'),
    twoXlMeasurementsNotInvented: specifications.some((item) => item.name === 'Nominal Total Length' && item.value.includes('2XL: detailed measurement not provided')),
  }
  const failed = Object.entries(updatedChecks).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length > 0) throw new Error('Updated product verification failed: ' + failed.join(', '))
}

async function execute(): Promise<void> {
  const before = await readProduct()
  assertBaseline(before)
  const beforeProtected = protectedSnapshot(before)
  const sizeValue = attributeValue(before, 'size')
  const targetSizeOptionIds = optionIdsForValues(before, 'size', TARGET_SIZE_VALUES)

  await mkdir(AUDIT_DIR, { recursive: true })
  await writeFile(SNAPSHOT_PATH, JSON.stringify({
    capturedAt: new Date().toISOString(),
    productId: before.id,
    productUpdatedAt: before.updatedAt,
    sizeAttributeValueId: sizeValue.id,
    sizeAttributeUpdatedAt: sizeValue.updatedAt,
    protected: protectedSnapshotData(before),
    changedFieldsBefore: {
      description: before.description,
      specifications: before.specifications,
      sizes: selectedOptionValues(before, 'size'),
    },
  }, null, 2) + '\n', 'utf8')

  await prisma.$transaction(async (tx) => {
    const [currentProduct, currentSizeValue] = await Promise.all([
      tx.product.findUnique({
        where: { id: PRODUCT_ID },
        select: { updatedAt: true, slug: true, name: true, description: true, specifications: true },
      }),
      tx.productAttributeValue.findUnique({
        where: { id: sizeValue.id },
        select: { updatedAt: true, productId: true, attributeId: true, optionIds: true },
      }),
    ])
    if (!currentProduct || currentProduct.updatedAt.getTime() !== before.updatedAt.getTime()) {
      throw new Error('Product changed after preflight; refusing a stale update')
    }
    if (currentProduct.slug !== PRODUCT_SLUG || currentProduct.name !== PRODUCT_NAME
      || currentProduct.description !== OLD_DESCRIPTION
      || JSON.stringify(parseSpecifications(currentProduct.specifications)) !== JSON.stringify(parseSpecifications(before.specifications))) {
      throw new Error('Product copy changed after preflight')
    }
    if (!currentSizeValue || currentSizeValue.updatedAt.getTime() !== sizeValue.updatedAt.getTime()
      || currentSizeValue.productId !== PRODUCT_ID || currentSizeValue.attributeId !== sizeValue.attributeId
      || !sameArray(currentSizeValue.optionIds, sizeValue.optionIds)) {
      throw new Error('Product size attribute changed after preflight')
    }

    const productUpdate = await tx.product.updateMany({
      where: { id: PRODUCT_ID, updatedAt: before.updatedAt },
      data: {
        description: NEW_DESCRIPTION,
        specifications: TARGET_SPECIFICATIONS,
      },
    })
    if (productUpdate.count !== 1) throw new Error('Product updatedAt guard rejected the update')

    const sizeUpdate = await tx.productAttributeValue.updateMany({
      where: { id: sizeValue.id, productId: PRODUCT_ID, attributeId: sizeValue.attributeId, updatedAt: sizeValue.updatedAt },
      data: { optionIds: targetSizeOptionIds },
    })
    if (sizeUpdate.count !== 1) throw new Error('Size attribute updatedAt guard rejected the update')
  }, { isolationLevel: 'Serializable', timeout: 30_000 })

  const after = await readProduct()
  assertUpdated(after)
  if (protectedSnapshot(after) !== beforeProtected) {
    throw new Error('A protected commercial, media, publication, SEO or non-size attribute field changed')
  }

  const protectedSnapshotSha256 = createHash('sha256').update(beforeProtected).digest('hex')
  await writeFile(AUDIT_PATH, JSON.stringify({
    productId: PRODUCT_ID,
    productSlug: PRODUCT_SLUG,
    notionSource: NOTION_SOURCE,
    changes: {
      description: { before: OLD_DESCRIPTION, after: NEW_DESCRIPTION },
      specifications: { before: before.specifications, after: TARGET_SPECIFICATIONS },
      sizes: { before: selectedOptionValues(before, 'size'), after: selectedOptionValues(after, 'size') },
    },
    intentionallyPreserved: ['name', 'slug', 'price', 'price tiers', 'stock', 'category', 'gallery', 'detail images', 'publication state', 'SEO fields', 'usage scenes', 'color attribute'],
    intentionallyOmitted: ['conflicting SR100/XY-130 model claim', 'unsupported 2XL detailed measurements', 'unsupported old Alibaba parameters'],
    protectedSnapshotSha256,
    completedAt: new Date().toISOString(),
  }, null, 2) + '\n', 'utf8')

  process.stdout.write(JSON.stringify({
    mode: 'execute',
    productId: after.id,
    slug: after.slug,
    en388: TARGET_SPECIFICATIONS.find((item) => item.name === 'EN 388 Performance Level'),
    sizes: selectedOptionValues(after, 'size'),
    price: after.price.toString(),
    isActive: after.isActive,
    isFeatured: after.isFeatured,
    galleryCount: after.images.length,
    variantCount: after.variants.length,
    priceTierCount: after.priceTiers.length,
    protectedSnapshotSha256,
  }, null, 2) + '\n')
}

async function verify(): Promise<void> {
  const product = await readProduct()
  assertUpdated(product)
  const checks = {
    pricePreserved: product.price.toString() === '0.49',
    publicationPreserved: product.isActive && product.isFeatured,
    categoryPreserved: product.category?.slug === 'cut-resistant-gloves',
    mediaPreserved: product.images.length === 6,
    variantsPreserved: product.variants.length === 0,
    priceTiersPreserved: product.priceTiers.length === 3,
  }
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length > 0) throw new Error('Protected-field verification failed: ' + failed.join(', '))
  process.stdout.write(JSON.stringify({
    mode: 'verify',
    productId: product.id,
    description: product.description,
    specifications: product.specifications,
    sizes: selectedOptionValues(product, 'size'),
    colors: selectedOptionValues(product, 'color'),
    checks,
  }, null, 2) + '\n')
}

async function dryRun(): Promise<void> {
  const product = await readProduct()
  assertBaseline(product)
  optionIdsForValues(product, 'size', TARGET_SIZE_VALUES)
  process.stdout.write(JSON.stringify({
    mode: 'dry-run',
    productId: product.id,
    notionSource: NOTION_SOURCE,
    currentSizes: selectedOptionValues(product, 'size'),
    targetSizes: TARGET_SIZE_VALUES,
    targetSpecifications: TARGET_SPECIFICATIONS,
    preserved: ['name', 'slug', 'price', 'price tiers', 'stock', 'category', 'gallery', 'detail images', 'active/featured state', 'SEO fields', 'usage scenes', 'color attribute'],
    omitted: ['SR100', 'XY-130', '2XL detailed measurements', 'unsupported old Alibaba parameters'],
  }, null, 2) + '\n')
}

async function main(): Promise<void> {
  if (process.argv.includes('--execute')) return execute()
  if (process.argv.includes('--verify')) return verify()
  return dryRun()
}

main()
  .catch((error: unknown) => {
    process.stderr.write('HPPE glove specification update failed: ' + (error instanceof Error ? error.message : String(error)) + '\n')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
