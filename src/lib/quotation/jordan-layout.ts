import { z } from 'zod'

export const JORDAN_TEMPLATE_VERSION = 'jordan-ai-v1'
export const JORDAN_REFERENCE = {
  filename: 'Yuelaifa_PPE_Quotation_Jordan_20260831_USD_Price_Updated.pdf',
  sha256: '76ab50f3ee0ff9f1d0925d79e3bcb849d300d553cc17ecb84f48869a81743bd2',
  pages: 7,
  pageSize: 'A4 landscape',
} as const

// The model can select formatting only. No generated product or commercial text.
export const jordanItemLayoutSchema = z.object({
  position: z.number().int().positive(),
  imageColumns: z.union([z.literal(1), z.literal(2)]),
  labelLengths: z.array(z.number().int().min(0).max(80)).max(100),
  noteIndices: z.array(z.number().int().min(0).max(99)).max(2),
}).strict()
export const jordanLayoutSchema = z.object({
  version: z.literal('1'),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  model: z.string().min(1).max(100),
  items: z.array(jordanItemLayoutSchema).max(100),
}).strict()
export type JordanLayout = z.infer<typeof jordanLayoutSchema>
