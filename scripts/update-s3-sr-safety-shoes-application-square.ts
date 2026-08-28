import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const PRODUCT_ID = 'cmt5xiyq20001uml424thilvy'
const PRODUCT_NAME = 'S3 SR防滑防砸防刺穿防静电安全鞋'
const PRODUCT_SLUG = 's3-sr-slip-resistant-steel-toe-antistatic-safety-shoes'
const LOCAL_FILE = path.resolve('output/s3-sr-safety-shoes-draft/detail-square-v2/06-applications-square-v2.webp')
const MANIFEST_FILE = path.resolve('output/s3-sr-safety-shoes-draft/detail-square-v2/application-update-manifest.json')
const TARGET_BLOCK_ID = 's3-sr-safety-shoes-6'
const OLD_URL = 'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-d06-c611cfd3.webp'

const EXPECTED_OTHER_URLS = [
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-d09-1298d987.webp',
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-d10-743e8247.webp',
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-d11-153e4f44.webp',
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-d12-2b4b335c.webp',
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-d13-c60fff56.webp',
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-d14-c84ec6a7.webp',
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-d15-9da810ee.webp',
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-d16-56b4e246.webp',
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-d17-7201ea0e.webp',
]

const blockSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  data: z.object({
    file: z.object({ url: z.string().url() }).passthrough(),
  }).passthrough(),
}).passthrough()

const contentSchema = z.object({
  time: z.number(),
  version: z.string(),
  blocks: z.array(blockSchema).length(10),
}).passthrough()

const prisma = new PrismaClient()

async function assertSquareWebpBuffer(buffer: Buffer): Promise<void> {
  const metadata = await sharp(buffer).metadata()
  if (metadata.format !== 'webp' || metadata.width !== 1200 || metadata.height !== 1200) {
    throw new Error('Application image must be a 1200x1200 WebP')
  }
}

async function fetchSquareWebp(url: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.toLowerCase().includes('image/webp')) {
    throw new Error(`Image returned HTTP ${response.status} with ${contentType || 'no content type'}`)
  }
  await assertSquareWebpBuffer(Buffer.from(await response.arrayBuffer()))
}

function assertExpectedContent(content: z.infer<typeof contentSchema>, expectedTargetUrl: string): void {
  const target = content.blocks[0]
  if (!target || target.id !== TARGET_BLOCK_ID || target.data.file.url !== expectedTargetUrl) {
    throw new Error('Target application-scenarios block no longer matches the protected snapshot')
  }
  const otherUrls = content.blocks.slice(1).map((block) => block.data.file.url)
  if (otherUrls.join('\n') !== EXPECTED_OTHER_URLS.join('\n')) {
    throw new Error('One or more non-target detail images changed; refusing the scoped update')
  }
}

async function loadProtectedDraft() {
  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    select: {
      id: true,
      name: true,
      slug: true,
      updatedAt: true,
      isActive: true,
      isFeatured: true,
      price: true,
      stock: true,
      sku: true,
      content: true,
      _count: { select: { images: true, variants: true, priceTiers: true } },
    },
  })
  if (!product || product.name !== PRODUCT_NAME || product.slug !== PRODUCT_SLUG) {
    throw new Error('Target product identity does not match the approved draft')
  }
  if (product.isActive || product.isFeatured || product.price.toString() !== '0' || product.stock !== 0 || product.sku !== null) {
    throw new Error('Protected draft fields changed; refusing the detail-image update')
  }
  if (product._count.images !== 3 || product._count.variants !== 0 || product._count.priceTiers !== 0) {
    throw new Error('Protected gallery, variant, or price-tier counts changed')
  }
  const content = contentSchema.parse(product.content)
  assertExpectedContent(content, OLD_URL)
  return { product, content }
}

async function uploadImage(): Promise<string> {
  const buffer = await readFile(LOCAL_FILE)
  await assertSquareWebpBuffer(buffer)
  const filename = `20260823-s3-sr-safety-shoes-detail-square-v2-d06-${randomUUID().slice(0, 8)}.webp`
  const outputUrl = await uploadToR2(buffer, filename, 'image/webp')
  try {
    await fetchSquareWebp(outputUrl)
    return outputUrl
  } catch (error) {
    await deleteFromR2(outputUrl)
    throw error
  }
}

function replaceTargetUrl(content: z.infer<typeof contentSchema>, outputUrl: string): Prisma.InputJsonValue {
  const nextContent = {
    ...content,
    blocks: content.blocks.map((block, index) => index === 0
      ? { ...block, data: { ...block.data, file: { ...block.data.file, url: outputUrl } } }
      : block),
  }
  return JSON.parse(JSON.stringify(nextContent)) as Prisma.InputJsonValue
}

async function updateContent(outputUrl: string, snapshotUpdatedAt: Date, snapshotContent: z.infer<typeof contentSchema>): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({
      where: { id: PRODUCT_ID },
      select: {
        updatedAt: true,
        isActive: true,
        isFeatured: true,
        price: true,
        stock: true,
        sku: true,
        content: true,
        _count: { select: { images: true, variants: true, priceTiers: true } },
      },
    })
    if (!current || current.updatedAt.getTime() !== snapshotUpdatedAt.getTime()) {
      throw new Error('Product changed after preflight')
    }
    if (current.isActive || current.isFeatured || current.price.toString() !== '0' || current.stock !== 0 || current.sku !== null) {
      throw new Error('Protected fields changed after preflight')
    }
    if (current._count.images !== 3 || current._count.variants !== 0 || current._count.priceTiers !== 0) {
      throw new Error('Protected relation counts changed after preflight')
    }
    const currentContent = contentSchema.parse(current.content)
    assertExpectedContent(currentContent, OLD_URL)
    if (JSON.stringify(currentContent) !== JSON.stringify(snapshotContent)) {
      throw new Error('Product detail content changed after preflight')
    }
    await tx.product.update({
      where: { id: PRODUCT_ID },
      data: { content: replaceTargetUrl(currentContent, outputUrl) },
    })
  }, { isolationLevel: 'Serializable', timeout: 30_000 })
}

async function verifyUpdate(): Promise<Record<string, unknown>> {
  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    select: {
      name: true,
      slug: true,
      isActive: true,
      isFeatured: true,
      price: true,
      stock: true,
      sku: true,
      content: true,
      _count: { select: { images: true, variants: true, priceTiers: true } },
    },
  })
  if (!product) throw new Error('Updated product was not found')
  const content = contentSchema.parse(product.content)
  const newUrl = content.blocks[0]?.data.file.url
  if (!newUrl) throw new Error('Updated application-scenarios URL is missing')
  assertExpectedContent(content, newUrl)
  const assertions = {
    identity: product.name === PRODUCT_NAME && product.slug === PRODUCT_SLUG,
    inactive: !product.isActive && !product.isFeatured,
    protectedCommercialFields: product.price.toString() === '0' && product.stock === 0 && product.sku === null,
    protectedRelationCounts: product._count.images === 3 && product._count.variants === 0 && product._count.priceTiers === 0,
    detailBlockCount: content.blocks.length === 10,
    targetOnly: newUrl.includes('detail-square-v2-d06') && content.blocks.slice(1).map((block) => block.data.file.url).join('\n') === EXPECTED_OTHER_URLS.join('\n'),
  }
  const failed = Object.entries(assertions).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length) throw new Error(`Application image verification failed: ${failed.join(', ')}`)
  await fetchSquareWebp(newUrl)
  return {
    productId: PRODUCT_ID,
    targetBlockId: TARGET_BLOCK_ID,
    dimensions: '1200x1200',
    format: 'webp',
    oldUrlRetainedForRollback: OLD_URL,
    assertions,
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--verify')) {
    process.stdout.write(`${JSON.stringify({ mode: 'verify', result: await verifyUpdate() }, null, 2)}\n`)
    return
  }
  const buffer = await readFile(LOCAL_FILE)
  await assertSquareWebpBuffer(buffer)
  const snapshot = await loadProtectedDraft()
  if (!process.argv.includes('--execute')) {
    process.stdout.write(`${JSON.stringify({
      mode: 'dry-run',
      productId: PRODUCT_ID,
      targetBlockId: TARGET_BLOCK_ID,
      currentDimensions: '1092x1440',
      proposedDimensions: '1200x1200',
      otherDetailBlocksPreserved: 9,
    }, null, 2)}\n`)
    return
  }
  const outputUrl = await uploadImage()
  try {
    await updateContent(outputUrl, snapshot.product.updatedAt, snapshot.content)
  } catch (error) {
    await deleteFromR2(outputUrl)
    throw error
  }
  await writeFile(MANIFEST_FILE, `${JSON.stringify({
    productId: PRODUCT_ID,
    targetBlockId: TARGET_BLOCK_ID,
    oldUrlRetainedForRollback: OLD_URL,
    outputUrl,
    width: 1200,
    height: 1200,
    format: 'webp',
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify({ mode: 'execute', result: await verifyUpdate() }, null, 2)}\n`)
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Application image update failed: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
