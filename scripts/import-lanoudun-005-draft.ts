import { readFile, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'

import { PrismaClient, type Prisma } from '@prisma/client'
import 'dotenv/config'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const IMPORT_DIR = path.resolve('output/blue-ou-dun-005-20260807')
const AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.json')
const MANIFEST_PATH = path.join(IMPORT_DIR, 'upload-manifest.json')
const PRODUCT_NAME = 'Lanoudun 005 Cowhide Steel Toe Safety Shoes'
const PRODUCT_SLUG = 'lanoudun-005-cowhide-steel-toe-safety-shoes'
const PRODUCT_SKU = 'LD-005-BLK'
const SOURCE_URL = 'https://detail.1688.com/offer/675778198502.html'
const NOTION_URL = 'https://app.notion.com/p/3b5d505a0030801db871e0e858d7f01a'
const CATEGORY_SLUG = 'safety-shoes'
const PRICE_USD = 8.41
const MOQ = 100

type AuditAsset = {
  sourceIndex: number
  provenance: 'gallery' | 'detail'
  decision: 'keep' | 'localize' | 'rebuild' | 'reject'
  outputRef?: string
  outputUrl?: string
}

type AuditVariant = {
  optionValues: { style: string; size: string }
  sourcePriceCny: number
  usdPrice: number
  stockStatus: 'exact' | 'unavailable' | 'unknown'
  sourceStock?: number
  sourceEvidence: string
}

type ImportAudit = {
  offerId: string
  moq: number
  exchangeRateCnyPerUsd: number
  assets: AuditAsset[]
  variants: AuditVariant[]
}

type UploadManifest = {
  productSlug: string
  createdAt: string
  assets: Array<{
    outputRef: string
    outputUrl: string
    provenance: 'gallery' | 'detail'
    sourceIndex: number
  }>
}

const prisma = new PrismaClient()

function selectedAssets(audit: ImportAudit): AuditAsset[] {
  return audit.assets.filter((asset) => asset.decision !== 'reject')
}

async function readAudit(): Promise<ImportAudit> {
  return JSON.parse(await readFile(AUDIT_PATH, 'utf8')) as ImportAudit
}

async function assertPublicUrl(url: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`Uploaded asset is not publicly reachable (${response.status}): ${url}`)
  }
  await response.body?.cancel()
}

async function cleanupUrls(urls: string[]): Promise<void> {
  const results = await Promise.allSettled(urls.map((url) => deleteFromR2(url)))
  const failures = results
    .map((result, index) => ({ result, url: urls[index] }))
    .filter(({ result }) => result.status === 'rejected')
  if (failures.length > 0) {
    throw new Error(`R2 cleanup failed for: ${failures.map(({ url }) => url).join(', ')}`)
  }
}

async function clearUploadedState(audit: ImportAudit): Promise<void> {
  for (const asset of selectedAssets(audit)) {
    delete asset.outputUrl
  }
  await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
  await unlink(MANIFEST_PATH).catch(() => undefined)
}

async function uploadAssets(audit: ImportAudit): Promise<UploadManifest> {
  const accepted = selectedAssets(audit)
  if (accepted.length !== 5) {
    throw new Error(`Expected 5 accepted assets, found ${accepted.length}`)
  }
  if (accepted.some((asset) => !asset.outputRef)) {
    throw new Error('Every accepted audit asset must have outputRef before upload')
  }

  const alreadyUploaded = accepted.every((asset) => asset.outputUrl)
  if (alreadyUploaded) {
    await Promise.all(accepted.map((asset) => assertPublicUrl(asset.outputUrl!)))
    return {
      productSlug: PRODUCT_SLUG,
      createdAt: new Date().toISOString(),
      assets: accepted.map((asset) => ({
        outputRef: asset.outputRef!,
        outputUrl: asset.outputUrl!,
        provenance: asset.provenance,
        sourceIndex: asset.sourceIndex,
      })),
    }
  }

  const uploaded: string[] = []
  try {
    for (const asset of accepted) {
      const sourcePath = path.resolve(asset.outputRef!)
      const file = await readFile(sourcePath)
      const filename = `20260807-lanoudun-005-${path.basename(sourcePath)}`
      const url = await uploadToR2(file, filename, 'image/webp')
      uploaded.push(url)
      asset.outputUrl = url
    }

    await Promise.all(uploaded.map(assertPublicUrl))
    const manifest: UploadManifest = {
      productSlug: PRODUCT_SLUG,
      createdAt: new Date().toISOString(),
      assets: accepted.map((asset) => ({
        outputRef: asset.outputRef!,
        outputUrl: asset.outputUrl!,
        provenance: asset.provenance,
        sourceIndex: asset.sourceIndex,
      })),
    }
    await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
    await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    return manifest
  } catch (error) {
    await cleanupUrls(uploaded)
    await clearUploadedState(audit)
    throw error
  }
}

function validateVariantData(audit: ImportAudit): void {
  if (audit.offerId !== '675778198502' || audit.moq !== MOQ) {
    throw new Error('Audit offer ID or MOQ does not match the approved import')
  }
  if (audit.variants.length !== 13) {
    throw new Error(`Expected 13 size variants, found ${audit.variants.length}`)
  }
  for (const variant of audit.variants) {
    if (variant.stockStatus !== 'exact' || !Number.isInteger(variant.sourceStock)) {
      throw new Error(`Variant size ${variant.optionValues.size} does not have exact numeric stock`)
    }
    if (variant.sourcePriceCny !== 57 || variant.usdPrice !== PRICE_USD) {
      throw new Error(`Variant size ${variant.optionValues.size} has unexpected price evidence`)
    }
  }
}

async function findOrCreateOption(
  tx: Prisma.TransactionClient,
  attributeId: string,
  value: string
) {
  const existing = await tx.attributeOption.findFirst({
    where: { attributeId, value: { equals: value, mode: 'insensitive' } },
    orderBy: { sortOrder: 'asc' },
  })
  if (existing) return existing

  const maxSort = await tx.attributeOption.aggregate({
    where: { attributeId },
    _max: { sortOrder: true },
  })
  return tx.attributeOption.create({
    data: {
      attributeId,
      value,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  })
}

async function preflight() {
  const [category, productBySlug, productBySku, redirect, variantSkuConflicts, attributes] =
    await Promise.all([
      prisma.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
      prisma.product.findUnique({ where: { slug: PRODUCT_SLUG } }),
      prisma.product.findUnique({ where: { sku: PRODUCT_SKU } }),
      prisma.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG } }),
      prisma.productVariant.findMany({
        where: { sku: { in: Array.from({ length: 13 }, (_, index) => `${PRODUCT_SKU}-${index + 35}`) } },
        select: { id: true, sku: true, productId: true },
      }),
      prisma.attribute.findMany({ where: { code: { in: ['color', 'size', 'material'] } } }),
    ])

  if (!category || category.name !== 'Safety Shoes' || !category.isActive) {
    throw new Error('Active Safety Shoes category is missing or incompatible')
  }
  if (productBySlug || productBySku || redirect || variantSkuConflicts.length > 0) {
    const sameDraft =
      productBySlug &&
      productBySlug.id === productBySku?.id &&
      productBySlug.name === PRODUCT_NAME &&
      productBySlug.categoryId === category.id &&
      !productBySlug.isActive &&
      variantSkuConflicts.every((variant) => variant.productId === productBySlug.id)
    if (sameDraft && !redirect) {
      return { existingProductId: productBySlug.id, category, attributes }
    }
    throw new Error('Product slug, base SKU, variant SKU, or legacy redirect conflict detected')
  }

  for (const code of ['color', 'size', 'material']) {
    const attribute = attributes.find((item) => item.code === code)
    if (!attribute || attribute.type !== 'MULTISELECT') {
      throw new Error(`Required MULTISELECT attribute is missing: ${code}`)
    }
  }
  return { existingProductId: null, category, attributes }
}

async function createDraft(audit: ImportAudit) {
  validateVariantData(audit)
  const accepted = selectedAssets(audit)
  if (accepted.some((asset) => !asset.outputUrl)) {
    throw new Error('Accepted assets are missing final outputUrl values')
  }
  await Promise.all(accepted.map((asset) => assertPublicUrl(asset.outputUrl!)))

  const preflightResult = await preflight()
  if (preflightResult.existingProductId) {
    return { mode: 'execute-noop', productId: preflightResult.existingProductId }
  }

  const gallery = accepted.filter((asset) => asset.provenance === 'gallery')
  const details = accepted.filter((asset) => asset.provenance === 'detail')
  if (gallery.length !== 1 || details.length !== 4) {
    throw new Error(`Expected 1 gallery and 4 detail outputs, found ${gallery.length} and ${details.length}`)
  }

  return prisma.$transaction(
    async (tx) => {
      const [category, productConflict, skuConflict, redirectConflict, attributes] = await Promise.all([
        tx.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
        tx.product.findUnique({ where: { slug: PRODUCT_SLUG } }),
        tx.product.findUnique({ where: { sku: PRODUCT_SKU } }),
        tx.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG } }),
        tx.attribute.findMany({ where: { code: { in: ['color', 'size', 'material'] } } }),
      ])
      if (!category || !category.isActive || productConflict || skuConflict || redirectConflict) {
        throw new Error('Catalog state changed after preflight')
      }

      const colorAttribute = attributes.find((item) => item.code === 'color')!
      const sizeAttribute = attributes.find((item) => item.code === 'size')!
      const materialAttribute = attributes.find((item) => item.code === 'material')!
      const blackOption = await findOrCreateOption(tx, colorAttribute.id, 'Black')
      const leatherOption = await findOrCreateOption(tx, materialAttribute.id, 'Leather')
      const sizeOptions = await Promise.all(
        audit.variants.map((variant) =>
          findOrCreateOption(tx, sizeAttribute.id, variant.optionValues.size)
        )
      )

      const totalStock = audit.variants.reduce((sum, variant) => sum + variant.sourceStock!, 0)
      const specifications = [
        { name: 'Brand', value: 'Lanoudun (蓝鸥盾)' },
        { name: 'Model Number', value: '005' },
        { name: 'Product Type', value: 'Low-Cut Safety Shoes' },
        { name: 'Color', value: 'Black' },
        { name: 'Upper Material', value: 'Cowhide Leather' },
        { name: 'Lining', value: '3D Mesh' },
        { name: 'Outsole', value: 'Rubber' },
        { name: 'Construction', value: 'Adhesive' },
        { name: 'Toe Protection', value: 'Steel Toe' },
        { name: 'Midsole Protection', value: 'Steel Puncture-Resistant Midsole' },
        { name: 'Cut', value: 'Low-Cut' },
        { name: 'Size Range', value: 'EU 35-47' },
        { name: 'Pair Weight', value: 'Approximately 800 g (Supplier Listed)' },
        { name: 'Package Size', value: '31.5 x 20.3 x 11.2 cm' },
        { name: 'Package Gross Weight', value: '1 kg per Pair' },
        { name: 'Minimum Order Quantity', value: '100 Pairs' },
        { name: 'Purchase Price', value: 'CNY 57/Pair' },
        { name: 'Origin', value: 'China' },
        { name: 'Source', value: SOURCE_URL },
        { name: 'Notion Source', value: NOTION_URL },
      ]
      const content = {
        time: Date.now(),
        blocks: details.map((asset) => ({
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

      return tx.product.create({
        data: {
          name: PRODUCT_NAME,
          slug: PRODUCT_SLUG,
          description:
            'Black low-cut cowhide safety shoes with a steel toe, puncture-resistant steel midsole, breathable mesh lining and durable rubber outsole for industrial and construction work.',
          price: PRICE_USD,
          comparePrice: null,
          cost: null,
          sku: PRODUCT_SKU,
          stock: totalStock,
          categoryId: category.id,
          isActive: false,
          isFeatured: false,
          specifications,
          content,
          usageScenes: ['construction', 'heavy-duty', 'impact-resistant', 'slip-resistant'],
          metaTitle: 'Lanoudun 005 Steel Toe Safety Shoes | LAIFAPPE',
          metaDescription:
            'Low-cut cowhide safety shoes with steel toe and puncture-resistant midsole, available in EU sizes 35-47 for industrial and construction procurement.',
          metaKeywords:
            'steel toe safety shoes, cowhide work shoes, puncture resistant safety footwear, Lanoudun 005',
          ogTitle: 'Lanoudun 005 Cowhide Steel Toe Safety Shoes',
          ogDescription:
            'Low-cut cowhide safety shoes with steel toe, steel midsole and rubber outsole in EU sizes 35-47.',
          ogImage: gallery[0].outputUrl,
          images: {
            create: [{
              url: gallery[0].outputUrl!,
              alt: 'Lanoudun 005 black cowhide steel toe safety shoes',
              sortOrder: 0,
            }],
          },
          priceTiers: {
            create: [{ minQuantity: MOQ, maxQuantity: null, price: PRICE_USD, sortOrder: 0 }],
          },
          variants: {
            create: audit.variants.map((variant) => ({
              name: `Size ${variant.optionValues.size}`,
              sku: `${PRODUCT_SKU}-${variant.optionValues.size}`,
              price: variant.usdPrice,
              stock: variant.sourceStock!,
              options: {
                color: 'Black',
                style: '005 Procurement Bestseller',
                size: variant.optionValues.size,
              },
            })),
          },
          attributeValues: {
            create: [
              { attributeId: colorAttribute.id, optionIds: [blackOption.id] },
              { attributeId: materialAttribute.id, optionIds: [leatherOption.id] },
              { attributeId: sizeAttribute.id, optionIds: sizeOptions.map((option) => option.id) },
            ],
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          price: true,
          stock: true,
          isActive: true,
          categoryId: true,
          _count: { select: { images: true, variants: true, priceTiers: true } },
        },
      })
    },
    { isolationLevel: 'Serializable', timeout: 30_000 }
  )
}

async function main(): Promise<void> {
  const audit = await readAudit()
  if (process.argv.includes('--upload')) {
    const manifest = await uploadAssets(audit)
    process.stdout.write(`${JSON.stringify({ mode: 'upload', manifest }, null, 2)}\n`)
    return
  }
  if (process.argv.includes('--execute')) {
    const existingBeforeExecute = await prisma.product.findUnique({
      where: { slug: PRODUCT_SLUG },
      select: { id: true },
    })
    try {
      const product = await createDraft(audit)
      process.stdout.write(`${JSON.stringify({ mode: 'execute', product }, null, 2)}\n`)
    } catch (error) {
      const urls = selectedAssets(audit).flatMap((asset) => asset.outputUrl ? [asset.outputUrl] : [])
      if (!existingBeforeExecute && urls.length > 0) {
        await cleanupUrls(urls)
        await clearUploadedState(audit)
      }
      throw error
    }
    return
  }

  validateVariantData(audit)
  const preflightResult = await preflight()
  process.stdout.write(`${JSON.stringify({
    mode: 'dry-run',
    importDir: IMPORT_DIR,
    category: preflightResult.category,
    existingProductId: preflightResult.existingProductId,
    acceptedAssetCount: selectedAssets(audit).length,
    variantCount: audit.variants.length,
    product: {
      name: PRODUCT_NAME,
      slug: PRODUCT_SLUG,
      sku: PRODUCT_SKU,
      price: PRICE_USD,
      stock: audit.variants.reduce((sum, variant) => sum + (variant.sourceStock ?? 0), 0),
      isActive: false,
    },
  }, null, 2)}\n`)
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Import failed: ${message}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
