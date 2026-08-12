import { createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const PRODUCT_ID = 'cmsplcd4z0001uma08kbxsbpm'
const PRODUCT_SLUG = '10kv-insulated-electrician-safety-shoes-blue-outsole'
const IMPORT_DIR = path.resolve('output/10kv-insulated-electrician-shoes')
const AUDIT_PATH = path.join(IMPORT_DIR, 'detail-append-audit.json')
const MANIFEST_PATH = path.join(IMPORT_DIR, 'detail-append-manifest.json')
const SOURCE_INDEXES = [13, 15, 16, 17, 18] as const

type AppendAsset = {
  sourceIndex: (typeof SOURCE_INDEXES)[number]
  outputRef: string
  outputUrl?: string
  width?: number
  height?: number
}

type AppendAudit = {
  productId: string
  productSlug: string
  userInstruction: string
  expectedCurrentDetailCount: number
  expectedFinalDetailCount: number
  assets: AppendAsset[]
  gate: {
    phase: string
    uploadAllowed: boolean
    databaseMutationAllowed: boolean
    reason: string
  }
}

const prisma = new PrismaClient()

function parseContent(value: Prisma.JsonValue | null): { time: number; version: string; blocks: Prisma.JsonArray } {
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Product detail content is missing or invalid')
  const candidate = value as { time?: unknown; version?: unknown; blocks?: unknown }
  if (!Array.isArray(candidate.blocks)) throw new Error('Product detail content has no blocks array')
  return {
    time: typeof candidate.time === 'number' ? candidate.time : Date.now(),
    version: typeof candidate.version === 'string' ? candidate.version : '2.31.1',
    blocks: candidate.blocks as Prisma.JsonArray,
  }
}

async function readAudit(): Promise<AppendAudit> {
  const audit = JSON.parse(await readFile(AUDIT_PATH, 'utf8')) as AppendAudit
  if (audit.productId !== PRODUCT_ID || audit.productSlug !== PRODUCT_SLUG) throw new Error('Append audit product mismatch')
  if (audit.expectedCurrentDetailCount !== 11 || audit.expectedFinalDetailCount !== 16) throw new Error('Append audit detail counts changed')
  if (audit.assets.map((asset) => asset.sourceIndex).join(',') !== SOURCE_INDEXES.join(',')) {
    throw new Error('Append audit must cover source images 13, 15, 16, 17 and 18 in order')
  }
  return audit
}

async function validateLocalAssets(audit: AppendAudit): Promise<void> {
  await Promise.all(audit.assets.map(async (asset) => {
    const metadata = await sharp(path.resolve(IMPORT_DIR, asset.outputRef)).metadata()
    if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
      throw new Error(`Asset ${asset.sourceIndex} is not a valid WebP`)
    }
  }))
}

async function assertPublicWebp(url: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.toLowerCase().includes('image/webp')) {
    throw new Error(`Uploaded asset returned HTTP ${response.status} with ${contentType || 'no content type'}`)
  }
  await response.body?.cancel()
}

async function cleanupUrls(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(urls.map((url) => deleteFromR2(url)))
  return results.flatMap((result, index) => result.status === 'rejected' ? [urls[index] ?? 'unknown'] : [])
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
  if (!product || product.slug !== PRODUCT_SLUG) throw new Error('Target product draft was not found')
  return product
}

function protectedSnapshot(product: Awaited<ReturnType<typeof readProduct>>): string {
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

function assertDraftBaseline(product: Awaited<ReturnType<typeof readProduct>>, expectedDetailCount: number): void {
  const content = parseContent(product.content)
  const purchasePrice = JSON.stringify(product.specifications).includes('CNY 70 (Source unit not stated)')
  const checks = {
    price74: product.price.toString() === '74',
    inactive: !product.isActive && !product.isFeatured,
    category: product.category?.slug === 'safety-shoes',
    galleryCount: product.images.length === 2,
    detailCount: content.blocks.length === expectedDetailCount,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    noSku: product.sku === null,
    purchasePrice,
  }
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length) throw new Error(`Draft baseline check failed: ${failed.join(', ')}`)
}

async function upload(audit: AppendAudit): Promise<void> {
  if (!audit.gate.uploadAllowed || audit.gate.databaseMutationAllowed) throw new Error('Audit is not at the upload-only gate')
  const product = await readProduct()
  assertDraftBaseline(product, audit.expectedCurrentDetailCount)
  await validateLocalAssets(audit)
  const results = await Promise.allSettled(audit.assets.map(async (asset) => {
    const filePath = path.resolve(IMPORT_DIR, asset.outputRef)
    const [buffer, metadata] = await Promise.all([readFile(filePath), sharp(filePath).metadata()])
    if (!metadata.width || !metadata.height) throw new Error(`Dimensions missing for ${asset.outputRef}`)
    const filename = `20260812-10kv-insulated-electrician-shoes-v2-d${asset.sourceIndex}-${randomUUID().slice(0, 8)}.webp`
    const outputUrl = await uploadToR2(buffer, filename, 'image/webp')
    return { ...asset, outputUrl, width: metadata.width, height: metadata.height }
  }))
  const uploaded = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
  const failures = results.flatMap((result) => result.status === 'rejected' ? [result.reason instanceof Error ? result.reason.message : String(result.reason)] : [])
  if (failures.length) {
    const cleanupFailures = await cleanupUrls(uploaded.map((asset) => asset.outputUrl))
    throw new Error(`Upload failed: ${failures.join('; ')}. Cleanup failures: ${cleanupFailures.join(', ') || 'none'}`)
  }
  await Promise.all(uploaded.map((asset) => assertPublicWebp(asset.outputUrl)))
  audit.assets = uploaded
  audit.gate = {
    phase: 'pre-db-approved',
    uploadAllowed: true,
    databaseMutationAllowed: true,
    reason: 'Five existing English images uploaded and verified; user explicitly approved direct use without further cleanup',
  }
  await Promise.all([
    writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, 'utf8'),
    writeFile(MANIFEST_PATH, `${JSON.stringify({ productId: PRODUCT_ID, assets: uploaded }, null, 2)}\n`, 'utf8'),
  ])
  process.stdout.write(`${JSON.stringify({ mode: 'upload', assets: uploaded }, null, 2)}\n`)
}

async function execute(audit: AppendAudit): Promise<void> {
  if (!audit.gate.databaseMutationAllowed || audit.assets.some((asset) => !asset.outputUrl)) throw new Error('Append audit has not passed the pre-database gate')
  const before = await readProduct()
  assertDraftBaseline(before, audit.expectedCurrentDetailCount)
  const beforeProtected = protectedSnapshot(before)
  const beforeContent = parseContent(before.content)
  const newUrls = audit.assets.map((asset) => asset.outputUrl).filter((url): url is string => Boolean(url))
  await Promise.all(newUrls.map(assertPublicWebp))
  if (newUrls.length !== audit.assets.length) throw new Error('Append audit has incomplete image URLs')
  const blocks = [...beforeContent.blocks, ...audit.assets.map((asset) => ({
    id: `insulated-shoes-${asset.sourceIndex}`,
    type: 'image',
    data: {
      file: { url: asset.outputUrl },
      caption: '',
      withBorder: false,
      stretched: true,
      withBackground: false,
    },
  }))] as Prisma.JsonArray
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id: PRODUCT_ID }, select: { updatedAt: true, isActive: true, isFeatured: true } })
      if (!current || current.updatedAt.getTime() !== before.updatedAt.getTime()) throw new Error('Product changed after preflight')
      if (current.isActive || current.isFeatured) throw new Error('Product is no longer an inactive draft')
      await tx.product.update({
        where: { id: PRODUCT_ID },
        data: { content: { time: Date.now(), version: beforeContent.version, blocks } },
      })
    }, { isolationLevel: 'Serializable', timeout: 30_000 })
  } catch (error) {
    const cleanupFailures = await cleanupUrls(newUrls)
    throw new Error(`Database append failed: ${error instanceof Error ? error.message : String(error)}. Cleanup failures: ${cleanupFailures.join(', ') || 'none'}`)
  }
  const after = await readProduct()
  assertDraftBaseline(after, audit.expectedFinalDetailCount)
  if (protectedSnapshot(after) !== beforeProtected) throw new Error('A protected product field changed during the detail-only append')
  audit.gate = {
    phase: 'complete',
    uploadAllowed: true,
    databaseMutationAllowed: true,
    reason: 'Five English images appended to the detail tail; protected product fields verified unchanged',
  }
  await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify({ mode: 'execute', productId: after.id, detailCount: parseContent(after.content).blocks.length, protectedSnapshotSha256: createHash('sha256').update(beforeProtected).digest('hex') }, null, 2)}\n`)
}

async function verify(): Promise<void> {
  const audit = await readAudit()
  const product = await readProduct()
  assertDraftBaseline(product, 16)
  const content = parseContent(product.content)
  const text = JSON.stringify(content)
  const urls = audit.assets.map((asset) => asset.outputUrl).filter((url): url is string => Boolean(url))
  if (urls.length !== 5 || urls.some((url) => !text.includes(url))) throw new Error('One or more appended images are missing from product content')
  await Promise.all([...product.images.map((image) => image.url), ...urls].map(assertPublicWebp))
  process.stdout.write(`${JSON.stringify({ mode: 'verify', productId: product.id, price: product.price.toString(), isActive: product.isActive, isFeatured: product.isFeatured, galleryCount: product.images.length, detailCount: content.blocks.length, variantCount: product.variants.length, priceTierCount: product.priceTiers.length, sku: product.sku, appendedUrls: urls }, null, 2)}\n`)
}

async function main(): Promise<void> {
  if (process.argv.includes('--verify')) return verify()
  const audit = await readAudit()
  if (process.argv.includes('--upload')) return upload(audit)
  if (process.argv.includes('--execute')) return execute(audit)
  const product = await readProduct()
  assertDraftBaseline(product, audit.expectedCurrentDetailCount)
  await validateLocalAssets(audit)
  process.stdout.write(`${JSON.stringify({ mode: 'dry-run', productId: product.id, currentDetailCount: parseContent(product.content).blocks.length, appendSourceIndexes: SOURCE_INDEXES, finalDetailCount: audit.expectedFinalDetailCount }, null, 2)}\n`)
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Append failed: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
