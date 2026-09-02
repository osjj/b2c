import { z } from 'zod'

export const decimalStringSchema = z
  .string()
  .trim()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/, 'Enter a valid decimal number')
  .max(64)

export const nonNegativeDecimalStringSchema = decimalStringSchema.refine(
  (value) => !value.startsWith('-'),
  'Value cannot be negative',
)

export const positiveDecimalStringSchema = nonNegativeDecimalStringSchema.refine(
  (value) => !/^0(?:\.0+)?$/.test(value),
  'Value must be greater than zero',
)

function hasMaximumScale(value: string, scale: number): boolean {
  return (value.split('.')[1]?.length ?? 0) <= scale
}

function isZeroDecimal(value: string): boolean {
  return /^0(?:\.0+)?$/.test(value)
}

const quantityDecimalStringSchema = positiveDecimalStringSchema.refine(
  (value) => hasMaximumScale(value, 4),
  'Quantity supports at most 4 decimal places',
)
const moneyDecimalStringSchema = nonNegativeDecimalStringSchema.refine(
  (value) => hasMaximumScale(value, 6),
  'Money supports at most 6 decimal places',
)
const signedMoneyDecimalStringSchema = decimalStringSchema.refine(
  (value) => hasMaximumScale(value, 6),
  'Money supports at most 6 decimal places',
)
const percentageDecimalStringSchema = nonNegativeDecimalStringSchema
  .refine((value) => hasMaximumScale(value, 6), 'Percentage supports at most 6 decimal places')
  .refine((value) => Number(value) <= 100, 'Percentage cannot exceed 100')
const exchangeRateDecimalStringSchema = positiveDecimalStringSchema.refine(
  (value) => hasMaximumScale(value, 8),
  'Exchange rate supports at most 8 decimal places',
)

export const currencySchema = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/)
export const quotationLanguageSchema = z.enum(['CHINESE', 'ENGLISH', 'BILINGUAL'])
export const quotationProductStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE'])
export const quotationRevisionStateSchema = z.enum([
  'DRAFT',
  'READY',
  'FINALIZING',
  'FINALIZED',
  'ISSUED',
  'SUPERSEDED',
  'VOID',
])
export const quotationRoundingModeSchema = z.enum(['HALF_UP', 'HALF_EVEN', 'DOWN', 'UP'])

export const customerContactInputSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(1).max(160),
  title: z.string().trim().max(160).nullish(),
  email: z.string().trim().email().max(320).nullish(),
  phone: z.string().trim().max(80).nullish(),
  isPrimary: z.boolean().default(false),
})

const businessCustomerBaseSchema = z.object({
  companyName: z.string().trim().min(1).max(240),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).nullish(),
  email: z.string().trim().email().max(320).nullish(),
  phone: z.string().trim().max(80).nullish(),
  address: z.string().trim().max(4000).nullish(),
  notes: z.string().trim().max(10000).nullish(),
  isActive: z.boolean().default(true),
  contacts: z.array(customerContactInputSchema).max(20).default([]),
})

function validatePrimaryCustomerContact(
  value: z.infer<typeof businessCustomerBaseSchema>,
  context: z.RefinementCtx,
): void {
  if (value.contacts.filter((contact) => contact.isPrimary).length > 1) {
    context.addIssue({ code: 'custom', path: ['contacts'], message: 'Only one primary contact is allowed' })
  }
}

export const createBusinessCustomerInputSchema = businessCustomerBaseSchema
  .superRefine(validatePrimaryCustomerContact)

export const updateBusinessCustomerInputSchema = businessCustomerBaseSchema
  .extend({ id: z.string().cuid() })
  .superRefine(validatePrimaryCustomerContact)

export const businessCustomerInputSchema = businessCustomerBaseSchema
  .extend({ id: z.string().cuid().optional() })
  .superRefine(validatePrimaryCustomerContact)

const optionalString = z.string().trim().max(500).nullish()

const quotationProductBaseSchema = z.object({
  productId: z.string().cuid().nullish(),
  nameZh: z.string().trim().max(500).nullish(),
  nameEn: z.string().trim().max(500).nullish(),
  sku: optionalString,
  model: optionalString,
  unit: z.string().trim().min(1).max(40).default('pcs'),
  moq: positiveDecimalStringSchema.nullish(),
  specifications: z.array(z.string().trim().min(1).max(1000)).max(100).default([]),
  standards: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  certificates: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  internalNotes: z.string().trim().max(10000).nullish(),
  status: quotationProductStatusSchema.default('DRAFT'),
})

const quotationProductNameRefinement = {
  message: 'At least one Chinese or English name is required',
  path: ['nameEn'],
}

function hasQuotationProductName(value: z.infer<typeof quotationProductBaseSchema>): boolean {
  return Boolean(value.nameZh || value.nameEn)
}

export const createQuotationProductInputSchema = quotationProductBaseSchema
  .refine(hasQuotationProductName, quotationProductNameRefinement)

export const updateQuotationProductInputSchema = quotationProductBaseSchema
  .extend({ id: z.string().cuid() })
  .refine(hasQuotationProductName, quotationProductNameRefinement)

export const quotationProductInputSchema = quotationProductBaseSchema
  .extend({ id: z.string().cuid().optional() })
  .refine(hasQuotationProductName, quotationProductNameRefinement)

export const quotationProductCostInputSchema = z.object({
  quotationProductId: z.string().cuid(),
  amount: moneyDecimalStringSchema,
  currency: currencySchema,
  exchangeRate: exchangeRateDecimalStringSchema.nullish(),
  effectiveAt: z.coerce.date(),
  notes: z.string().trim().max(4000).nullish(),
})

export const quotationItemInputSchema = z
  .object({
    id: z.string().cuid().optional(),
    quotationProductId: z.string().cuid().nullish(),
    productId: z.string().cuid().nullish(),
    sortOrder: z.number().int().min(0).max(10000),
    nameZh: z.string().trim().max(500).nullish(),
    nameEn: z.string().trim().max(500).nullish(),
    model: optionalString,
    sku: optionalString,
    specifications: z.array(z.string().trim().min(1).max(1000)).max(100).default([]),
    unit: z.string().trim().min(1).max(40),
    quantity: quantityDecimalStringSchema,
    unitPrice: moneyDecimalStringSchema,
    discountAmount: moneyDecimalStringSchema.default('0'),
    discountPercent: percentageDecimalStringSchema.nullish(),
    unitCost: moneyDecimalStringSchema.nullish(),
    costCurrency: currencySchema.nullish(),
    exchangeRate: exchangeRateDecimalStringSchema.nullish(),
    internalNotes: z.string().trim().max(10000).nullish(),
  })
  .superRefine((value, context) => {
    if (value.quotationProductId && value.productId) {
      context.addIssue({
        code: 'custom',
        message: 'A line can reference at most one product source',
        path: ['productId'],
      })
    }
    if (!value.nameZh && !value.nameEn) {
      context.addIssue({
        code: 'custom',
        message: 'At least one line name is required',
        path: ['nameEn'],
      })
    }
    if (value.discountPercent && !isZeroDecimal(value.discountAmount)) {
      context.addIssue({
        code: 'custom',
        message: 'Fixed and percentage line discounts are mutually exclusive',
        path: ['discountPercent'],
      })
    }
    if ((value.unitCost && !value.costCurrency) || (!value.unitCost && value.costCurrency)) {
      context.addIssue({
        code: 'custom',
        message: 'Cost and cost currency must be supplied together',
        path: ['costCurrency'],
      })
    }
  })

export const createSalesQuotationInputSchema = z.object({
  customerId: z.string().cuid(),
  quotationDate: z.coerce.date(),
  validUntil: z.coerce.date().nullish(),
  documentLanguage: quotationLanguageSchema.default('ENGLISH'),
  currency: currencySchema,
  currencyMinorUnit: z.number().int().min(0).max(4).default(2),
  roundingMode: quotationRoundingModeSchema.default('HALF_UP'),
  publicTerms: z.record(z.string(), z.string().max(4000)).default({}),
  internalNotes: z.string().trim().max(10000).nullish(),
  discountAmount: moneyDecimalStringSchema.default('0'),
  discountPercent: percentageDecimalStringSchema.nullish(),
  shippingFee: moneyDecimalStringSchema.default('0'),
  otherFee: moneyDecimalStringSchema.default('0'),
  taxRate: percentageDecimalStringSchema.default('0'),
  roundingAdjustment: signedMoneyDecimalStringSchema.default('0'),
  items: z.array(quotationItemInputSchema).min(1).max(500),
})
.superRefine((value, context) => {
  if (value.discountPercent && !isZeroDecimal(value.discountAmount)) {
    context.addIssue({
      code: 'custom',
      message: 'Fixed and percentage quotation discounts are mutually exclusive',
      path: ['discountPercent'],
    })
  }
  if (value.validUntil && value.validUntil < value.quotationDate) {
    context.addIssue({
      code: 'custom',
      message: 'Validity date cannot be before quotation date',
      path: ['validUntil'],
    })
  }
})

export const updateSalesQuotationInputSchema = createSalesQuotationInputSchema.extend({
  revisionId: z.string().cuid(),
  expectedVersion: z.number().int().positive(),
})

export const transitionRevisionInputSchema = z.object({
  revisionId: z.string().cuid(),
  expectedVersion: z.number().int().positive(),
  targetState: quotationRevisionStateSchema,
})

export const finalizeQuotationInputSchema = z.object({
  revisionId: z.string().cuid(),
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(16).max(160).regex(/^[A-Za-z0-9._:-]+$/),
})

export const copyQuotationRevisionInputSchema = z.object({
  revisionId: z.string().cuid(),
  expectedVersion: z.number().int().positive(),
})

export const copyQuotationToCustomerInputSchema = copyQuotationRevisionInputSchema.extend({
  customerId: z.string().cuid(),
})

export const voidAndCopyQuotationRevisionInputSchema = copyQuotationRevisionInputSchema.extend({
  reason: z.string().trim().min(1).max(2000),
})

export const setQuotationOutcomeInputSchema = z.object({
  revisionId: z.string().cuid(),
  expectedVersion: z.number().int().positive(),
  outcomeStatus: z.enum(['ACCEPTED', 'REJECTED', 'CANCELLED']),
  note: z.string().trim().max(2000).nullish(),
})

export const attachQuotationItemAssetInputSchema = z.object({
  itemId: z.string().cuid(),
  sourceFileId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  assetType: z.literal('PRODUCT_IMAGE').default('PRODUCT_IMAGE'),
  displayName: z.string().trim().max(240).nullish(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export const reconcileFinalizingInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
})

export const paginationInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).default(''),
})

export type BusinessCustomerInput = z.infer<typeof businessCustomerInputSchema>
export type QuotationProductInput = z.infer<typeof quotationProductInputSchema>
export type QuotationProductCostInput = z.infer<typeof quotationProductCostInputSchema>
export type QuotationItemInput = z.infer<typeof quotationItemInputSchema>
export type CreateSalesQuotationInput = z.infer<typeof createSalesQuotationInputSchema>
export type UpdateSalesQuotationInput = z.infer<typeof updateSalesQuotationInputSchema>
export type FinalizeQuotationInput = z.infer<typeof finalizeQuotationInputSchema>
