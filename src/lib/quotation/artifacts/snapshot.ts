import { z } from 'zod'

import { assertCustomerProjectionSafe } from '../visibility'

const nullableText = z.string().nullable()

export const quotationSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0'),
  templateVersion: z.string(),
  language: z.enum(['CHINESE', 'ENGLISH', 'BILINGUAL']),
  quotation: z.object({
    number: z.string(),
    revision: z.number().int().positive(),
    date: z.string(),
    validUntil: z.string().nullable(),
  }),
  customer: z.object({
    companyName: z.string(),
    countryCode: nullableText,
    email: nullableText,
    phone: nullableText,
    address: nullableText,
    contact: z.object({ name: z.string(), title: nullableText, email: nullableText, phone: nullableText }).nullable(),
  }),
  money: z.object({
    currency: z.string().length(3),
    minorUnit: z.number().int().min(0).max(4),
    roundingMode: z.enum(['HALF_UP', 'HALF_EVEN', 'DOWN', 'UP']),
    subtotal: z.string(),
    discount: z.string(),
    shipping: z.string(),
    otherFee: z.string(),
    taxRate: z.string(),
    tax: z.string(),
    roundingAdjustment: z.string(),
    total: z.string(),
  }),
  terms: z.record(z.string(), z.string()),
  items: z.array(z.object({
    position: z.number().int().positive(),
    nameZh: nullableText,
    nameEn: nullableText,
    model: nullableText,
    sku: nullableText,
    specifications: z.array(z.string()),
    unit: z.string(),
    quantity: z.string(),
    unitPrice: z.string(),
    lineTotal: z.string(),
    images: z.array(z.object({
      contentType: z.enum(['image/jpeg', 'image/png']),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      dataUrl: z.string().regex(/^data:image\/(?:jpeg|png);base64,/),
    })).max(8),
  })),
})

export type QuotationSnapshot = z.infer<typeof quotationSnapshotSchema>

type RevisionForSnapshot = {
  revisionNumber: number
  documentLanguage: 'CHINESE' | 'ENGLISH' | 'BILINGUAL'
  templateVersion: string
  quotationDate: Date
  validUntil: Date | null
  currency: string
  currencyMinorUnit: number
  roundingMode: 'HALF_UP' | 'HALF_EVEN' | 'DOWN' | 'UP'
  customerSnapshot: unknown
  publicTerms: unknown
  subtotal: { toString(): string }
  discountAmount: { toString(): string }
  shippingFee: { toString(): string }
  otherFee: { toString(): string }
  taxRate: { toString(): string }
  taxAmount: { toString(): string }
  roundingAdjustment: { toString(): string }
  total: { toString(): string }
  salesQuotation: { quotationNumber: string }
  items: Array<{
    id: string
    sortOrder: number
    nameZh: string | null
    nameEn: string | null
    model: string | null
    sku: string | null
    specifications: unknown
    unit: string
    quantity: { toString(): string }
    unitPrice: { toString(): string }
    lineTotal: { toString(): string }
  }>
}

const customerSourceSchema = z.object({
  companyName: z.string(),
  countryCode: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  contacts: z.array(z.object({
    name: z.string(),
    title: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    isPrimary: z.boolean().optional(),
  })).default([]),
})

export type SnapshotImage = {
  itemId: string
  contentType: 'image/jpeg' | 'image/png'
  sha256: string
  bytes: Buffer
}

export function buildCanonicalSnapshot(
  revision: RevisionForSnapshot,
  selectedImages: readonly SnapshotImage[] = [],
): QuotationSnapshot {
  const customer = customerSourceSchema.parse(revision.customerSnapshot)
  const contact = customer.contacts.find((entry) => entry.isPrimary) ?? customer.contacts[0] ?? null
  const terms = z.record(z.string(), z.string()).catch({}).parse(revision.publicTerms)
  const snapshot: QuotationSnapshot = {
    schemaVersion: '1.0',
    templateVersion: revision.templateVersion,
    language: revision.documentLanguage,
    quotation: {
      number: revision.salesQuotation.quotationNumber,
      revision: revision.revisionNumber,
      date: revision.quotationDate.toISOString().slice(0, 10),
      validUntil: revision.validUntil?.toISOString().slice(0, 10) ?? null,
    },
    customer: {
      companyName: customer.companyName,
      countryCode: customer.countryCode ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
      address: customer.address ?? null,
      contact: contact
        ? { name: contact.name, title: contact.title ?? null, email: contact.email ?? null, phone: contact.phone ?? null }
        : null,
    },
    money: {
      currency: revision.currency,
      minorUnit: revision.currencyMinorUnit,
      roundingMode: revision.roundingMode,
      subtotal: revision.subtotal.toString(),
      discount: revision.discountAmount.toString(),
      shipping: revision.shippingFee.toString(),
      otherFee: revision.otherFee.toString(),
      taxRate: revision.taxRate.toString(),
      tax: revision.taxAmount.toString(),
      roundingAdjustment: revision.roundingAdjustment.toString(),
      total: revision.total.toString(),
    },
    terms,
    items: revision.items.map((item, index) => ({
      position: index + 1,
      nameZh: item.nameZh,
      nameEn: item.nameEn,
      model: item.model,
      sku: item.sku,
      specifications: z.array(z.string()).catch([]).parse(item.specifications),
      unit: item.unit,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      lineTotal: item.lineTotal.toString(),
      images: selectedImages
        .filter((image) => image.itemId === item.id)
        .map((image) => ({
          contentType: image.contentType,
          sha256: image.sha256,
          dataUrl: `data:${image.contentType};base64,${image.bytes.toString('base64')}`,
        })),
    })),
  }
  quotationSnapshotSchema.parse(snapshot)
  assertCustomerProjectionSafe(snapshot)
  return snapshot
}

export function stableSnapshotJson(snapshot: QuotationSnapshot): Buffer {
  quotationSnapshotSchema.parse(snapshot)
  return Buffer.from(`${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
}
