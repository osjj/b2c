import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const PRODUCT_ID = 'cmsv7p11g0001um3kmx75krzv'
const PRODUCT_SLUG = 'kn95-ffp2-cup-shaped-valved-dust-respirator'
const OUTPUT_DIR = path.resolve('output/kn95-ffp2-cup-shaped-valved-respirator')
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'test-report-screenshot-manifest.json')
const EXPECTED_CURRENT_BLOCKS = 11
const EXPECTED_FINAL_BLOCKS = 13

const sourceAssets = [
  {
    key: 'en149-test-report',
    sourcePath: 'C:/Users/osjj/AppData/Local/Temp/codex-clipboard-478f5540-bc49-4b21-8050-e38565f6f88e.png',
    filenamePrefix: '20260816-9009v-en149-test-report-2021-d-0158',
    caption:
      'EN 149:2001+A1:2009 FFP2 NR test report screenshot for model 9009V — Report No. 2021(D)-0158',
  },
  {
    key: 'module-b-certificate-annex',
    sourcePath: 'C:/Users/osjj/AppData/Local/Temp/codex-clipboard-b468bc4a-8bd3-4f30-a32c-235c4ba1bcf6.png',
    filenamePrefix: '20260816-9009v-module-b-certificate-annex',
    caption:
      'CCQS Module B EU Type-Examination Certificate annex screenshot for model 9009V — Certificate No. CE-PC-250730-392-01-9A',
  },
] as const

type ManifestAsset = {
  key: (typeof sourceAssets)[number]['key']
  sourcePath: string
  outputUrl: string
  sha256: string
  width: number
  height: number
  caption: string
}

type Manifest = {
  productId: string
  productSlug: string
  assets: ManifestAsset[]
}

type Specification = {
  name: string
  value: string
}

const prisma = new PrismaClient()

function parseContent(value: Prisma.JsonValue | null): {
  time: number
  version: string
  blocks: Prisma.JsonArray
} {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('Product detail content is missing or invalid')
  }
  const candidate = value as { time?: unknown; version?: unknown; blocks?: unknown }
  if (!Array.isArray(candidate.blocks)) {
    throw new Error('Product detail content has no blocks array')
  }
  return {
    time: typeof candidate.time === 'number' ? candidate.time : Date.now(),
    version: typeof candidate.version === 'string' ? candidate.version : '2.31.1',
    blocks: candidate.blocks as Prisma.JsonArray,
  }
}

function parseSpecifications(value: Prisma.JsonValue): Specification[] {
  if (!Array.isArray(value)) {
    throw new Error('Product specifications are not an array')
  }
  return value.map((item, index) => {
    if (!item || Array.isArray(item) || typeof item !== 'object') {
      throw new Error(`Specification ${index} is invalid`)
    }
    const candidate = item as { name?: unknown; value?: unknown }
    if (typeof candidate.name !== 'string' || typeof candidate.value !== 'string') {
      throw new Error(`Specification ${index} is missing a string name or value`)
    }
    return { name: candidate.name, value: candidate.value }
  })
}

function upsertSpecification(
  specifications: Specification[],
  name: string,
  value: string
): Specification[] {
  const index = specifications.findIndex((item) => item.name === name)
  if (index === -1) {
    return [...specifications, { name, value }]
  }
  return specifications.map((item, itemIndex) =>
    itemIndex === index ? { name, value } : item
  )
}

function updatedSpecifications(value: Prisma.JsonValue): Prisma.InputJsonValue {
  let specifications = parseSpecifications(value)
  specifications = upsertSpecification(
    specifications,
    'Exhalation Valve',
    'Present. The provided EN 149 test report identifies model 9009V as a white cup mask with valve; the Module B annex lists an exhalation valve.'
  )
  specifications = upsertSpecification(
    specifications,
    'Source-Stated Grade',
    'FFP2 NR is supported by the provided EN 149 test report and Module B certificate annex for model 9009V. KN95 remains source-stated pending separate GB 2626 evidence.'
  )
  specifications = upsertSpecification(
    specifications,
    'Source-Stated Standard',
    'EN 149:2001+A1:2009 is supported by test report 2021(D)-0158 and the provided Module B certificate annex. GB 2626-2019 remains source-stated pending separate evidence.'
  )
  specifications = upsertSpecification(
    specifications,
    'Source-Visible Marking',
    '9009V, FFP2 NR, CE 2834 and EN 149:2001+A1:2009; the provided report and certificate screenshots support the FFP2 NR marking.'
  )
  specifications = upsertSpecification(
    specifications,
    'Certification / Test Report',
    'Provided screenshot: EN 149:2001+A1:2009 test report for model 9009V, classification FFP2 NR, report no. 2021(D)-0158; tested 2021-08-04 to 2021-08-24 and issued 2021-08-24.'
  )
  specifications = upsertSpecification(
    specifications,
    'EU Type-Examination Certificate',
    'Provided screenshot: CCQS Module B EU Type-Examination Certificate annex, certificate no. CE-PC-250730-392-01-9A, model 9009V, FFP2 NR; revision A dated 2025-08-13. The annex states that it is valid only with the accompanying certificate.'
  )
  specifications = upsertSpecification(
    specifications,
    'Safety Note',
    'The provided screenshots support EN 149 FFP2 NR documentation for model 9009V. They do not establish KN95 / GB 2626 or NIOSH approval. Verify the full report, accompanying Module B certificate, EU Declaration of Conformity, and applicable Module C2 or D production-surveillance documents before order confirmation.'
  )
  return specifications
}

async function readProduct() {
  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: { id: 'asc' } },
      priceTiers: { orderBy: { sortOrder: 'asc' } },
    },
  })
  if (!product || product.slug !== PRODUCT_SLUG) {
    throw new Error('Target product was not found')
  }
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

function assertBaseline(
  product: Awaited<ReturnType<typeof readProduct>>,
  expectedBlockCount: number
): void {
  const content = parseContent(product.content)
  const checks = {
    price: product.price.toString() === '0.19',
    active: product.isActive && !product.isFeatured,
    category: product.category?.slug === 'respiratory-protection',
    galleryCount: product.images.length === 4,
    blockCount: content.blocks.length === expectedBlockCount,
    noVariants: product.variants.length === 0,
    priceTierCount: product.priceTiers.length === 2,
    noSku: product.sku === null,
    stock: product.stock === 0,
  }
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name)
  if (failed.length > 0) {
    throw new Error(`Product baseline check failed: ${failed.join(', ')}`)
  }
}

async function validateSourceAssets(): Promise<
  Array<{
    asset: (typeof sourceAssets)[number]
    buffer: Buffer
    sha256: string
    width: number
    height: number
  }>
> {
  const validated = []
  for (const asset of sourceAssets) {
    const buffer = await readFile(asset.sourcePath)
    const metadata = await sharp(buffer).metadata()
    if (metadata.format !== 'png' || !metadata.width || !metadata.height) {
      throw new Error(`${asset.key} is not a valid PNG screenshot`)
    }
    validated.push({
      asset,
      buffer,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      width: metadata.width,
      height: metadata.height,
    })
  }
  return validated
}

async function retry<T>(operation: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500))
      }
    }
  }
  throw new Error(`${label} failed after 3 attempts`, {
    cause: lastError instanceof Error ? lastError : undefined,
  })
}

async function assertPublicPng(url: string): Promise<void> {
  await retry(async () => {
    const response = await fetch(url, { redirect: 'follow' })
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.toLowerCase().includes('image/png')) {
      throw new Error(`HTTP ${response.status} with ${contentType || 'no content type'}`)
    }
    await response.body?.cancel()
  }, `Public verification for ${url}`)
}

async function cleanupUrls(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(urls.map((url) => deleteFromR2(url)))
  return results.flatMap((result, index) =>
    result.status === 'rejected' ? [urls[index] ?? 'unknown'] : []
  )
}

async function readManifest(): Promise<Manifest> {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as Manifest
  if (
    manifest.productId !== PRODUCT_ID ||
    manifest.productSlug !== PRODUCT_SLUG ||
    manifest.assets.length !== sourceAssets.length
  ) {
    throw new Error('Screenshot manifest does not match the target product')
  }
  return manifest
}

async function upload(): Promise<void> {
  const product = await readProduct()
  assertBaseline(product, EXPECTED_CURRENT_BLOCKS)
  const validated = await validateSourceAssets()
  const uploaded: ManifestAsset[] = []
  try {
    for (const item of validated) {
      const filename = `${item.asset.filenamePrefix}-${randomUUID().slice(0, 8)}.png`
      const outputUrl = await retry(
        () => uploadToR2(item.buffer, filename, 'image/png'),
        `R2 upload for ${item.asset.key}`
      )
      await assertPublicPng(outputUrl)
      uploaded.push({
        key: item.asset.key,
        sourcePath: item.asset.sourcePath,
        outputUrl,
        sha256: item.sha256,
        width: item.width,
        height: item.height,
        caption: item.asset.caption,
      })
    }
  } catch (error) {
    const cleanupFailures = await cleanupUrls(uploaded.map((asset) => asset.outputUrl))
    throw new Error(
      `Screenshot upload failed: ${error instanceof Error ? error.message : String(error)}. Cleanup failures: ${cleanupFailures.join(', ') || 'none'}`,
      error instanceof Error ? { cause: error } : undefined
    )
  }
  const manifest: Manifest = {
    productId: PRODUCT_ID,
    productSlug: PRODUCT_SLUG,
    assets: uploaded,
  }
  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify({ mode: 'upload', manifest }, null, 2)}\n`)
}

async function execute(): Promise<void> {
  const manifest = await readManifest()
  const before = await readProduct()
  assertBaseline(before, EXPECTED_CURRENT_BLOCKS)
  const beforeProtected = protectedSnapshot(before)
  const beforeContent = parseContent(before.content)
  for (const asset of manifest.assets) {
    await assertPublicPng(asset.outputUrl)
  }
  const newBlocks = manifest.assets.map((asset) => ({
    id: `9009v-${asset.key}`,
    type: 'image',
    data: {
      file: { url: asset.outputUrl },
      caption: asset.caption,
      withBorder: true,
      stretched: true,
      withBackground: false,
    },
  })) as Prisma.JsonArray
  const content: Prisma.InputJsonValue = {
    time: Date.now(),
    version: beforeContent.version,
    blocks: [...beforeContent.blocks, ...newBlocks] as Prisma.JsonArray,
  }
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({
        where: { id: PRODUCT_ID },
        select: { updatedAt: true },
      })
      if (!current || current.updatedAt.getTime() !== before.updatedAt.getTime()) {
        throw new Error('Product changed after preflight')
      }
      await tx.product.update({
        where: { id: PRODUCT_ID },
        data: {
          content,
          specifications: updatedSpecifications(before.specifications),
        },
      })
    }, { isolationLevel: 'Serializable', timeout: 30_000 })
  } catch (error) {
    const cleanupFailures = await cleanupUrls(manifest.assets.map((asset) => asset.outputUrl))
    throw new Error(
      `Database update failed: ${error instanceof Error ? error.message : String(error)}. Cleanup failures: ${cleanupFailures.join(', ') || 'none'}`,
      error instanceof Error ? { cause: error } : undefined
    )
  }
  const after = await readProduct()
  assertBaseline(after, EXPECTED_FINAL_BLOCKS)
  if (protectedSnapshot(after) !== beforeProtected) {
    throw new Error('A protected commercial or catalog field changed')
  }
  const contentText = JSON.stringify(after.content)
  if (manifest.assets.some((asset) => !contentText.includes(asset.outputUrl))) {
    throw new Error('One or more report screenshots are missing from product content')
  }
  const specificationsText = JSON.stringify(after.specifications)
  if (
    !specificationsText.includes('2021(D)-0158') ||
    !specificationsText.includes('CE-PC-250730-392-01-9A')
  ) {
    throw new Error('Updated compliance specifications are incomplete')
  }
  process.stdout.write(`${JSON.stringify({
    mode: 'execute',
    productId: after.id,
    isActive: after.isActive,
    price: after.price.toString(),
    stock: after.stock,
    sku: after.sku,
    galleryCount: after.images.length,
    detailBlockCount: parseContent(after.content).blocks.length,
    variantCount: after.variants.length,
    priceTierCount: after.priceTiers.length,
    protectedSnapshotSha256: createHash('sha256').update(beforeProtected).digest('hex'),
    appendedUrls: manifest.assets.map((asset) => asset.outputUrl),
  }, null, 2)}\n`)
}

async function verify(): Promise<void> {
  const manifest = await readManifest()
  const product = await readProduct()
  assertBaseline(product, EXPECTED_FINAL_BLOCKS)
  const contentText = JSON.stringify(product.content)
  const specificationsText = JSON.stringify(product.specifications)
  if (manifest.assets.some((asset) => !contentText.includes(asset.outputUrl))) {
    throw new Error('One or more report screenshots are missing from product content')
  }
  if (
    !specificationsText.includes('2021(D)-0158') ||
    !specificationsText.includes('CE-PC-250730-392-01-9A') ||
    specificationsText.includes('Certification / Test Report\",\"value\":\"Not Provided')
  ) {
    throw new Error('Compliance specifications were not updated as expected')
  }
  for (const asset of manifest.assets) {
    await assertPublicPng(asset.outputUrl)
  }
  process.stdout.write(`${JSON.stringify({
    mode: 'verify',
    productId: product.id,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    price: product.price.toString(),
    stock: product.stock,
    sku: product.sku,
    galleryCount: product.images.length,
    detailBlockCount: parseContent(product.content).blocks.length,
    variantCount: product.variants.length,
    priceTierCount: product.priceTiers.length,
    reportScreenshots: manifest.assets,
  }, null, 2)}\n`)
}

async function main(): Promise<void> {
  if (process.argv.includes('--upload')) {
    await upload()
    return
  }
  if (process.argv.includes('--execute')) {
    await execute()
    return
  }
  if (process.argv.includes('--verify')) {
    await verify()
    return
  }
  const product = await readProduct()
  assertBaseline(product, EXPECTED_CURRENT_BLOCKS)
  const assets = await validateSourceAssets()
  process.stdout.write(`${JSON.stringify({
    mode: 'dry-run',
    productId: product.id,
    isActive: product.isActive,
    currentDetailBlockCount: parseContent(product.content).blocks.length,
    expectedFinalDetailBlockCount: EXPECTED_FINAL_BLOCKS,
    protected: {
      price: product.price.toString(),
      stock: product.stock,
      sku: product.sku,
      galleryCount: product.images.length,
      variantCount: product.variants.length,
      priceTierCount: product.priceTiers.length,
    },
    assets: assets.map((item) => ({
      key: item.asset.key,
      sourcePath: item.asset.sourcePath,
      sha256: item.sha256,
      width: item.width,
      height: item.height,
    })),
  }, null, 2)}\n`)
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `Append failed: ${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
