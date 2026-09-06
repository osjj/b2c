import { createHash } from 'node:crypto'

import ExcelJS from 'exceljs'

import { QuotationError } from '../errors'
import { assertCustomerProjectionSafe } from '../visibility'
import { quotationSnapshotSchema, type QuotationSnapshot } from './snapshot'

export function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export async function validateGeneratedArtifacts(input: {
  snapshot: QuotationSnapshot
  snapshotJson: Buffer
  pdf: Buffer
  excel: Buffer
  internalExcel: Buffer
}): Promise<void> {
  quotationSnapshotSchema.parse(input.snapshot)
  assertCustomerProjectionSafe(input.snapshot)
  const restored = quotationSnapshotSchema.parse(JSON.parse(input.snapshotJson.toString('utf8')))
  if (restored.quotation.number !== input.snapshot.quotation.number || restored.money.total !== input.snapshot.money.total) {
    throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Snapshot identifiers or totals changed')
  }
  if (input.pdf.length < 100 || input.pdf.subarray(0, 4).toString('ascii') !== '%PDF') {
    throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Generated PDF is invalid')
  }
  const pdfSource = input.pdf.toString('latin1')
  if ((pdfSource.match(/\/Type\s*\/Page\b/g) ?? []).length < 1) {
    throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Generated PDF has no pages')
  }
  const brandedExcel = ['jordan-ai-v1', 'presentation-v2'].includes(input.snapshot.templateVersion)
  const brandImages = brandedExcel ? [input.snapshot.brand?.logo, input.snapshot.brand?.seal].filter((image) => image !== undefined) : []
  const uniqueApprovedImages = new Set([...input.snapshot.items.flatMap((item) => item.images.map((image) => image.sha256)), ...brandImages.map((image) => image.sha256)]).size
  if ((pdfSource.match(/\/Subtype\s*\/Image\b/g) ?? []).length < uniqueApprovedImages) {
    throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Generated PDF is missing approved customer images')
  }
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(input.excel as unknown as ExcelJS.Buffer)
  const quotationSheet = workbook.getWorksheet('Quotation')
  if (!quotationSheet) {
    throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Generated Excel quotation sheet is missing')
  }
  const customerCells: string[] = []
  quotationSheet.eachRow((row) => row.eachCell((cell) => { if (cell.value != null) customerCells.push(cell.text) }))
  const customerWorkbookText = customerCells.join('\n')
  for (const expected of [
    input.snapshot.quotation.number,
    input.snapshot.customer.companyName,
    input.snapshot.money.currency,
    input.snapshot.money.total,
  ]) {
    if (!customerWorkbookText.includes(expected)) {
      throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Generated Excel is missing locked quotation data')
    }
  }
  const expectedImageCount = input.snapshot.items.reduce((count, item) => count + item.images.length, 0) + brandImages.length
  if (quotationSheet.getImages().length !== expectedImageCount) {
    throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Generated Excel is missing approved customer images')
  }
  for (const brandImage of brandImages) {
    const found = quotationSheet.getImages().some((drawing) => {
      const embedded = workbook.getImage(Number(drawing.imageId))
      const bytes = embedded.buffer ? Buffer.from(embedded.buffer) : embedded.base64 ? Buffer.from(embedded.base64.replace(/^data:[^;]+;base64,/, ''), 'base64') : undefined
      return bytes && sha256(bytes) === brandImage.sha256
    })
    if (!found) throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Generated Excel is missing the configured company Logo or seal')
  }
  const internalWorkbook = new ExcelJS.Workbook()
  await internalWorkbook.xlsx.load(input.internalExcel as unknown as ExcelJS.Buffer)
  const internalSheet = internalWorkbook.getWorksheet('INTERNAL Valuation')
  if (!internalSheet) {
    throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Internal valuation Excel sheet is missing')
  }
  const internalText = JSON.stringify(internalSheet.getSheetValues())
  if (!internalText.includes('INTERNAL - CONFIDENTIAL VALUATION')) {
    throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Internal valuation Excel is not visibly marked INTERNAL')
  }
}
