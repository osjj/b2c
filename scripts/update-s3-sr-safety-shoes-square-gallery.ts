import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const PRODUCT_ID = 'cmt5xiyq20001uml424thilvy'
const PRODUCT_NAME = 'S3 SR防滑防砸防刺穿防静电安全鞋'
const PRODUCT_SLUG = 's3-sr-slip-resistant-steel-toe-antistatic-safety-shoes'
const ASSET_DIR = path.resolve('output/s3-sr-safety-shoes-draft/gallery-square-v2')
const MANIFEST_PATH = path.join(ASSET_DIR, 'gallery-update-manifest.json')

const EXPECTED_OLD_URLS = [
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-g04-6d8e9e7a.webp',
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-g05-c63c5cba.webp',
  'https://shop.laifappe.com/products/20260823-s3-sr-safety-shoes-v1-g07-cca78fbe.webp',
]

const localAssets = [
  {
    file: '01-gallery-square-v2.webp',
    alt: 'Black S3 SR slip-resistant steel-toe antistatic safety shoes',
  },
  {
    file: '02-gallery-square-v2.webp',
    alt: 'Black antistatic safety shoes for industrial work',
  },
  {
    file: '03-gallery-square-v2.webp',
    alt: 'Black cowhide steel-toe safety shoes product information view',
  },
]

const manifestSchema = z.object({
  productId: z.literal(PRODUCT_ID),
  productSlug: z.literal(PRODUCT_SLUG),
  createdAt: z.string().datetime(),
  oldUrlsRetainedForRollback: z.array(z.string().url()).length(3),
  assets: z.array(z.object({
    sortOrder: z.number().int().min(0).max(2),
    localFile: z.string().min(1),
    outputUrl: z.string().url(),
    alt: z.string().min(1),
    width: z.literal(1200),
    height: z.literal(1200),
    format: z.literal('webp'),
  })).length(3),
})

type GalleryManifest = z.infer<typeof manifestSchema>

const prisma = new PrismaClient()

function sortedUrls(images: Array<{ url: string; sortOrder: number }>): string[] {
  return images
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => image.url)
}

async function assertSquareWebpFile(filePath: string): Promise<void> {
  const metadata = await sharp(filePath).metadata()
  if (metadata.format !== 'webp' || metadata.width !== 1200 || metadata.height !== 1200) {
    throw new Error(`Expected 1200x1200 WebP: ${filePath}`)
  }
}

async function fetchSquareWebp(url: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.toLowerCase().includes('image/webp')) {
    throw new Error(`Image returned HTTP ${response.status} with ${contentType || 'no content type'}: ${url}`)
  }
  const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata()
  if (metadata.format !== 'webp' || metadata.width !== 1200 || metadata.height !== 1200) {
    throw new Error(`Public image is not a 1200x1200 WebP: ${url}`)
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
      ogImage: true,
      images: { select: { url: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
      _count: { select: { variants: true, priceTiers: true } },
    },
  })
  if (!product || product.name !== PRODUCT_NAME || product.slug !== PRODUCT_SLUG) {
    throw new Error('Target product identity does not match the approved draft')
  }
  if (product.isActive || product.isFeatured) {
    throw new Error('Target product is active or featured; refusing a guarded draft-only update')
  }
  if (product.price.toString() !== '0' || product.stock !== 0 || product.sku !== null) {
    throw new Error('Protected commercial fields changed; refusing the gallery update')
  }
  if (product._count.variants !== 0 || product._count.priceTiers !== 0) {
    throw new Error('Protected variant or price-tier state changed; refusing the gallery update')
  }
  const currentUrls = sortedUrls(product.images)
  if (currentUrls.join('\n') !== EXPECTED_OLD_URLS.join('\n') || product.ogImage !== EXPECTED_OLD_URLS[0]) {
    throw new Error('Current gallery or OG image no longer matches the protected snapshot')
  }
  return product
}

async function validateLocalAssets(): Promise<void> {
  await Promise.all(localAssets.map((asset) => assertSquareWebpFile(path.join(ASSET_DIR, asset.file))))
}

async function cleanupNewUrls(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(urls.map((url) => deleteFromR2(url)))
  return results.flatMap((result, index) => result.status === 'rejected' ? [urls[index] ?? 'unknown'] : [])
}

async function uploadGallery(): Promise<GalleryManifest> {
  const results = await Promise.allSettled(localAssets.map(async (asset, sortOrder) => {
    const filePath = path.join(ASSET_DIR, asset.file)
    const buffer = await readFile(filePath)
    const filename = `20260823-s3-sr-safety-shoes-gallery-square-v2-g${String(sortOrder + 1).padStart(2, '0')}-${randomUUID().slice(0, 8)}.webp`
    const outputUrl = await uploadToR2(buffer, filename, 'image/webp')
    await fetchSquareWebp(outputUrl)
    return {
      sortOrder,
      localFile: asset.file,
      outputUrl,
      alt: asset.alt,
      width: 1200 as const,
      height: 1200 as const,
      format: 'webp' as const,
    }
  }))
  const uploaded = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
  const failures = results.flatMap((result) => result.status === 'rejected'
    ? [result.reason instanceof Error ? result.reason.message : String(result.reason)]
    : [])
  if (failures.length) {
    const failedCleanup = await cleanupNewUrls(uploaded.map((asset) => asset.outputUrl))
    const cleanup = failedCleanup.length ? ` Manual cleanup required: ${failedCleanup.join(', ')}` : ''
    throw new Error(`Gallery upload failed: ${failures.join('; ')}.${cleanup}`)
  }
  const manifest = manifestSchema.parse({
    productId: PRODUCT_ID,
    productSlug: PRODUCT_SLUG,
    createdAt: new Date().toISOString(),
    oldUrlsRetainedForRollback: EXPECTED_OLD_URLS,
    assets: uploaded.sort((a, b) => a.sortOrder - b.sortOrder),
  })
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifest
}

async function updateGallery(manifest: GalleryManifest, snapshotUpdatedAt: Date): Promise<void> {
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
        ogImage: true,
        images: { select: { url: true, sortOrder: true } },
        _count: { select: { variants: true, priceTiers: true } },
      },
    })
    if (!current || current.updatedAt.getTime() !== snapshotUpdatedAt.getTime()) {
      throw new Error('Product changed after preflight')
    }
    if (current.isActive || current.isFeatured || current.price.toString() !== '0' || current.stock !== 0 || current.sku !== null) {
      throw new Error('Protected draft fields changed after preflight')
    }
    if (current._count.variants !== 0 || current._count.priceTiers !== 0) {
      throw new Error('Protected variant state changed after preflight')
    }
    if (sortedUrls(current.images).join('\n') !== EXPECTED_OLD_URLS.join('\n') || current.ogImage !== EXPECTED_OLD_URLS[0]) {
      throw new Error('Gallery changed after preflight')
    }
    await tx.product.update({
      where: { id: PRODUCT_ID },
      data: {
        ogImage: manifest.assets[0]?.outputUrl ?? null,
        images: {
          deleteMany: {},
          create: manifest.assets.map((asset) => ({
            url: asset.outputUrl,
            alt: asset.alt,
            sortOrder: asset.sortOrder,
          })),
        },
      },
    })
  }, { isolationLevel: 'Serializable', timeout: 30_000 })
}

async function verifyUpdatedGallery(): Promise<Record<string, unknown>> {
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
      ogImage: true,
      images: { select: { url: true, alt: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
      content: true,
      specifications: true,
      _count: { select: { variants: true, priceTiers: true } },
    },
  })
  if (!product) throw new Error('Updated draft was not found')
  const urls = product.images.map((image) => image.url)
  const assertions = {
    identity: product.name === PRODUCT_NAME && product.slug === PRODUCT_SLUG,
    inactive: !product.isActive && !product.isFeatured,
    protectedCommercialFields: product.price.toString() === '0' && product.stock === 0 && product.sku === null,
    noVariantsOrTiers: product._count.variants === 0 && product._count.priceTiers === 0,
    galleryCount: urls.length === 3,
    squareV2Urls: urls.every((url) => url.includes('gallery-square-v2')),
    ogMatchesPrimary: product.ogImage === urls[0],
    detailContentRetained: JSON.stringify(product.content).includes('20260823-s3-sr-safety-shoes-v1-d'),
    specificationsRetained: Array.isArray(product.specifications) && product.specifications.length > 0,
  }
  const failed = Object.entries(assertions).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length) throw new Error(`Gallery verification failed: ${failed.join(', ')}`)
  await Promise.all(urls.map(fetchSquareWebp))
  return {
    productId: PRODUCT_ID,
    galleryCount: urls.length,
    dimensions: '1200x1200',
    format: 'webp',
    oldUrlsRetainedForRollback: EXPECTED_OLD_URLS.length,
    assertions,
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--verify')) {
    process.stdout.write(`${JSON.stringify({ mode: 'verify', result: await verifyUpdatedGallery() }, null, 2)}\n`)
    return
  }
  await validateLocalAssets()
  const snapshot = await loadProtectedDraft()
  if (!process.argv.includes('--execute')) {
    process.stdout.write(`${JSON.stringify({
      mode: 'dry-run',
      productId: snapshot.id,
      currentGalleryCount: snapshot.images.length,
      proposedGalleryCount: localAssets.length,
      proposedDimensions: '1200x1200',
      proposedFormat: 'webp',
      protectedFieldsUnchanged: true,
    }, null, 2)}\n`)
    return
  }
  const manifest = await uploadGallery()
  try {
    await updateGallery(manifest, snapshot.updatedAt)
  } catch (error) {
    const failedCleanup = await cleanupNewUrls(manifest.assets.map((asset) => asset.outputUrl))
    const cleanup = failedCleanup.length ? ` Manual cleanup required: ${failedCleanup.join(', ')}` : ''
    throw new Error(`Database gallery update failed: ${error instanceof Error ? error.message : String(error)}.${cleanup}`)
  }
  process.stdout.write(`${JSON.stringify({ mode: 'execute', result: await verifyUpdatedGallery() }, null, 2)}\n`)
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Square gallery update failed: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
