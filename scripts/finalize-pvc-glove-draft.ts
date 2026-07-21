import { createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const PRODUCT_ID = 'cmrrllnq20005umfgw0u14sfl'
const PRODUCT_NAME = 'Fully Dipped PVC Oil-Resistant Anti-Slip Gloves'
const PRODUCT_SLUG = 'fully-dipped-pvc-oil-resistant-anti-slip-gloves'
const PRODUCT_SKU = 'HB-919-PVC-BLU-UNI'
const CATEGORY_NAME = 'Acid, Alkali & Oil Resistant Gloves'
const EXPECTED_MOQ = '100 Pairs'
const EXPECTED_PURCHASE_PRICE = 'CNY 3.20/Pair'

const FINAL_ASSET_SPECS = [
  { auditId: 'G01', provenance: 'gallery', sourceIndex: 0, width: 790, height: 790 },
  { auditId: 'G02', provenance: 'gallery', sourceIndex: 1, width: 790, height: 790 },
  { auditId: 'G03', provenance: 'gallery', sourceIndex: 2, width: 790, height: 790 },
  { auditId: 'G04', provenance: 'gallery', sourceIndex: 3, width: 790, height: 790 },
  { auditId: 'D01', provenance: 'detail', sourceIndex: 0, width: 790, height: 1078 },
  { auditId: 'D02', provenance: 'detail', sourceIndex: 1, width: 790, height: 1078 },
  { auditId: 'D03', provenance: 'detail', sourceIndex: 2, width: 790, height: 1078 },
  { auditId: 'D04', provenance: 'detail', sourceIndex: 3, width: 790, height: 1078 },
  { auditId: 'D05', provenance: 'detail', sourceIndex: 4, width: 790, height: 1078 },
  { auditId: 'D06', provenance: 'detail', sourceIndex: 5, width: 790, height: 1078 },
  { auditId: 'D07', provenance: 'detail', sourceIndex: 6, width: 790, height: 1078 },
  { auditId: 'D09', provenance: 'detail', sourceIndex: 8, width: 790, height: 1078 },
] as const

type Provenance = 'gallery' | 'detail'

type CliOptions = {
  execute: boolean
  finalDir: string
  auditPath: string
  validatorPath: string
}

type AuditAsset = Record<string, unknown> & {
  auditId: string
  provenance: Provenance
  sourceIndex: number
  decision: string
  outputRef?: string
  outputUrl?: string
}

type ImportAudit = Record<string, unknown> & {
  assets: AuditAsset[]
}

type FinalAsset = {
  auditId: string
  provenance: Provenance
  sourceIndex: number
  path: string
  buffer: Buffer
  sha256: string
}

type UploadedAsset = FinalAsset & {
  filename: string
  key: string
  url: string
}

type PreflightResult = {
  updatedAt: Date
  price: string
  oldGalleryUrls: string[]
}

const GALLERY_ALT_BY_ID: Record<string, string> = {
  G01: 'Fully dipped blue PVC oil-resistant anti-slip work gloves',
  G02: 'PVC glove mild acid alkali resistance and anti-slip grip demonstration',
  G03: 'Blue PVC work glove gripping pliers with upgraded coating process',
  G04: 'Blue PVC work glove with a soft high-density knitted liner',
}

const prisma = new PrismaClient()

function parseArgs(args: string[]): CliOptions {
  const valueAfter = (name: string): string => {
    const index = args.indexOf(name)
    const value = index >= 0 ? args[index + 1] : undefined
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing required argument: ${name} <path>`)
    }
    return path.resolve(value)
  }

  return {
    execute: args.includes('--execute'),
    finalDir: valueAfter('--final-dir'),
    auditPath: valueAfter('--audit'),
    validatorPath: valueAfter('--validator'),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function readAudit(auditPath: string): Promise<ImportAudit> {
  const value: unknown = JSON.parse(await readFile(auditPath, 'utf8'))
  if (!isRecord(value) || !Array.isArray(value.assets)) {
    throw new Error('Audit file must contain an assets array')
  }

  const assets = value.assets.map((asset, index): AuditAsset => {
    if (
      !isRecord(asset) ||
      typeof asset.auditId !== 'string' ||
      (asset.provenance !== 'gallery' && asset.provenance !== 'detail') ||
      !Number.isInteger(asset.sourceIndex) ||
      typeof asset.decision !== 'string'
    ) {
      throw new Error(`Audit asset at index ${index} is missing localization identity fields`)
    }
    return asset as AuditAsset
  })

  return { ...value, assets }
}

function runAuditValidator(validatorPath: string, auditPath: string, phase: 'pre-upload' | 'pre-db') {
  const result = spawnSync(process.execPath, [validatorPath, auditPath, '--phase', phase], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(
      `Import audit ${phase} validation failed: ${result.stderr.trim() || result.stdout.trim() || 'unknown validator error'}`
    )
  }
  return result.stdout.trim()
}

function findAuditAsset(audit: ImportAudit, auditId: string): AuditAsset {
  const asset = audit.assets.find((candidate) => candidate.auditId === auditId)
  if (!asset) throw new Error(`Audit row is missing: ${auditId}`)
  return asset
}

async function loadFinalAssets(finalDir: string, audit: ImportAudit): Promise<FinalAsset[]> {
  const assets = await Promise.all(
    FINAL_ASSET_SPECS.map(async (spec): Promise<FinalAsset> => {
      const auditAsset = findAuditAsset(audit, spec.auditId)
      if (
        auditAsset.provenance !== spec.provenance ||
        auditAsset.sourceIndex !== spec.sourceIndex ||
        auditAsset.decision === 'reject'
      ) {
        throw new Error(`Audit row ${spec.auditId} does not match the approved final-asset contract`)
      }

      const assetPath = path.join(finalDir, `${spec.auditId}.webp`)
      if (!auditAsset.outputRef || path.resolve(auditAsset.outputRef) !== assetPath) {
        throw new Error(`Audit row ${spec.auditId} outputRef does not resolve to ${assetPath}`)
      }

      const buffer = await readFile(assetPath)
      const metadata = await sharp(buffer).metadata()
      if (
        metadata.format !== 'webp' ||
        metadata.width !== spec.width ||
        metadata.height !== spec.height
      ) {
        throw new Error(
          `${spec.auditId} must be a ${spec.width}x${spec.height} WebP; received ${metadata.width}x${metadata.height} ${metadata.format}`
        )
      }

      return {
        auditId: spec.auditId,
        provenance: spec.provenance,
        sourceIndex: spec.sourceIndex,
        path: assetPath,
        buffer,
        sha256: createHash('sha256').update(buffer).digest('hex'),
      }
    })
  )

  const hashes = new Set(assets.map((asset) => asset.sha256))
  if (hashes.size !== assets.length) {
    throw new Error('Final assets must contain exactly 12 unique image files')
  }
  const duplicateAudit = findAuditAsset(audit, 'D08')
  if (duplicateAudit.decision !== 'reject') {
    throw new Error('D08 must remain rejected as the exact duplicate of D07')
  }

  return assets
}

function readSpecification(specifications: unknown, name: string): string | null {
  if (!Array.isArray(specifications)) return null
  for (const item of specifications) {
    if (isRecord(item) && item.name === name && typeof item.value === 'string') {
      return item.value
    }
  }
  return null
}

async function preflight(): Promise<PreflightResult> {
  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    include: {
      category: { select: { name: true, isActive: true } },
      images: { orderBy: { sortOrder: 'asc' }, select: { url: true } },
    },
  })
  if (!product) throw new Error(`Target product draft does not exist: ${PRODUCT_ID}`)
  if (
    product.name !== PRODUCT_NAME ||
    product.slug !== PRODUCT_SLUG ||
    product.sku !== PRODUCT_SKU ||
    product.isActive ||
    product.isFeatured
  ) {
    throw new Error('Target product identity or inactive-draft status no longer matches the approved contract')
  }
  if (!product.category || product.category.name !== CATEGORY_NAME || product.category.isActive) {
    throw new Error('Target category is missing, renamed, or active')
  }
  if (readSpecification(product.specifications, 'Minimum Order Quantity') !== EXPECTED_MOQ) {
    throw new Error(`Draft MOQ must remain ${EXPECTED_MOQ}`)
  }
  if (readSpecification(product.specifications, 'Purchase Price') !== EXPECTED_PURCHASE_PRICE) {
    throw new Error(`Admin purchase price must remain ${EXPECTED_PURCHASE_PRICE}`)
  }

  return {
    updatedAt: product.updatedAt,
    price: product.price.toString(),
    oldGalleryUrls: product.images.map((image) => image.url),
  }
}

async function cleanupUploads(assets: UploadedAsset[]): Promise<string[]> {
  const results = await Promise.allSettled(assets.map((asset) => deleteFromR2(asset.url)))
  return assets
    .filter((_, index) => results[index]?.status === 'rejected')
    .map((asset) => asset.key)
}

async function uploadFinalAssets(assets: FinalAsset[]): Promise<UploadedAsset[]> {
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`
  const results = await Promise.allSettled(
    assets.map(async (asset): Promise<UploadedAsset> => {
      const filename = `${runId}-pvc-oil-glove-en-${asset.auditId.toLowerCase()}.webp`
      const url = await uploadToR2(asset.buffer, filename, 'image/webp')
      return { ...asset, filename, key: `products/${filename}`, url }
    })
  )
  const uploaded = results
    .filter((result): result is PromiseFulfilledResult<UploadedAsset> => result.status === 'fulfilled')
    .map((result) => result.value)
  const failure = results.find((result) => result.status === 'rejected')
  if (failure) {
    const failedCleanupKeys = await cleanupUploads(uploaded)
    throw new Error(
      `Localized image upload failed: ${String(failure.reason)}. ` +
        (failedCleanupKeys.length
          ? `Manual cleanup required for: ${failedCleanupKeys.join(', ')}`
          : 'Uploaded assets were cleaned up.')
    )
  }
  return uploaded
}

async function verifyUploadedAssets(assets: UploadedAsset[]): Promise<void> {
  const results = await Promise.allSettled(
    assets.map(async (asset) => {
      const response = await fetch(asset.url, {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
      })
      const contentType = response.headers.get('content-type') ?? ''
      if (!response.ok || !contentType.toLowerCase().includes('image/webp')) {
        throw new Error(`${asset.auditId} returned HTTP ${response.status} with ${contentType || 'no content type'}`)
      }
    })
  )
  const failures = results
    .map((result, index) => ({ result, asset: assets[index] }))
    .filter((entry) => entry.result.status === 'rejected')
    .map((entry) => `${entry.asset?.auditId ?? 'unknown'}: ${String((entry.result as PromiseRejectedResult).reason)}`)
  if (failures.length) throw new Error(`Uploaded asset verification failed: ${failures.join('; ')}`)
}

async function writePreDbAudit(
  audit: ImportAudit,
  uploaded: UploadedAsset[],
  auditPath: string
): Promise<string> {
  const urlsByAuditId = new Map(uploaded.map((asset) => [asset.auditId, asset.url]))
  const preDbAudit: ImportAudit = {
    ...audit,
    assets: audit.assets.map((asset) => {
      const outputUrl = urlsByAuditId.get(asset.auditId)
      return outputUrl ? { ...asset, outputUrl } : { ...asset }
    }),
  }
  const outputPath = path.join(path.dirname(auditPath), 'import-audit.pre-db.json')
  await writeFile(outputPath, `${JSON.stringify(preDbAudit, null, 2)}\n`, 'utf8')
  return outputPath
}

async function updateDraft(
  preflightResult: PreflightResult,
  uploaded: UploadedAsset[]
) {
  const gallery = uploaded
    .filter((asset) => asset.provenance === 'gallery')
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
  const details = uploaded
    .filter((asset) => asset.provenance === 'detail')
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
  if (gallery.length !== 4 || details.length !== 8) {
    throw new Error(`Expected 4 gallery and 8 detail assets, found ${gallery.length} and ${details.length}`)
  }

  const content: Prisma.InputJsonValue = {
    time: Date.now(),
    version: '2.31.1',
    blocks: details.map((asset) => ({
      id: `pvc-en-${asset.auditId.toLowerCase()}`,
      type: 'image',
      data: {
        file: { url: asset.url },
        caption: '',
        withBorder: false,
        stretched: true,
        withBackground: false,
      },
    })),
  }

  return prisma.$transaction(
    async (tx) => {
      const current = await tx.product.findUnique({
        where: { id: PRODUCT_ID },
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          isActive: true,
          isFeatured: true,
          price: true,
          updatedAt: true,
        },
      })
      if (!current) throw new Error('Target product disappeared after preflight')
      if (
        current.name !== PRODUCT_NAME ||
        current.slug !== PRODUCT_SLUG ||
        current.sku !== PRODUCT_SKU ||
        current.isActive ||
        current.isFeatured
      ) {
        throw new Error('Target product identity or draft status changed after preflight')
      }
      if (current.updatedAt.getTime() !== preflightResult.updatedAt.getTime()) {
        throw new Error('Target product changed after preflight; refusing to overwrite concurrent edits')
      }
      if (current.price.toString() !== preflightResult.price) {
        throw new Error('Target product price changed after preflight; refusing to overwrite concurrent edits')
      }

      return tx.product.update({
        where: { id: PRODUCT_ID },
        data: {
          isActive: false,
          isFeatured: false,
          ogImage: gallery[0]?.url ?? null,
          content,
          images: {
            deleteMany: {},
            create: gallery.map((asset, index) => ({
              url: asset.url,
              alt: GALLERY_ALT_BY_ID[asset.auditId] ?? PRODUCT_NAME,
              sortOrder: index,
            })),
          },
        },
        select: {
          id: true,
          slug: true,
          price: true,
          isActive: true,
          isFeatured: true,
          updatedAt: true,
          images: { orderBy: { sortOrder: 'asc' }, select: { url: true, alt: true, sortOrder: true } },
        },
      })
    },
    { isolationLevel: 'Serializable', timeout: 30_000 }
  )
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const audit = await readAudit(options.auditPath)
  const auditValidation = runAuditValidator(options.validatorPath, options.auditPath, 'pre-upload')
  const [assets, preflightResult] = await Promise.all([
    loadFinalAssets(options.finalDir, audit),
    preflight(),
  ])

  if (!options.execute) {
    process.stdout.write(
      `${JSON.stringify(
        {
          mode: 'dry-run',
          auditValidation,
          productId: PRODUCT_ID,
          preservedPrice: preflightResult.price,
          finalAssetCount: assets.length,
          galleryCount: assets.filter((asset) => asset.provenance === 'gallery').length,
          detailCount: assets.filter((asset) => asset.provenance === 'detail').length,
          oldGalleryUrls: preflightResult.oldGalleryUrls,
        },
        null,
        2
      )}\n`
    )
    return
  }

  const uploaded = await uploadFinalAssets(assets)
  let executionResult: Record<string, unknown>
  try {
    await verifyUploadedAssets(uploaded)
    const preDbAuditPath = await writePreDbAudit(audit, uploaded, options.auditPath)
    const preDbValidation = runAuditValidator(options.validatorPath, preDbAuditPath, 'pre-db')
    const product = await updateDraft(preflightResult, uploaded)
    executionResult = {
      mode: 'execute',
      preDbAuditPath,
      preDbValidation,
      uploaded: uploaded.map(({ auditId, key, url }) => ({ auditId, key, url })),
      product,
    }
  } catch (error) {
    const failedCleanupKeys = await cleanupUploads(uploaded)
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Localized draft finalization failed: ${reason}. ` +
        (failedCleanupKeys.length
          ? `Manual cleanup required for: ${failedCleanupKeys.join(', ')}`
          : 'Newly uploaded assets were cleaned up.'),
      error instanceof Error ? { cause: error } : undefined
    )
  }

  process.stdout.write(`${JSON.stringify(executionResult, null, 2)}\n`)
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Finalization failed: ${message}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
