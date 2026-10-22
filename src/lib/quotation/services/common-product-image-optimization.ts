import { createHash, randomUUID } from 'node:crypto'

import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'

import {
  imageOptimizationInputSchema,
  imageOptimizationResultSchema,
  imageOptimizationScanResultSchema,
  type ImageOptimizationImage,
  type ImageOptimizationInput,
  type ImageOptimizationResult,
  type ImageOptimizationScanResult,
} from '../common-product-image-optimization'
import { QuotationError } from '../errors'
import { quotationQuarantineKey } from '../object-keys'
import { getQuotationPrivateStorage, type QuotationPrivateStorage } from '../private-storage'
import { writeQuotationAudit } from './audit'
import {
  encodeCommonProductImage,
  IMAGE_OPTIMIZATION_PROFILE,
  MAX_OPTIMIZATION_INPUT_BYTES,
  MAX_OPTIMIZATION_OUTPUT_BYTES,
  SMALL_OPTIMIZATION_IMAGE_BYTES,
  type OptimizedImage,
} from './common-product-image-encoding'

const sourceSelect = {
  id: true, salesQuotationId: true, displayName: true, originalFilename: true,
  contentType: true, sizeBytes: true, storageProvider: true, objectKey: true,
  sha256: true, securityStatus: true, deletedAt: true,
} satisfies Prisma.QuotationSourceFileSelect

const imageSelect = {
  id: true, quotationProductId: true, sourceFileId: true, displayName: true,
  objectKey: true, contentType: true, sizeBytes: true, sha256: true,
  sortOrder: true, isCustomerVisible: true, sourceFile: { select: sourceSelect },
} satisfies Prisma.QuotationProductImageSelect

type Image = Prisma.QuotationProductImageGetPayload<{ select: typeof imageSelect }>
type Database = Pick<Prisma.TransactionClient, 'quotationProduct' | 'quotationProductImage' | 'quotationSourceFile' | 'setting'>
type Markers = Map<string, unknown>
type Classification = Pick<ImageOptimizationImage, 'status' | 'reason' | 'originalSourceFileId'>
type NewObject = { id: string; objectKey: string; image: OptimizedImage }

const fileIdSchema = imageOptimizationInputSchema.shape.sourceFileId
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/)
const derivedSchema = z.object({
  version: z.literal(1), originalSourceFileId: fileIdSchema, sourceFileId: fileIdSchema,
  originalSha256: hashSchema, sha256: hashSchema,
  beforeBytes: z.number().int().positive(), afterBytes: z.number().int().positive(),
}).strict()
const checkedSchema = z.object({ version: z.literal(1), sourceFileId: fileIdSchema, sha256: hashSchema }).strict()
const operationSchema = z.object({
  version: z.literal(1), input: imageOptimizationInputSchema, result: imageOptimizationResultSchema,
}).strict()
const operationKey = (id: string) => `quotation.image-optimization.operation.${id}`
const derivedKey = (id: string) => `quotation.image-optimization.derived.${id}`
const checkedKey = (id: string) => `quotation.image-optimization.checked.${id}`

function unsupported(reason: string): Classification {
  return { status: 'unsupported', reason, originalSourceFileId: null }
}

function classify(image: Image, markers: Markers, provider: string): Classification {
  const source = image.sourceFile
  if (!source || !image.sourceFileId || source.id !== image.sourceFileId || !fileIdSchema.safeParse(source.id).success) {
    return unsupported('缺少可用的原始图片记录')
  }
  if (source.deletedAt || source.securityStatus !== 'CLEAN' || source.salesQuotationId) {
    return unsupported('图片已删除、未通过验证或属于已有报价')
  }
  if (source.contentType !== 'image/png' && source.contentType !== 'image/jpeg') return unsupported('仅支持 PNG 或 JPEG 图片')
  const extension = source.contentType === 'image/png' ? /\.png$/i : /\.jpe?g$/i
  if (!extension.test(source.displayName) || !extension.test(source.originalFilename)) return unsupported('图片文件名与格式不一致')
  if (
    source.storageProvider !== provider || !source.objectKey || source.objectKey !== image.objectKey
    || source.contentType !== image.contentType || source.sizeBytes !== image.sizeBytes || source.sha256 !== image.sha256
    || (image.displayName !== null && image.displayName !== source.displayName)
    || !hashSchema.safeParse(source.sha256).success
  ) return unsupported('图片和源文件的保存信息不一致')
  if (!Number.isSafeInteger(source.sizeBytes) || source.sizeBytes <= 0 || source.sizeBytes > MAX_OPTIMIZATION_INPUT_BYTES) {
    return unsupported('原始图片为空或超过 12 MB')
  }

  let originalSourceFileId: string | null = null
  if (markers.has(derivedKey(source.id))) {
    const parsed = derivedSchema.safeParse(markers.get(derivedKey(source.id)))
    if (
      !parsed.success || parsed.data.sourceFileId !== source.id || parsed.data.sha256 !== source.sha256
      || parsed.data.afterBytes !== source.sizeBytes || parsed.data.originalSourceFileId === source.id
      || parsed.data.afterBytes > MAX_OPTIMIZATION_OUTPUT_BYTES || parsed.data.afterBytes > parsed.data.beforeBytes * 0.9
    ) return unsupported('已有优化记录异常，请检查图片记录')
    originalSourceFileId = parsed.data.originalSourceFileId
  }
  const checked = markers.has(checkedKey(source.id))
  if (checked) {
    const parsed = checkedSchema.safeParse(markers.get(checkedKey(source.id)))
    if (!parsed.success || parsed.data.sourceFileId !== source.id || parsed.data.sha256 !== source.sha256) {
      return unsupported('已有检查记录异常，请检查图片记录')
    }
  }
  if (originalSourceFileId) return { status: 'optimized', reason: '已使用当前清晰度方案优化，原图已保留', originalSourceFileId }
  if (checked) return { status: 'unchanged', reason: '已检查，继续压缩收益不足，保留原图', originalSourceFileId: source.id }
  if (source.sizeBytes <= SMALL_OPTIMIZATION_IMAGE_BYTES) return { status: 'small', reason: '不超过 512 KB，保留原图', originalSourceFileId: null }
  return { status: 'pending', reason: '可检查并优化，完成后显示实际节省体积', originalSourceFileId: null }
}

async function readMarkers(database: Database, sourceIds: string[]): Promise<Markers> {
  const keys = [...new Set(sourceIds)].flatMap((id) => [derivedKey(id), checkedKey(id)])
  if (!keys.length) return new Map()
  const rows = await database.setting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } })
  return new Map(rows.map((row) => [row.key, row.value]))
}

export async function scanCommonProductImages(cursor?: string): Promise<ImageOptimizationScanResult> {
  const products = await prisma.quotationProduct.findMany({
    where: { images: { some: {} }, ...(cursor ? { id: { gt: cursor } } : {}) },
    orderBy: { id: 'asc' }, take: 51,
    select: {
      id: true, nameEn: true, nameZh: true, internalNumber: true, updatedAt: true,
      images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: imageSelect },
    },
  })
  const page = products.slice(0, 50)
  const markers = await readMarkers(prisma, page.flatMap((product) => product.images.flatMap((image) => image.sourceFileId ? [image.sourceFileId] : [])))
  // Constructing the adapter validates configuration; scanning never reads or writes an object.
  const provider = getQuotationPrivateStorage().provider
  return imageOptimizationScanResultSchema.parse({
    products: page.map((product) => ({
      id: product.id, name: product.nameEn || product.nameZh || product.internalNumber,
      updatedAt: product.updatedAt.toISOString(),
      images: product.images.map((image) => ({
        id: image.id,
        sourceFileId: fileIdSchema.safeParse(image.sourceFileId).success ? image.sourceFileId : null,
        name: image.displayName || image.sourceFile?.displayName || '产品图片',
        sizeBytes: Number.isSafeInteger(image.sizeBytes) && image.sizeBytes > 0 ? image.sizeBytes : 0,
        ...classify(image, markers, provider),
      })),
    })),
    nextCursor: products.length > 50 ? page.at(-1)?.id ?? null : null,
  })
}

function inputsMatch(a: ImageOptimizationInput, b: ImageOptimizationInput): boolean {
  return a.requestId === b.requestId && a.productId === b.productId && a.imageId === b.imageId
    && a.sourceFileId === b.sourceFileId && a.expectedUpdatedAt === b.expectedUpdatedAt
}

async function readReplay(database: Database, input: ImageOptimizationInput): Promise<ImageOptimizationResult | null> {
  const row = await database.setting.findUnique({ where: { key: operationKey(input.requestId) }, select: { value: true } })
  if (!row) return null
  const parsed = operationSchema.safeParse(row.value)
  if (!parsed.success) throw new QuotationError('INTERNAL_ERROR', '图片优化记录异常，请重新扫描并检查结果')
  if (!inputsMatch(parsed.data.input, input)) throw new QuotationError('VALIDATION_FAILED', '请求编号已用于其他图片或版本，请重新扫描')
  const result = parsed.data.result
  const invalid = result.productId !== input.productId || result.imageId !== input.imageId
    || result.afterBytes > result.beforeBytes
    || (result.status === 'optimized' && (result.sourceFileId === input.sourceFileId
      || result.afterBytes > MAX_OPTIMIZATION_OUTPUT_BYTES || result.afterBytes > result.beforeBytes * 0.9
      || new Date(result.updatedAt).getTime() <= new Date(input.expectedUpdatedAt).getTime()))
    || (result.status === 'unchanged' && (result.sourceFileId !== input.sourceFileId
      || result.beforeBytes !== result.afterBytes || result.updatedAt !== input.expectedUpdatedAt))
  if (invalid) throw new QuotationError('INTERNAL_ERROR', '图片优化结果记录异常，请重新扫描并检查结果')
  return result
}

async function readTarget(database: Database, input: ImageOptimizationInput) {
  const product = await database.quotationProduct.findUnique({
    where: { id: input.productId },
    select: { id: true, updatedAt: true, images: { where: { id: input.imageId }, select: imageSelect } },
  })
  if (!product) throw new QuotationError('NOT_FOUND', '常用产品不存在，请重新扫描')
  if (product.updatedAt.toISOString() !== input.expectedUpdatedAt) throw new QuotationError('VERSION_CONFLICT', '产品已更新，请重新扫描后再优化')
  const image = product.images.find((entry) => entry.id === input.imageId)
  if (!image || image.quotationProductId !== input.productId || image.sourceFileId !== input.sourceFileId) {
    throw new QuotationError('VERSION_CONFLICT', '图片所属产品或源文件已变化，请重新扫描')
  }
  return { product, image }
}

async function lockRequest(transaction: Prisma.TransactionClient, requestId: string): Promise<void> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${operationKey(requestId)})::bigint)`
}

async function discardObject(storage: QuotationPrivateStorage, object: NewObject | undefined): Promise<void> {
  if (object) await storage.delete(object.objectKey).catch(() => undefined)
}

async function reconcile(input: ImageOptimizationInput, object: NewObject | undefined) {
  // Acquiring the same lock ensures the uncertain transaction has finished before absence is trusted.
  return prisma.$transaction(async (transaction) => {
    await lockRequest(transaction, input.requestId)
    const result = await readReplay(transaction, input)
    if (!object) return { result, canDelete: false }
    const [source, reference] = await Promise.all([
      transaction.quotationSourceFile.findUnique({ where: { id: object.id }, select: { id: true } }),
      transaction.quotationProductImage.findFirst({
        where: { OR: [{ sourceFileId: object.id }, { objectKey: object.objectKey }] }, select: { id: true },
      }),
    ])
    return { result, canDelete: !source && !reference && result?.sourceFileId !== object.id }
  }, { maxWait: 5_000, timeout: 10_000 })
}

export async function optimizeCommonProductImageSource(input: ImageOptimizationInput, actorId: string): Promise<ImageOptimizationResult> {
  const replay = await readReplay(prisma, input)
  if (replay) return replay
  const initial = await readTarget(prisma, input)
  const storage = getQuotationPrivateStorage()
  const initialMarkers = await readMarkers(prisma, [input.sourceFileId])
  const eligibility = classify(initial.image, initialMarkers, storage.provider)
  if (eligibility.status === 'unsupported') throw new QuotationError('VALIDATION_FAILED', eligibility.reason)
  const source = initial.image.sourceFile
  if (!source) throw new QuotationError('NOT_FOUND', '原始图片不存在，请重新扫描')

  let object: NewObject | undefined
  let callbackCompleted = false
  try {
    if (eligibility.status === 'pending') {
      const stored = await storage.get(source.objectKey, source.contentType, { maxBytes: MAX_OPTIMIZATION_INPUT_BYTES })
      if (
        stored.bytes.length !== source.sizeBytes || stored.sizeBytes !== source.sizeBytes
        || stored.contentType !== source.contentType || stored.sha256 !== source.sha256
        || createHash('sha256').update(stored.bytes).digest('hex') !== source.sha256
      ) throw new QuotationError('VALIDATION_FAILED', '图片内容与保存记录不一致，原图未修改，请重新上传')
      const image = await encodeCommonProductImage({ bytes: stored.bytes, contentType: source.contentType, displayName: source.displayName })
      if (image) {
        object = { id: randomUUID(), objectKey: quotationQuarantineKey(image.displayName), image }
        const written = await storage.put(object.objectKey, image.bytes, image.contentType)
        if (written.sha256 !== image.sha256 || written.sizeBytes !== image.sizeBytes || written.contentType !== image.contentType) {
          throw new QuotationError('VALIDATION_FAILED', '新图片写入校验失败，原图未修改')
        }
      }
    }

    const result = await prisma.$transaction(async (transaction) => {
      await lockRequest(transaction, input.requestId)
      const existing = await readReplay(transaction, input)
      if (existing) { callbackCompleted = true; return existing }
      // Row locks keep parent version and original metadata stable through the atomic switch.
      await transaction.$queryRaw<Array<{ id: string }>>`SELECT id FROM quotation_products WHERE id = ${input.productId} FOR UPDATE`
      await transaction.$queryRaw<Array<{ id: string }>>`SELECT id FROM quotation_source_files WHERE id = ${input.sourceFileId} FOR UPDATE`
      await transaction.$queryRaw<Array<{ id: string }>>`SELECT id FROM quotation_product_images WHERE id = ${input.imageId} AND quotation_product_id = ${input.productId} FOR UPDATE`
      const current = await readTarget(transaction, input)
      if (JSON.stringify(current.image) !== JSON.stringify(initial.image)) {
        throw new QuotationError('VERSION_CONFLICT', '图片或原始文件在处理期间已变化，请重新扫描')
      }
      const markers = await readMarkers(transaction, [input.sourceFileId])
      const status = classify(current.image, markers, storage.provider)
      if (status.status === 'unsupported') throw new QuotationError('VALIDATION_FAILED', status.reason)
      if (eligibility.status !== 'pending' && JSON.stringify([...markers]) !== JSON.stringify([...initialMarkers])) {
        throw new QuotationError('VERSION_CONFLICT', '图片处理记录已变化，请重新扫描')
      }

      let outcome: ImageOptimizationResult
      if (object && status.status === 'pending') {
        const updatedAt = new Date(Math.max(Date.now(), current.product.updatedAt.getTime() + 1))
        const updated = await transaction.quotationProduct.updateMany({
          where: { id: input.productId, updatedAt: new Date(input.expectedUpdatedAt) }, data: { updatedAt },
        })
        if (updated.count !== 1) throw new QuotationError('VERSION_CONFLICT', '产品已更新，请重新扫描')
        const metadata = {
          displayName: object.image.displayName, objectKey: object.objectKey, contentType: object.image.contentType,
          sizeBytes: object.image.sizeBytes, sha256: object.image.sha256,
        }
        await transaction.quotationSourceFile.create({ data: {
          id: object.id, ...metadata, originalFilename: object.image.displayName, storageProvider: storage.provider,
          salesQuotationId: null, securityStatus: 'CLEAN', uploadedBy: actorId,
        } })
        const changed = await transaction.quotationProductImage.updateMany({
          where: {
            id: current.image.id, quotationProductId: input.productId, sourceFileId: source.id,
            objectKey: current.image.objectKey, displayName: current.image.displayName, contentType: current.image.contentType,
            sizeBytes: current.image.sizeBytes, sha256: current.image.sha256,
            sortOrder: current.image.sortOrder, isCustomerVisible: current.image.isCustomerVisible,
          }, data: { ...metadata, sourceFileId: object.id },
        })
        if (changed.count !== 1) throw new QuotationError('VERSION_CONFLICT', '图片已变化，请重新扫描')
        const pinKey = `quotation.image-original.${source.id}`
        await transaction.setting.upsert({
          where: { key: pinKey },
          create: { key: pinKey, value: { version: 1, sourceFileId: source.id, sha256: source.sha256 } }, update: {},
        })
        await transaction.setting.create({ data: { key: derivedKey(object.id), value: {
          version: 1, originalSourceFileId: source.id, sourceFileId: object.id,
          originalSha256: source.sha256, sha256: object.image.sha256,
          beforeBytes: source.sizeBytes, afterBytes: object.image.sizeBytes,
        } } })
        outcome = {
          productId: input.productId, imageId: input.imageId, updatedAt: updatedAt.toISOString(), status: 'optimized',
          sourceFileId: object.id, originalSourceFileId: source.id, beforeBytes: source.sizeBytes, afterBytes: object.image.sizeBytes,
        }
      } else {
        if (status.status === 'pending') {
          await transaction.setting.create({ data: {
            key: checkedKey(source.id), value: { version: 1, sourceFileId: source.id, sha256: source.sha256 },
          } })
        }
        outcome = {
          productId: input.productId, imageId: input.imageId, updatedAt: input.expectedUpdatedAt, status: 'unchanged',
          sourceFileId: source.id, originalSourceFileId: status.originalSourceFileId || source.id,
          beforeBytes: source.sizeBytes, afterBytes: source.sizeBytes,
        }
      }
      outcome = imageOptimizationResultSchema.parse(outcome)
      await transaction.setting.create({ data: { key: operationKey(input.requestId), value: { version: 1, input: { ...input }, result: { ...outcome } } } })
      await writeQuotationAudit(transaction, {
        entityType: 'QuotationProduct', entityId: input.productId, action: 'UPDATE', actorId,
        metadata: {
          field: 'imageOptimization', profile: IMAGE_OPTIMIZATION_PROFILE, requestId: input.requestId,
          imageId: input.imageId, sourceFileId: outcome.sourceFileId, originalSourceFileId: outcome.originalSourceFileId,
          beforeBytes: outcome.beforeBytes, afterBytes: outcome.afterBytes, status: outcome.status,
        },
      })
      callbackCompleted = true
      return outcome
    }, { maxWait: 5_000, timeout: 15_000 })
    if (object && result.sourceFileId !== object.id) await discardObject(storage, object)
    return result
  } catch (error) {
    if (!callbackCompleted) {
      // The transaction callback did not finish, so this attempt cannot have committed.
      await discardObject(storage, object)
      throw error
    }
    let resolution: Awaited<ReturnType<typeof reconcile>>
    try {
      resolution = await reconcile(input, object)
    } catch {
      // Unknown commit outcomes retain the fresh object; never delete possibly committed data.
      throw new QuotationError('INTERNAL_ERROR', '图片优化结果暂时无法确认，请停止处理并重新扫描')
    }
    if (resolution.canDelete) await discardObject(storage, object)
    if (resolution.result) return resolution.result
    throw new QuotationError('INTERNAL_ERROR', '本次图片优化未确认完成，请重新扫描后检查')
  }
}
