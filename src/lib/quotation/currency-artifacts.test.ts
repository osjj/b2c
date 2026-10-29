import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'
import test from 'node:test'

import ExcelJS from 'exceljs'

import { generateCustomerExcel } from './artifacts/excel'
import { generateCustomerPdf } from './artifacts/pdf'
import { buildCanonicalSnapshot, stableSnapshotJson } from './artifacts/snapshot'
import { convertQuotationCurrency } from './currency-conversion'
import { quotationCurrencyMetadata } from './currency-metadata'
import { JORDAN_TEMPLATE_VERSION } from './jordan-layout'
import { calculateQuotationMoney } from './money'
import { quotationLayoutHash } from './services/ai-layout'
import { blankQuotation, toQuotationInput } from './simple-input'
import { defaultWorkbenchSettings } from './workbench-config'

// The English fixtures use ordinary PDF text operators. Inspect the actual page
// streams after decompression rather than counting only a valid PDF header.
function pdfPageContent(pdf: Buffer): string {
  const streams = [...pdf.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
  assert.ok(streams.length > 0)
  return streams.map((match) => {
    const bytes = Buffer.from(match[1], 'latin1')
    try { return inflateSync(bytes).toString('latin1') } catch { return bytes.toString('latin1') }
  }).join('\n')
}

for (const templateVersion of ['stage-a-v1', JORDAN_TEMPLATE_VERSION]) {
  test(`${templateVersion} customer PDF and Excel use converted CNY amounts and exclude the internal rate`, async () => {
    // An eight-place rate acts as a sentinel that cannot be confused with a
    // rounded customer amount in the generated customer documents.
    const rate = '7.23456789'
    const original = blankQuotation(defaultWorkbenchSettings)
    original.customerName = 'Currency Artifact Buyer'
    original.quotationDate = '2026-10-28'
    original.shippingFee = '3'
    original.discountAmount = '1'
    original.otherFee = '2'
    original.items[0] = { ...original.items[0], name: 'Work gloves', quantity: '2', unitPrice: '10', unitCost: '6' }
    const input = toQuotationInput(convertQuotationCurrency(original, 'CNY', rate))
    const money = calculateQuotationMoney(input)
    const snapshot = buildCanonicalSnapshot({
      revisionNumber: 1,
      documentLanguage: input.documentLanguage,
      templateVersion,
      quotationDate: input.quotationDate,
      validUntil: null,
      currency: input.currency,
      currencyMinorUnit: input.currencyMinorUnit,
      roundingMode: input.roundingMode,
      customerSnapshot: { companyName: input.customerName, contacts: [], ...quotationCurrencyMetadata(input.usdToCnyRate) },
      publicTerms: input.publicTerms,
      subtotal: money.subtotal,
      discountAmount: money.discountAmount,
      shippingFee: money.shippingFee,
      otherFee: money.otherFee,
      taxRate: input.taxRate,
      taxAmount: money.taxAmount,
      roundingAdjustment: money.roundingAdjustment,
      total: money.total,
      salesQuotation: { quotationNumber: 'QT-CNY-ARTIFACT' },
      items: money.items.map((item, index) => ({
        id: `fixture-${index}`, sortOrder: index,
        nameZh: item.nameZh ?? null, nameEn: item.nameEn ?? null,
        model: item.model ?? null, sku: item.sku ?? null,
        specifications: item.specifications, unit: item.unit,
        quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal,
      })),
    })
    if (templateVersion === JORDAN_TEMPLATE_VERSION) {
      // A stored, validated deterministic layout exercises the formal renderer
      // without invoking an AI service.
      snapshot.layout = {
        version: '1', model: 'currency-artifact-fixture', inputHash: quotationLayoutHash(snapshot),
        items: [{ position: 1, imageColumns: 1, labelLengths: [], noteIndices: [] }],
      }
    }

    const [pdf, excel] = await Promise.all([
      generateCustomerPdf(snapshot, { configuredPath: '', systemPaths: [] }),
      generateCustomerExcel(snapshot),
    ])
    assert.equal(pdf.subarray(0, 4).toString('ascii'), '%PDF')
    const pdfText = pdfPageContent(pdf)
    assert.ok(pdfText.includes('CNY'))
    assert.ok(pdfText.includes('72.345679'))
    assert.ok(pdfText.includes('144.69'))
    assert.ok(pdfText.includes('173.63'))

    const book = new ExcelJS.Workbook()
    await book.xlsx.load(excel as unknown as ExcelJS.Buffer)
    const sheet = book.getWorksheet('Quotation')
    assert.ok(sheet)
    const cells: string[] = []
    sheet.eachRow((row) => row.eachCell((cell) => { if (cell.value != null) cells.push(cell.text) }))
    const excelText = cells.join('\n')
    assert.ok(excelText.includes('CNY'))
    for (const amount of ['72.345679', '144.69', '7.23', '21.70', '14.47', '173.63']) {
      assert.ok(cells.includes(amount), `Customer Excel is missing converted amount ${amount}`)
    }
    for (const customerOutput of [stableSnapshotJson(snapshot).toString('utf8'), pdfText, excelText]) {
      for (const internal of [rate, 'usdToCnyRate', 'quotationCurrency', 'unitCost', 'USD']) {
        assert.equal(customerOutput.includes(internal), false, `Customer artifact contains ${internal}`)
      }
    }
  })
}
