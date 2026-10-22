import { z } from 'zod'

const sourceFileIdSchema = z.union([z.string().uuid(), z.string().cuid()])

export const imageOptimizationScanInputSchema = z.object({
  cursor: z.string().cuid().optional(),
}).strict()

export const imageOptimizationInputSchema = z.object({
  requestId: z.string().uuid(),
  productId: z.string().cuid(),
  imageId: z.string().cuid(),
  sourceFileId: sourceFileIdSchema,
  expectedUpdatedAt: z.string().datetime(),
}).strict()

export const imageOptimizationImageSchema = z.object({
  id: z.string().cuid(),
  sourceFileId: sourceFileIdSchema.nullable(),
  name: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  status: z.enum(['pending', 'small', 'optimized', 'unchanged', 'unsupported']),
  reason: z.string(),
  originalSourceFileId: sourceFileIdSchema.nullable(),
})

export const imageOptimizationProductSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  updatedAt: z.string().datetime(),
  images: z.array(imageOptimizationImageSchema),
})

export const imageOptimizationScanResultSchema = z.object({
  products: z.array(imageOptimizationProductSchema),
  nextCursor: z.string().cuid().nullable(),
})

export const imageOptimizationResultSchema = z.object({
  productId: z.string().cuid(),
  imageId: z.string().cuid(),
  updatedAt: z.string().datetime(),
  status: z.enum(['optimized', 'unchanged']),
  sourceFileId: sourceFileIdSchema,
  originalSourceFileId: sourceFileIdSchema,
  beforeBytes: z.number().int().positive(),
  afterBytes: z.number().int().positive(),
})

export type ImageOptimizationInput = z.infer<typeof imageOptimizationInputSchema>
export type ImageOptimizationImage = z.infer<typeof imageOptimizationImageSchema>
export type ImageOptimizationProduct = z.infer<typeof imageOptimizationProductSchema>
export type ImageOptimizationResult = z.infer<typeof imageOptimizationResultSchema>
export type ImageOptimizationScanResult = z.infer<typeof imageOptimizationScanResultSchema>
