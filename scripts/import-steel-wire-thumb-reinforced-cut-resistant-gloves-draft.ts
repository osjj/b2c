import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const IMPORT_DIR = path.resolve('output/steel-wire-thumb-reinforced-cut-resistant-sandy-gloves')
const SOURCE_DIR = path.join(IMPORT_DIR, 'source')
const FINAL_DIR = path.join(IMPORT_DIR, 'final')
const AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.json')
const PRE_DB_AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.pre-db.json')
const UPLOAD_MANIFEST_PATH = path.join(IMPORT_DIR, 'upload-manifest.json')

const CATEGORY_SLUG = 'cut-resistant-gloves'
const CATEGORY_NAME = 'Cut Resistant Gloves'
const PRODUCT_NAME = 'Steel-Wire Thumb-Reinforced Cut-Resistant Sandy-Coated Gloves'
const PRODUCT_SLUG = 'steel-wire-thumb-reinforced-cut-resistant-sandy-coated-gloves'
const PRODUCT_PRICE = new Prisma.Decimal('0.00')
const NOTION_PAGE_ID = '3c8d505a-0030-8007-aa6f-f3f70415987a'
const NOTION_URL = 'https://app.notion.com/p/3c8d505a00308007aa6ff3f70415987a'

const sourceDecisionSchema = z.enum(['keep', 'reject'])
const provenanceSchema = z.enum(['gallery', 'detail'])

const sourceAssetSchema = z.object({
  sourceIndex: z.number().int().min(1),
  sourceRef: z.string().min(1),
  decision: sourceDecisionSchema,
  categories: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1),
})

const finalAssetSchema = z.object({
  finalIndex: z.number().int().min(1),
  provenance: provenanceSchema,
  categories: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1),
  derivedFromSourceIndex: z.number().int().min(1),
  inputRef: z.string().min(1),
  outputRef: z.string().min(1),
  outputUrl: z.string().url().optional(),
  qa: z.literal('pass'),
})

const importAuditSchema = z.object({
  product: z.object({
    sourcePageId: z.literal(NOTION_PAGE_ID),
    notionUrl: z.literal(NOTION_URL),
    title: z.literal(PRODUCT_NAME),
    sourcePriceEvidence: z.literal('1.21 (source currency and unit not stated)'),
    minimumOrderQuantity: z.literal('1000 (source unit not stated)'),
    sellingPriceStatus: z.string().min(1),
    draftPricePlaceholder: z.literal('0.00'),
    storefrontStockStatus: z.string().min(1),
    skuStatus: z.string().min(1),
    variantStatus: z.string().min(1),
    priceTierStatus: z.string().min(1),
    complianceEvidenceStatus: z.string().min(1),
  }),
  sourceTotals: z.object({
    notionImages: z.literal(5),
    approvedFinalAssets: z.literal(5),
    gallery: z.literal(3),
    detail: z.literal(2),
    rejectedSourceImages: z.literal(0),
  }),
  sourceAssets: z.array(sourceAssetSchema).length(5),
  finalAssets: z.array(finalAssetSchema).length(5),
  gate: z.object({
    phase: z.string().min(1),
    sourceCoverage: z.string().min(1),
    databaseMutationAllowed: z.boolean(),
    r2UploadAllowed: z.boolean(),
    reason: z.string().min(1),
  }),
})

const uploadManifestSchema = z.object({
  productSlug: z.literal(PRODUCT_SLUG),
  createdAt: z.string().datetime(),
  assets: z.array(z.object({
    finalIndex: z.number().int().min(1),
    provenance: provenanceSchema,
    outputRef: z.string().min(1),
    outputUrl: z.string().url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })).length(5),
})

const editorContentSchema = z.object({
  blocks: z.array(z.object({
    data: z.object({
      file: z.object({ url: z.string().url() }),
    }),
  })),
})

type ImportAudit = z.infer<typeof importAuditSchema>
type UploadManifest = z.infer<typeof uploadManifestSchema>
type UploadedAsset = UploadManifest['assets'][number]

const prisma = new PrismaClient()

function sequentialIndexes(values: number[], expectedLength: number): boolean {
  return values
    .slice()
    .sort((a, b) => a - b)
    .every((value, index) => value === index + 1) && values.length === expectedLength
}

function resolveImportOutput(outputRef: string): string {
  const resolved = path.resolve(IMPORT_DIR, outputRef)
  const relative = path.relative(IMPORT_DIR, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Audit outputRef resolves outside the import directory: ' + outputRef)
  }
  return resolved
}

async function readAudit(filePath = AUDIT_PATH): Promise<ImportAudit> {
  const raw: unknown = JSON.parse(await readFile(filePath, 'utf8'))
  return importAuditSchema.parse(raw)
}

async function validateAudit(audit: ImportAudit, phase: 'pre-upload' | 'pre-db'): Promise<void> {
  if (!/not provided/i.test(audit.product.sellingPriceStatus)) {
    throw new Error('Audit must state that a storefront selling price was not provided')
  }
  if (!/not created/i.test(audit.product.variantStatus) || !/not created/i.test(audit.product.priceTierStatus)) {
    throw new Error('Audit must forbid inferred variants and price tiers')
  }
  if (!/not supplied/i.test(audit.product.complianceEvidenceStatus)) {
    throw new Error('Audit must preserve the missing certificate/test-report boundary')
  }
  if (!sequentialIndexes(audit.sourceAssets.map((asset) => asset.sourceIndex), 5)) {
    throw new Error('Source audit must cover Notion images 1 through 5 exactly once')
  }
  if (audit.sourceAssets.some((asset) => asset.decision !== 'keep')) {
    throw new Error('All five requested Notion images must remain approved')
  }
  if (!sequentialIndexes(audit.finalAssets.map((asset) => asset.finalIndex), 5)) {
    throw new Error('Final audit must cover approved assets 1 through 5 exactly once')
  }
  const gallery = audit.finalAssets.filter((asset) => asset.provenance === 'gallery')
  const details = audit.finalAssets.filter((asset) => asset.provenance === 'detail')
  if (gallery.length !== 3 || details.length !== 2) {
    throw new Error('The first three images must be gallery assets and the last two detail assets')
  }
  for (const asset of audit.finalAssets) {
    const expectedProvenance = asset.finalIndex <= 3 ? 'gallery' : 'detail'
    if (asset.provenance !== expectedProvenance || asset.derivedFromSourceIndex !== asset.finalIndex) {
      throw new Error('Image order/provenance changed for asset ' + asset.finalIndex)
    }
  }
  await Promise.all(audit.finalAssets.map(async (asset) => {
    const metadata = await sharp(resolveImportOutput(asset.outputRef)).metadata()
    if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
      throw new Error('Final asset is not a valid WebP: ' + asset.outputRef)
    }
    if (phase === 'pre-db' && (!asset.outputUrl || asset.outputUrl.includes('prod-files-secure'))) {
      throw new Error('Final asset lacks a durable R2 URL: ' + asset.finalIndex)
    }
  }))
  if (phase === 'pre-upload' && (!audit.gate.r2UploadAllowed || audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-upload gate must allow R2 upload and forbid database mutation')
  }
  if (phase === 'pre-db' && (!audit.gate.r2UploadAllowed || !audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-db gate must allow both R2 upload and database mutation')
  }
}

async function prepareAssets(audit: ImportAudit): Promise<Array<Record<string, unknown>>> {
  await mkdir(FINAL_DIR, { recursive: true })
  const prepared = await Promise.all(audit.finalAssets.map(async (asset) => {
    const sourcePath = path.join(SOURCE_DIR, 'source-' + String(asset.derivedFromSourceIndex).padStart(2, '0') + '.png')
    if (path.resolve(asset.inputRef) !== path.resolve(sourcePath)) {
      throw new Error('Audit inputRef does not match source image ' + asset.finalIndex)
    }
    const outputPath = resolveImportOutput(asset.outputRef)
    await sharp(sourcePath)
      .rotate()
      .webp({ quality: 90, effort: 6, smartSubsample: true })
      .toFile(outputPath)
    const metadata = await sharp(outputPath).metadata()
    if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
      throw new Error('Prepared asset failed WebP validation: ' + asset.outputRef)
    }
    return {
      finalIndex: asset.finalIndex,
      provenance: asset.provenance,
      outputRef: asset.outputRef,
      width: metadata.width,
      height: metadata.height,
    }
  }))
  await validateAudit(audit, 'pre-upload')
  return prepared
}

async function assertPublicWebp(url: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.toLowerCase().includes('image/webp')) {
    throw new Error('Uploaded asset returned HTTP ' + response.status + ' with ' + (contentType || 'no content type'))
  }
  await response.body?.cancel()
}

async function withRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  const runAttempt = async (attempt: number): Promise<T> => {
    try {
      return await operation()
    } catch (error) {
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750))
        return runAttempt(attempt + 1)
      }
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(label + ' failed after 3 attempts: ' + reason)
    }
  }
  return runAttempt(1)
}

async function cleanupUrls(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(urls.map((url) => deleteFromR2(url)))
  return results.flatMap((result, index) => result.status === 'rejected' ? [urls[index] ?? 'unknown'] : [])
}

async function uploadAssets(audit: ImportAudit): Promise<UploadManifest> {
  await validateAudit(audit, 'pre-upload')
  const uploaded: UploadedAsset[] = []
  try {
    const prepared = await Promise.all(audit.finalAssets.map(async (asset) => {
      const filePath = resolveImportOutput(asset.outputRef)
      const [buffer, metadata] = await Promise.all([readFile(filePath), sharp(filePath).metadata()])
      if (!metadata.width || !metadata.height) {
        throw new Error('Missing dimensions for ' + asset.outputRef)
      }
      return { asset, buffer, width: metadata.width, height: metadata.height }
    }))
    await prepared.reduce<Promise<void>>(async (previousUpload, item) => {
      await previousUpload
      const role = item.asset.provenance === 'gallery' ? 'g' : 'd'
      const filename = [
        '20260827-steel-wire-thumb-reinforced-cut-resistant-gloves-v1',
        role + String(item.asset.finalIndex).padStart(2, '0'),
        randomUUID().slice(0, 8),
      ].join('-') + '.webp'
      const outputUrl = await withRetry(
        'R2 upload for asset ' + item.asset.finalIndex,
        () => uploadToR2(item.buffer, filename, 'image/webp')
      )
      await withRetry('Public WebP verification for asset ' + item.asset.finalIndex, () => assertPublicWebp(outputUrl))
      item.asset.outputUrl = outputUrl
      uploaded.push({
        finalIndex: item.asset.finalIndex,
        provenance: item.asset.provenance,
        outputRef: item.asset.outputRef,
        outputUrl,
        width: item.width,
        height: item.height,
      })
    }, Promise.resolve())
    audit.gate = {
      phase: 'pre-db-approved',
      sourceCoverage: '5/5 source images reconciled; first 3 gallery and last 2 detail assets uploaded',
      databaseMutationAllowed: true,
      r2UploadAllowed: true,
      reason: 'User explicitly requested the inactive product draft import and specified the first three images as gallery images; all final WebPs passed public verification.',
    }
    await validateAudit(audit, 'pre-db')
    const manifest = uploadManifestSchema.parse({
      productSlug: PRODUCT_SLUG,
      createdAt: new Date().toISOString(),
      assets: uploaded,
    })
    await Promise.all([
      writeFile(PRE_DB_AUDIT_PATH, JSON.stringify(audit, null, 2) + '\n', 'utf8'),
      writeFile(UPLOAD_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8'),
    ])
    return manifest
  } catch (error) {
    const failedCleanup = await cleanupUrls(uploaded.map((asset) => asset.outputUrl))
    const reason = error instanceof Error ? error.message : String(error)
    const cleanupStatus = failedCleanup.length > 0
      ? 'Manual cleanup required for ' + failedCleanup.join(', ')
      : 'New uploads were cleaned up.'
    throw new Error('Asset upload failed: ' + reason + '. ' + cleanupStatus, error instanceof Error ? { cause: error } : undefined)
  }
}

async function preflight(): Promise<{ category: { id: string; name: string; slug: string; isActive: boolean } }> {
  const category = await prisma.category.findUnique({
    where: { slug: CATEGORY_SLUG },
    select: { id: true, name: true, slug: true, isActive: true },
  })
  const existingProducts = await prisma.product.findMany({
    where: {
      OR: [
        { slug: PRODUCT_SLUG },
        { name: { equals: PRODUCT_NAME, mode: 'insensitive' } },
      ],
    },
    select: { id: true, slug: true, isActive: true },
  })
  const redirectConflict = await prisma.productSlugRedirect.findUnique({
    where: { slug: PRODUCT_SLUG },
    select: { productId: true },
  })
  if (!category || category.name !== CATEGORY_NAME || !category.isActive) {
    throw new Error('Active Cut Resistant Gloves category is missing or incompatible')
  }
  if (existingProducts.length > 0) {
    throw new Error('A matching product already exists; refusing to create a duplicate draft')
  }
  if (redirectConflict) {
    throw new Error('Product slug is reserved by an existing redirect')
  }
  return { category }
}

function productContent(details: UploadedAsset[]): Prisma.InputJsonValue {
  return {
    time: Date.now(),
    version: '2.31.1',
    blocks: details
      .slice()
      .sort((a, b) => a.finalIndex - b.finalIndex)
      .map((asset) => ({
        id: 'steel-wire-cut-gloves-detail-' + String(asset.finalIndex).padStart(2, '0'),
        type: 'image',
        data: {
          file: { url: asset.outputUrl },
          caption: '',
          withBorder: false,
          stretched: true,
          withBackground: false,
        },
      })),
  }
}

const specifications: Prisma.InputJsonValue = [
  { name: 'Product Type', value: 'Thumb-Reinforced Cut-Resistant Sandy-Coated Gloves' },
  { name: 'Liner Material', value: '15-Gauge HPPE + Stainless Steel Wire' },
  { name: 'Coating', value: 'Black Sandy Coating' },
  { name: 'Reinforcement', value: 'Reinforced Thumb Crotch' },
  { name: 'Features', value: 'Cut Resistance, Abrasion Resistance, Touchscreen-Compatible Fingertips (source claims)' },
  { name: 'Performance Marking', value: 'EN 388 4X43D (source page and product-image claim)' },
  { name: 'Sizes', value: '7/S, 8/M, 9/L, 10/XL, 11/XXL' },
  { name: 'Size 7/S', value: 'Green overlock; length 23 cm; palm width 8.5 cm' },
  { name: 'Size 8/M', value: 'Yellow overlock; length 24 cm; palm width 9 cm' },
  { name: 'Size 9/L', value: 'Grey overlock; length 25 cm; palm width 9.5 cm' },
  { name: 'Size 10/XL', value: 'Black overlock; length 26 cm; palm width 10 cm' },
  { name: 'Size 11/XXL', value: 'Blue overlock; length 27 cm; palm width 10.5 cm' },
  { name: 'Packing', value: '10 Pairs/Bag; 100 Pairs/Carton' },
  { name: 'Minimum Order Quantity', value: '1000 (source unit not stated)' },
  { name: 'Purchase Price', value: '1.21 (source currency and unit not stated; verify current quote)' },
  { name: 'Applications', value: 'Manufacturing, Construction, Gardening, Logistics, Mechanical Maintenance' },
  { name: 'Compliance Evidence', value: 'CE / EN 388 and 4X43D are source claims; no certificate or test report was supplied' },
  { name: 'Source', value: NOTION_URL },
]

const galleryAltByIndex = new Map<number, string>([
  [1, 'Steel-wire cut-resistant gloves with reinforced thumb crotch, front and palm views'],
  [2, 'Black sandy-coated palm of a thumb-reinforced cut-resistant glove'],
  [3, 'Pair of steel-wire cut-resistant sandy-coated gloves'],
])

async function writeProduct(
  manifest: UploadManifest,
  preflightResult: Awaited<ReturnType<typeof preflight>>
): Promise<Prisma.ProductGetPayload<{
  include: { images: true; variants: true; priceTiers: true; category: true }
}>> {
  const gallery = manifest.assets.filter((asset) => asset.provenance === 'gallery').sort((a, b) => a.finalIndex - b.finalIndex)
  const details = manifest.assets.filter((asset) => asset.provenance === 'detail').sort((a, b) => a.finalIndex - b.finalIndex)
  if (gallery.length !== 3 || details.length !== 2) {
    throw new Error('Upload manifest asset counts are inconsistent')
  }
  return prisma.$transaction(async (tx) => {
    const [category, slugConflict, redirectConflict] = await Promise.all([
      tx.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
      tx.product.findUnique({ where: { slug: PRODUCT_SLUG }, select: { id: true } }),
      tx.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG }, select: { productId: true } }),
    ])
    if (!category || !category.isActive || category.id !== preflightResult.category.id) {
      throw new Error('Cut Resistant Gloves category changed after preflight')
    }
    if (slugConflict || redirectConflict) {
      throw new Error('Product slug became unavailable after preflight')
    }
    return tx.product.create({
      data: {
        name: PRODUCT_NAME,
        slug: PRODUCT_SLUG,
        description: '15-gauge HPPE and stainless-steel-wire cut-resistant gloves with a black sandy coating and reinforced thumb crotch. The source lists sizes 7/S through 11/XXL and an EN 388 performance marking of 4X43D.',
        price: PRODUCT_PRICE,
        comparePrice: null,
        cost: null,
        sku: null,
        stock: 0,
        categoryId: category.id,
        isActive: false,
        isFeatured: false,
        specifications,
        content: productContent(details),
        usageScenes: ['steel-handling', 'construction-materials', 'logistics-handling', 'mechanical-maintenance'],
        metaTitle: 'Steel-Wire Cut-Resistant Sandy-Coated Gloves',
        metaDescription: '15-gauge HPPE and steel-wire cut-resistant gloves with sandy coating, reinforced thumb crotch and EN 388 4X43D source marking.',
        metaKeywords: 'steel wire cut resistant gloves, thumb reinforced gloves, sandy coated work gloves, EN 388 4X43D gloves',
        ogTitle: PRODUCT_NAME,
        ogDescription: 'Thumb-reinforced steel-wire cut-resistant gloves with a black sandy coating for industrial handling tasks.',
        ogImage: gallery[0]?.outputUrl ?? null,
        images: {
          create: gallery.map((asset, index) => ({
            url: asset.outputUrl,
            alt: galleryAltByIndex.get(asset.finalIndex) ?? PRODUCT_NAME,
            sortOrder: index,
          })),
        },
      },
      include: { images: true, variants: true, priceTiers: true, category: true },
    })
  }, { isolationLevel: 'Serializable', timeout: 30_000 })
}

async function readManifest(): Promise<UploadManifest> {
  const raw: unknown = JSON.parse(await readFile(UPLOAD_MANIFEST_PATH, 'utf8'))
  return uploadManifestSchema.parse(raw)
}

async function verifyImportedDraft(): Promise<Record<string, unknown>> {
  const product = await prisma.product.findUnique({
    where: { slug: PRODUCT_SLUG },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
      priceTiers: true,
    },
  })
  if (!product) {
    throw new Error('Imported product draft was not found')
  }
  const parsedContent = editorContentSchema.safeParse(product.content)
  if (!parsedContent.success) {
    throw new Error('Imported detail content does not match the expected EditorJS image format')
  }
  const detailUrls = parsedContent.data.blocks.map((block) => block.data.file.url)
  const specificationsText = JSON.stringify(product.specifications)
  const contentText = JSON.stringify(product.content)
  const assertions = {
    placeholderPrice: product.price.toString() === '0',
    inactive: !product.isActive && !product.isFeatured,
    category: product.category?.slug === CATEGORY_SLUG,
    galleryCount: product.images.length === 3,
    detailCount: detailUrls.length === 2,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    noSku: product.sku === null,
    schemaSafeStock: product.stock === 0,
    sourcePriceBoundary: specificationsText.includes('source currency and unit not stated'),
    minimumOrderBoundary: specificationsText.includes('1000 (source unit not stated)'),
    complianceBoundary: specificationsText.includes('no certificate or test report was supplied'),
    noTemporaryNotionImages: !contentText.includes('prod-files-secure') && product.images.every((image) => !image.url.includes('prod-files-secure')),
    galleryOrder: product.images.every((image, index) => image.sortOrder === index),
    uniqueGalleryUrls: new Set(product.images.map((image) => image.url)).size === 3,
    uniqueDetailUrls: new Set(detailUrls).size === 2,
  }
  const failed = Object.entries(assertions).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length > 0) {
    throw new Error('Draft verification failed: ' + failed.join(', '))
  }
  await Promise.all([...product.images.map((image) => image.url), ...detailUrls].map(assertPublicWebp))
  return {
    id: product.id,
    slug: product.slug,
    price: product.price.toString(),
    stock: product.stock,
    sku: product.sku,
    category: product.category?.name,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    galleryCount: product.images.length,
    detailCount: detailUrls.length,
    variantCount: product.variants.length,
    priceTierCount: product.priceTiers.length,
    assertions,
  }
}

async function main(): Promise<void> {
  const audit = await readAudit()
  if (process.argv.includes('--prepare')) {
    const prepared = await prepareAssets(audit)
    process.stdout.write(JSON.stringify({ mode: 'prepare', prepared }, null, 2) + '\n')
    return
  }
  if (process.argv.includes('--verify')) {
    process.stdout.write(JSON.stringify({ mode: 'verify', product: await verifyImportedDraft() }, null, 2) + '\n')
    return
  }
  const preflightResult = await preflight()
  if (process.argv.includes('--upload')) {
    const manifest = await uploadAssets(audit)
    process.stdout.write(JSON.stringify({ mode: 'upload', manifest }, null, 2) + '\n')
    return
  }
  if (process.argv.includes('--execute')) {
    const manifest = await readManifest()
    const preDbAudit = await readAudit(PRE_DB_AUDIT_PATH)
    await validateAudit(preDbAudit, 'pre-db')
    const manifestUrls = new Map(manifest.assets.map((asset) => [asset.finalIndex, asset.outputUrl]))
    for (const asset of preDbAudit.finalAssets) {
      if (asset.outputUrl !== manifestUrls.get(asset.finalIndex)) {
        throw new Error('Pre-db audit and upload manifest disagree for asset ' + asset.finalIndex)
      }
    }
    await Promise.all(manifest.assets.map((asset) => assertPublicWebp(asset.outputUrl)))
    let product: Awaited<ReturnType<typeof writeProduct>>
    try {
      product = await writeProduct(manifest, preflightResult)
    } catch (error) {
      const failedCleanup = await cleanupUrls(manifest.assets.map((asset) => asset.outputUrl))
      const reason = error instanceof Error ? error.message : String(error)
      const cleanupStatus = failedCleanup.length > 0
        ? 'Manual cleanup required for ' + failedCleanup.join(', ')
        : 'New uploads were cleaned up.'
      throw new Error('Database write failed: ' + reason + '. ' + cleanupStatus, error instanceof Error ? { cause: error } : undefined)
    }
    process.stdout.write(JSON.stringify({
      mode: 'execute',
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price.toString(),
        sku: product.sku,
        stock: product.stock,
        category: product.category?.name,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        imageCount: product.images.length,
        variantCount: product.variants.length,
        priceTierCount: product.priceTiers.length,
      },
    }, null, 2) + '\n')
    return
  }
  await validateAudit(audit, 'pre-upload')
  process.stdout.write(JSON.stringify({
    mode: 'dry-run',
    category: preflightResult.category,
    existingProduct: null,
    proposed: {
      name: PRODUCT_NAME,
      slug: PRODUCT_SLUG,
      price: PRODUCT_PRICE.toString(),
      stock: 0,
      sku: null,
      galleryCount: 3,
      detailCount: 2,
      variantCount: 0,
      priceTierCount: 0,
      isActive: false,
      isFeatured: false,
    },
  }, null, 2) + '\n')
}

main()
  .catch((error: unknown) => {
    process.stderr.write('Import failed: ' + (error instanceof Error ? error.message : String(error)) + '\n')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
