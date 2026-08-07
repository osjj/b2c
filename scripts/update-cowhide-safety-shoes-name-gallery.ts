import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const PRODUCT_ID = 'cmsipw0pa000rumr084irqwwi'
const OLD_SLUG = 'lanoudun-005-cowhide-steel-toe-safety-shoes'
const NEW_NAME = 'Cowhide Steel Toe Puncture-Resistant Safety Shoes'
const NEW_SLUG = 'cowhide-steel-toe-puncture-resistant-safety-shoes'
const IMPORT_DIR = path.resolve('output/blue-ou-dun-005-20260807')
const AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.json')
const MANIFEST_PATH = path.join(IMPORT_DIR, 'gallery-v3-upload-manifest.json')

type AuditAsset = {
  sourceIndex: number
  provenance: 'gallery' | 'detail'
  decision: 'keep' | 'localize' | 'rebuild' | 'reject'
  outputRef?: string
  outputUrl?: string
}

type ImportAudit = {
  assets: AuditAsset[]
}

type GalleryManifest = {
  productId: string
  createdAt: string
  images: Array<{ outputRef: string; outputUrl: string; sortOrder: number }>
}

const prisma = new PrismaClient()

async function readAudit(): Promise<ImportAudit> {
  return JSON.parse(await readFile(AUDIT_PATH, 'utf8')) as ImportAudit
}

function selectedGallery(audit: ImportAudit): AuditAsset[] {
  return audit.assets
    .filter((asset) => asset.provenance === 'gallery' && asset.decision !== 'reject')
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
}

async function assertPublicUrl(url: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`Image is not publicly reachable (${response.status}): ${url}`)
  await response.body?.cancel()
}

async function cleanup(urls: string[]): Promise<void> {
  const results = await Promise.allSettled(urls.map((url) => deleteFromR2(url)))
  const failed = results
    .map((result, index) => ({ result, url: urls[index] }))
    .filter(({ result }) => result.status === 'rejected')
  if (failed.length > 0) {
    throw new Error(`R2 cleanup failed for: ${failed.map(({ url }) => url).join(', ')}`)
  }
}

async function uploadGallery(audit: ImportAudit): Promise<GalleryManifest> {
  const gallery = selectedGallery(audit)
  if (gallery.length !== 2 || gallery.some((asset) => !asset.outputRef)) {
    throw new Error('Audit must contain exactly two accepted gallery assets with outputRef values')
  }

  if (gallery.every((asset) => asset.outputUrl?.includes('cowhide-steel-toe-shoes-gallery'))) {
    await Promise.all(gallery.map((asset) => assertPublicUrl(asset.outputUrl!)))
    return {
      productId: PRODUCT_ID,
      createdAt: new Date().toISOString(),
      images: gallery.map((asset, sortOrder) => ({
        outputRef: asset.outputRef!,
        outputUrl: asset.outputUrl!,
        sortOrder,
      })),
    }
  }

  const uploaded: string[] = []
  try {
    for (const [index, asset] of gallery.entries()) {
      const sourcePath = path.resolve(asset.outputRef!)
      const file = await readFile(sourcePath)
      const filename = `20260807-cowhide-steel-toe-shoes-gallery-${String(index + 1).padStart(2, '0')}.webp`
      const url = await uploadToR2(file, filename, 'image/webp')
      uploaded.push(url)
      asset.outputUrl = url
    }
    await Promise.all(uploaded.map(assertPublicUrl))

    const manifest: GalleryManifest = {
      productId: PRODUCT_ID,
      createdAt: new Date().toISOString(),
      images: gallery.map((asset, sortOrder) => ({
        outputRef: asset.outputRef!,
        outputUrl: asset.outputUrl!,
        sortOrder,
      })),
    }
    await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
    await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    return manifest
  } catch (error) {
    await cleanup(uploaded)
    throw error
  }
}

async function readManifest(): Promise<GalleryManifest> {
  return JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as GalleryManifest
}

function protectedSnapshot(product: {
  sku: string | null
  price: unknown
  comparePrice: unknown
  cost: unknown
  stock: number
  categoryId: string | null
  isActive: boolean
  isFeatured: boolean
  specifications: unknown
  content: unknown
  usageScenes: string[]
  variants: unknown[]
  priceTiers: unknown[]
}) {
  return JSON.stringify({
    sku: product.sku,
    price: String(product.price),
    comparePrice: product.comparePrice == null ? null : String(product.comparePrice),
    cost: product.cost == null ? null : String(product.cost),
    stock: product.stock,
    categoryId: product.categoryId,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    specifications: product.specifications,
    content: product.content,
    usageScenes: product.usageScenes,
    variants: product.variants,
    priceTiers: product.priceTiers,
  })
}

async function loadProduct() {
  return prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: { sku: 'asc' } },
      priceTiers: { orderBy: { sortOrder: 'asc' } },
    },
  })
}

async function updateProduct(manifest: GalleryManifest) {
  if (manifest.productId !== PRODUCT_ID || manifest.images.length !== 2) {
    throw new Error('Upload manifest does not match the approved product and gallery scope')
  }
  await Promise.all(manifest.images.map((image) => assertPublicUrl(image.outputUrl)))

  const before = await loadProduct()
  if (!before) throw new Error('Target product does not exist')
  if (before.slug !== OLD_SLUG && before.slug !== NEW_SLUG) {
    throw new Error(`Unexpected current slug: ${before.slug}`)
  }

  const [slugConflict, redirectConflict] = await Promise.all([
    prisma.product.findUnique({ where: { slug: NEW_SLUG }, select: { id: true } }),
    prisma.productSlugRedirect.findUnique({ where: { slug: NEW_SLUG }, select: { productId: true } }),
  ])
  if (slugConflict && slugConflict.id !== PRODUCT_ID) throw new Error('Target slug is used by another product')
  if (redirectConflict && redirectConflict.productId !== PRODUCT_ID) throw new Error('Target slug is reserved by another redirect')

  const beforeProtected = protectedSnapshot(before)
  await prisma.$transaction(
    async (tx) => {
      const current = await tx.product.findUnique({ where: { id: PRODUCT_ID } })
      if (!current || (current.slug !== OLD_SLUG && current.slug !== NEW_SLUG)) {
        throw new Error('Product state changed after preflight')
      }

      await tx.product.update({
        where: { id: PRODUCT_ID },
        data: {
          name: NEW_NAME,
          slug: NEW_SLUG,
          metaTitle: 'Cowhide Steel Toe Puncture-Resistant Safety Shoes',
          metaKeywords:
            'cowhide safety shoes, steel toe work shoes, puncture resistant safety footwear, black industrial shoes',
          ogTitle: NEW_NAME,
          ogImage: manifest.images[0].outputUrl,
        },
      })
      await tx.productImage.deleteMany({ where: { productId: PRODUCT_ID } })
      await tx.productImage.createMany({
        data: manifest.images.map((image, index) => ({
          productId: PRODUCT_ID,
          url: image.outputUrl,
          alt: index === 0
            ? 'Black cowhide steel toe puncture-resistant safety shoes three-quarter view'
            : 'Black cowhide steel toe puncture-resistant safety shoes side view',
          sortOrder: index,
        })),
      })
    },
    { isolationLevel: 'Serializable', timeout: 30_000 }
  )

  const after = await loadProduct()
  if (!after) throw new Error('Product disappeared after update')
  if (protectedSnapshot(after) !== beforeProtected) {
    throw new Error('A protected commercial or detail field changed unexpectedly')
  }
  if (after.name !== NEW_NAME || after.slug !== NEW_SLUG || after.images.length !== 2) {
    throw new Error('Name, slug, or two-image gallery did not persist')
  }
  return after
}

async function main(): Promise<void> {
  if (process.argv.includes('--upload')) {
    const manifest = await uploadGallery(await readAudit())
    process.stdout.write(`${JSON.stringify({ mode: 'upload', manifest }, null, 2)}\n`)
    return
  }
  if (process.argv.includes('--execute')) {
    const manifest = await readManifest()
    const before = await loadProduct()
    try {
      const product = await updateProduct(manifest)
      process.stdout.write(`${JSON.stringify({
        mode: 'execute',
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          imageCount: product.images.length,
          price: String(product.price),
          stock: product.stock,
          variantCount: product.variants.length,
          isActive: product.isActive,
        },
      }, null, 2)}\n`)
    } catch (error) {
      const wasAlreadyUpdated = before?.slug === NEW_SLUG && before.images.length === 2
      if (!wasAlreadyUpdated) await cleanup(manifest.images.map((image) => image.outputUrl))
      throw error
    }
    return
  }

  const product = await loadProduct()
  if (!product) throw new Error('Target product does not exist')
  process.stdout.write(`${JSON.stringify({
    mode: 'dry-run',
    current: { id: product.id, name: product.name, slug: product.slug, images: product.images.length },
    proposed: { name: NEW_NAME, slug: NEW_SLUG, images: 2 },
    protected: {
      sku: product.sku,
      price: String(product.price),
      stock: product.stock,
      variants: product.variants.length,
      priceTiers: product.priceTiers.length,
      isActive: product.isActive,
    },
  }, null, 2)}\n`)
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Update failed: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
