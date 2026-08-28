import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const IMPORT_DIR = path.resolve('output/750g-blue-double-sided-dotted-knit-gloves')
const SOURCE_DIR = path.join(IMPORT_DIR, 'source')
const FINAL_DIR = path.join(IMPORT_DIR, 'final')
const AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.json')
const PRE_DB_AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.pre-db.json')
const UPLOAD_MANIFEST_PATH = path.join(IMPORT_DIR, 'upload-manifest.json')

const CATEGORY_SLUG = 'knit-gloves'
const CATEGORY_NAME = 'Knit Gloves'
const PRODUCT_NAME = '750g Blue Double-Sided Dotted Knit Work Gloves'
const PRODUCT_SLUG = '750g-blue-double-sided-dotted-knit-work-gloves'
const PRODUCT_PRICE = new Prisma.Decimal('0.00')
const NOTION_PAGE_ID = '3c8d505a-0030-8007-aa6f-f3f70415987a'
const NOTION_URL = 'https://app.notion.com/p/3c8d505a00308007aa6ff3f70415987a'

const provenanceSchema = z.enum(['gallery', 'detail'])
const assetSchema = z.object({
  finalIndex: z.number().int().min(1),
  sourceIndex: z.number().int().min(1),
  provenance: provenanceSchema,
  sourceRef: z.string().min(1),
  inputRef: z.string().min(1),
  outputRef: z.string().min(1),
  categories: z.array(z.string().min(1)).min(1),
  decision: z.literal('keep'),
  reason: z.string().min(1),
  outputUrl: z.string().url().optional(),
  qa: z.literal('pass'),
})

const importAuditSchema = z.object({
  product: z.object({
    sourcePageId: z.literal(NOTION_PAGE_ID),
    notionUrl: z.literal(NOTION_URL),
    title: z.literal(PRODUCT_NAME),
    sourcePriceEvidence: z.literal('0.135 (source currency and unit not stated)'),
    minimumOrderQuantity: z.literal('15000 (source unit not stated)'),
    sellingPriceStatus: z.string().min(1),
    draftPricePlaceholder: z.literal('0.00'),
    storefrontStockStatus: z.string().min(1),
    skuStatus: z.string().min(1),
    variantStatus: z.string().min(1),
    priceTierStatus: z.string().min(1),
    complianceEvidenceStatus: z.string().min(1),
  }),
  sourceTotals: z.object({
    notionImages: z.literal(2),
    approvedFinalAssets: z.literal(2),
    gallery: z.literal(1),
    detail: z.literal(1),
    rejectedSourceImages: z.literal(0),
  }),
  assets: z.array(assetSchema).length(2),
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
  })).length(2),
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
    throw new Error('Audit must preserve the missing compliance-document boundary')
  }
  const orderedAssets = audit.assets.slice().sort((a, b) => a.finalIndex - b.finalIndex)
  const first = orderedAssets[0]
  const second = orderedAssets[1]
  if (!first || !second || first.finalIndex !== 1 || second.finalIndex !== 2) {
    throw new Error('Audit must cover final assets 1 and 2 exactly once')
  }
  if (first.sourceIndex !== 1 || first.provenance !== 'gallery') {
    throw new Error('The first Notion image must remain the sole gallery image')
  }
  if (second.sourceIndex !== 2 || second.provenance !== 'detail') {
    throw new Error('The second Notion image must remain the sole detail image')
  }
  await Promise.all(audit.assets.map(async (asset) => {
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
    throw new Error('Pre-db gate must allow R2 upload and database mutation')
  }
}

async function prepareAssets(audit: ImportAudit): Promise<Array<Record<string, unknown>>> {
  await mkdir(FINAL_DIR, { recursive: true })
  const prepared = await Promise.all(audit.assets.map(async (asset) => {
    const sourcePath = path.join(SOURCE_DIR, 'source-' + String(asset.sourceIndex).padStart(2, '0') + '.png')
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
    const prepared = await Promise.all(audit.assets.map(async (asset) => {
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
        '20260828-750g-blue-double-sided-dotted-knit-gloves-v1',
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
      sourceCoverage: '2/2 Notion images reconciled; image 1 gallery and image 2 detail uploaded',
      databaseMutationAllowed: true,
      r2UploadAllowed: true,
      reason: 'User explicitly requested the inactive draft using the two supplied images; both durable WebPs passed public verification.',
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
    throw new Error('Active Knit Gloves category is missing or incompatible')
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
    blocks: details.map((asset) => ({
      id: '750g-blue-dotted-knit-gloves-detail-' + String(asset.finalIndex).padStart(2, '0'),
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
  { name: 'Product Type', value: 'Double-Sided Dotted Knit Work Gloves' },
  { name: 'Weight Reference', value: '750 g/Dozen (source states 750g/一打)' },
  { name: 'Color', value: 'Dark Blue Glove, Blue Dots, Light Blue Overlock' },
  { name: 'Dotting', value: 'Dense Double-Sided Dotting on Palm and Fingers (dot material not stated)' },
  { name: 'Structure', value: 'Knit Glove with Rib-Knit Cuff' },
  { name: 'Features', value: 'Pliable, Breathable, High Elasticity and Overlocked Cuff (source image claims)' },
  { name: 'Length', value: '10 in (25.40 cm)' },
  { name: 'Packing', value: '12 Pairs/Bag' },
  { name: 'Minimum Order Quantity', value: '15000 (source unit not stated)' },
  { name: 'Purchase Price', value: '0.135 (source currency and unit not stated; verify current quote)' },
  { name: 'Material', value: 'Knit Material (fiber composition not stated)' },
  { name: 'Compliance Evidence', value: 'No performance standard, certificate, or test report was supplied' },
  { name: 'Source', value: NOTION_URL },
]

async function writeProduct(
  manifest: UploadManifest,
  preflightResult: Awaited<ReturnType<typeof preflight>>
): Promise<Prisma.ProductGetPayload<{
  include: { images: true; variants: true; priceTiers: true; category: true }
}>> {
  const gallery = manifest.assets.filter((asset) => asset.provenance === 'gallery')
  const details = manifest.assets.filter((asset) => asset.provenance === 'detail')
  const galleryImage = gallery[0]
  if (!galleryImage || gallery.length !== 1 || details.length !== 1) {
    throw new Error('Upload manifest must contain one gallery and one detail image')
  }
  return prisma.$transaction(async (tx) => {
    const [category, slugConflict, redirectConflict] = await Promise.all([
      tx.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
      tx.product.findUnique({ where: { slug: PRODUCT_SLUG }, select: { id: true } }),
      tx.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG }, select: { productId: true } }),
    ])
    if (!category || !category.isActive || category.id !== preflightResult.category.id) {
      throw new Error('Knit Gloves category changed after preflight')
    }
    if (slugConflict || redirectConflict) {
      throw new Error('Product slug became unavailable after preflight')
    }
    return tx.product.create({
      data: {
        name: PRODUCT_NAME,
        slug: PRODUCT_SLUG,
        description: 'Dark-blue double-sided dotted knit work gloves with dense blue grip dots, a rib-knit cuff and light-blue overlock. The source identifies a 750 g/dozen reference and 10-inch length.',
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
        usageScenes: ['general-handling', 'warehouse-logistics', 'construction-materials', 'mechanical-maintenance'],
        metaTitle: '750g Blue Double-Sided Dotted Knit Work Gloves',
        metaDescription: 'Dark-blue 750g/dozen knit work gloves with dense double-sided grip dots, rib-knit cuffs and 10-inch length for general handling.',
        metaKeywords: '750g dotted gloves, double sided dotted knit gloves, blue grip gloves, warehouse work gloves',
        ogTitle: PRODUCT_NAME,
        ogDescription: 'Dark-blue double-sided dotted knit work gloves for general handling, warehouse and site tasks.',
        ogImage: galleryImage.outputUrl,
        images: {
          create: [{
            url: galleryImage.outputUrl,
            alt: 'Pair of 750g blue double-sided dotted knit work gloves',
            sortOrder: 0,
          }],
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
    galleryCount: product.images.length === 1,
    detailCount: detailUrls.length === 1,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    noSku: product.sku === null,
    schemaSafeStock: product.stock === 0,
    sourcePriceBoundary: specificationsText.includes('source currency and unit not stated'),
    minimumOrderBoundary: specificationsText.includes('15000 (source unit not stated)'),
    unclearImageLabelExcluded: !specificationsText.includes('Encipher'),
    complianceBoundary: specificationsText.includes('No performance standard, certificate, or test report was supplied'),
    noTemporaryNotionImages: !contentText.includes('prod-files-secure') && product.images.every((image) => !image.url.includes('prod-files-secure')),
    mainImageOrder: product.images[0]?.sortOrder === 0,
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
    const auditMismatch = preDbAudit.assets.find((asset) => asset.outputUrl !== manifestUrls.get(asset.finalIndex))
    if (auditMismatch) {
      throw new Error('Pre-db audit and upload manifest disagree for asset ' + auditMismatch.finalIndex)
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
      galleryCount: 1,
      detailCount: 1,
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
