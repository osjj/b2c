import { createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const PRODUCT_ID = 'cmsyr46t60001umfw545h83ca'
const PRODUCT_SLUG = 's3-high-cut-cowhide-steel-toe-safety-shoes'
const TARGET_BLOCK_ID = 's3-safety-shoes-detail-19'
const OLD_URL = 'https://shop.laifappe.com/products/20260818-s3-high-cut-cowhide-safety-shoes-v1-d19-fe14f389.webp'
const IMPORT_DIR = path.resolve('output/s3-cowhide-solid-sole-safety-shoes-review')
const INPUT_PATH = path.join(IMPORT_DIR, 'english', 'english-19-v2.png')
const OUTPUT_PATH = path.join(IMPORT_DIR, 'final', 's3-safety-shoes-19-v2.webp')
const AUDIT_PATH = path.join(IMPORT_DIR, 'detail-19-replacement-audit.json')
const MANIFEST_PATH = path.join(IMPORT_DIR, 'detail-19-replacement-manifest.json')

const imageBlockSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  data: z.object({
    file: z.object({ url: z.string().url() }),
    caption: z.string(),
    withBorder: z.boolean(),
    stretched: z.boolean(),
    withBackground: z.boolean(),
  }),
})
const editorContentSchema = z.object({
  time: z.number(),
  version: z.string(),
  blocks: z.array(imageBlockSchema).length(20),
})
const manifestSchema = z.object({
  productId: z.literal(PRODUCT_ID),
  productSlug: z.literal(PRODUCT_SLUG),
  targetBlockId: z.literal(TARGET_BLOCK_ID),
  oldUrl: z.literal(OLD_URL),
  newUrl: z.string().url(),
  outputRef: z.literal('final/s3-safety-shoes-19-v2.webp'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: z.string().datetime(),
})

type ProductRecord = Awaited<ReturnType<typeof readProduct>>
type ReplacementManifest = z.infer<typeof manifestSchema>

const prisma = new PrismaClient()

async function assertPublicWebp(url: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.toLowerCase().includes('image/webp')) {
    throw new Error(`Image returned HTTP ${response.status} with ${contentType || 'no content type'}`)
  }
  await response.body?.cancel()
}

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

function parseContent(product: ProductRecord): z.infer<typeof editorContentSchema> {
  return editorContentSchema.parse(product.content)
}

function protectedSnapshot(product: ProductRecord): string {
  return JSON.stringify({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
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
    specifications: product.specifications,
    usageScenes: product.usageScenes,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
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

function assertDraftBaseline(product: ProductRecord, expectedTargetUrl: string): void {
  const content = parseContent(product)
  const targetBlocks = content.blocks.filter((block) => block.id === TARGET_BLOCK_ID)
  const checks = {
    inactive: !product.isActive && !product.isFeatured,
    zeroStock: product.stock === 0,
    noSku: product.sku === null,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    category: product.category?.slug === 'safety-shoes',
    galleryCount: product.images.length === 2,
    detailCount: content.blocks.length === 20,
    oneTargetBlock: targetBlocks.length === 1,
    expectedTargetUrl: targetBlocks[0]?.data.file.url === expectedTargetUrl,
  }
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length > 0) {
    throw new Error('Draft baseline check failed: ' + failed.join(', '))
  }
}

async function prepare(): Promise<void> {
  const product = await readProduct()
  assertDraftBaseline(product, OLD_URL)
  const inputMetadata = await sharp(INPUT_PATH).metadata()
  if (inputMetadata.format !== 'png' || !inputMetadata.width || !inputMetadata.height) {
    throw new Error('Replacement review image is not a valid PNG')
  }
  await sharp(INPUT_PATH)
    .rotate()
    .webp({ quality: 90, effort: 6, smartSubsample: true })
    .toFile(OUTPUT_PATH)
  const outputMetadata = await sharp(OUTPUT_PATH).metadata()
  if (outputMetadata.format !== 'webp' || !outputMetadata.width || !outputMetadata.height) {
    throw new Error('Prepared replacement is not a valid WebP')
  }
  await writeFile(AUDIT_PATH, JSON.stringify({
    productId: PRODUCT_ID,
    productSlug: PRODUCT_SLUG,
    targetBlockId: TARGET_BLOCK_ID,
    sourceImage: 'english/english-19-v2.png',
    outputRef: 'final/s3-safety-shoes-19-v2.webp',
    userInstruction: 'Replace the approved multi-angle detail image and remove Chinese text from the top copy',
    exactHeaderCopy: {
      headline: 'MULTI-ANGLE PRODUCT VIEW',
      subtitle: 'SEE THE FIT, PROFILE AND OUTSOLE FROM EVERY ANGLE',
    },
    expectedOldUrl: OLD_URL,
    gate: {
      phase: 'pre-upload-approved',
      uploadAllowed: true,
      databaseMutationAllowed: false,
      reason: 'User reviewed the generated v2 image and explicitly requested replacement.',
    },
  }, null, 2) + '\n', 'utf8')
  process.stdout.write(JSON.stringify({
    mode: 'prepare',
    productId: PRODUCT_ID,
    targetBlockId: TARGET_BLOCK_ID,
    width: outputMetadata.width,
    height: outputMetadata.height,
  }, null, 2) + '\n')
}

async function upload(): Promise<void> {
  const product = await readProduct()
  assertDraftBaseline(product, OLD_URL)
  const [buffer, metadata] = await Promise.all([readFile(OUTPUT_PATH), sharp(OUTPUT_PATH).metadata()])
  if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
    throw new Error('Prepared replacement is not a valid WebP')
  }
  const filename = `20260818-s3-high-cut-cowhide-safety-shoes-v2-d19-${randomUUID().slice(0, 8)}.webp`
  const newUrl = await uploadToR2(buffer, filename, 'image/webp')
  try {
    await assertPublicWebp(newUrl)
    const manifest = manifestSchema.parse({
      productId: PRODUCT_ID,
      productSlug: PRODUCT_SLUG,
      targetBlockId: TARGET_BLOCK_ID,
      oldUrl: OLD_URL,
      newUrl,
      outputRef: 'final/s3-safety-shoes-19-v2.webp',
      width: metadata.width,
      height: metadata.height,
      createdAt: new Date().toISOString(),
    })
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
    process.stdout.write(JSON.stringify({ mode: 'upload', newUrl, width: metadata.width, height: metadata.height }, null, 2) + '\n')
  } catch (error) {
    await deleteFromR2(newUrl)
    throw error
  }
}

async function readManifest(): Promise<ReplacementManifest> {
  const parsed: unknown = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
  return manifestSchema.parse(parsed)
}

async function execute(): Promise<void> {
  const manifest = await readManifest()
  await assertPublicWebp(manifest.newUrl)
  const before = await readProduct()
  assertDraftBaseline(before, OLD_URL)
  const beforeProtected = protectedSnapshot(before)
  const beforeContent = parseContent(before)
  const nextBlocks = beforeContent.blocks.map((block) => block.id === TARGET_BLOCK_ID
    ? { ...block, data: { ...block.data, file: { url: manifest.newUrl } } }
    : block)
  const nextContent: Prisma.InputJsonValue = {
    time: Date.now(),
    version: beforeContent.version,
    blocks: nextBlocks,
  }
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({
        where: { id: PRODUCT_ID },
        select: { updatedAt: true, isActive: true, isFeatured: true, content: true },
      })
      if (!current || current.updatedAt.getTime() !== before.updatedAt.getTime()) {
        throw new Error('Product changed after preflight')
      }
      if (current.isActive || current.isFeatured) {
        throw new Error('Product is no longer an inactive draft')
      }
      const currentContent = editorContentSchema.parse(current.content)
      const currentTarget = currentContent.blocks.find((block) => block.id === TARGET_BLOCK_ID)
      if (currentTarget?.data.file.url !== OLD_URL) {
        throw new Error('Target detail image changed after preflight')
      }
      await tx.product.update({
        where: { id: PRODUCT_ID },
        data: { content: nextContent },
      })
    }, { isolationLevel: 'Serializable', timeout: 30_000 })
  } catch (error) {
    await deleteFromR2(manifest.newUrl)
    throw new Error('Database replacement failed: ' + (error instanceof Error ? error.message : String(error)))
  }
  const after = await readProduct()
  assertDraftBaseline(after, manifest.newUrl)
  if (protectedSnapshot(after) !== beforeProtected) {
    throw new Error('A protected product field changed during the detail-image replacement')
  }
  await assertPublicWebp(manifest.newUrl)
  let oldAssetDeleted = false
  try {
    await deleteFromR2(OLD_URL)
    oldAssetDeleted = true
  } catch (error) {
    process.stderr.write('Old R2 object cleanup failed: ' + (error instanceof Error ? error.message : String(error)) + '\n')
  }
  await writeFile(AUDIT_PATH, JSON.stringify({
    productId: PRODUCT_ID,
    productSlug: PRODUCT_SLUG,
    targetBlockId: TARGET_BLOCK_ID,
    oldUrl: OLD_URL,
    newUrl: manifest.newUrl,
    protectedSnapshotSha256: createHash('sha256').update(beforeProtected).digest('hex'),
    oldAssetDeleted,
    gate: {
      phase: 'complete',
      uploadAllowed: true,
      databaseMutationAllowed: true,
      reason: 'Only detail image 19 was replaced; protected fields and inactive state were verified unchanged.',
    },
  }, null, 2) + '\n', 'utf8')
  process.stdout.write(JSON.stringify({
    mode: 'execute',
    productId: PRODUCT_ID,
    targetBlockId: TARGET_BLOCK_ID,
    newUrl: manifest.newUrl,
    oldAssetDeleted,
    protectedSnapshotSha256: createHash('sha256').update(beforeProtected).digest('hex'),
  }, null, 2) + '\n')
}

async function verify(): Promise<void> {
  const manifest = await readManifest()
  const product = await readProduct()
  assertDraftBaseline(product, manifest.newUrl)
  const contentText = JSON.stringify(product.content)
  if (contentText.includes(OLD_URL)) {
    throw new Error('Old detail image URL remains in product content')
  }
  await assertPublicWebp(manifest.newUrl)
  process.stdout.write(JSON.stringify({
    mode: 'verify',
    productId: product.id,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    detailCount: parseContent(product).blocks.length,
    targetBlockId: TARGET_BLOCK_ID,
    targetUrl: manifest.newUrl,
    oldUrlAbsent: true,
  }, null, 2) + '\n')
}

async function dryRun(): Promise<void> {
  const product = await readProduct()
  assertDraftBaseline(product, OLD_URL)
  process.stdout.write(JSON.stringify({
    mode: 'dry-run',
    productId: product.id,
    targetBlockId: TARGET_BLOCK_ID,
    oldUrl: OLD_URL,
    replacementPath: INPUT_PATH,
    protectedFieldsWillRemainUnchanged: true,
  }, null, 2) + '\n')
}

async function main(): Promise<void> {
  if (process.argv.includes('--prepare')) return prepare()
  if (process.argv.includes('--upload')) return upload()
  if (process.argv.includes('--execute')) return execute()
  if (process.argv.includes('--verify')) return verify()
  return dryRun()
}

main()
  .catch((error: unknown) => {
    process.stderr.write('Replacement failed: ' + (error instanceof Error ? error.message : String(error)) + '\n')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
