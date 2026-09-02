import ExcelJS from 'exceljs'

import type { QuotationSnapshot } from './snapshot'

function cellText(value: string | null): string {
  if (!value) return ''
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

function displayName(snapshot: QuotationSnapshot, item: QuotationSnapshot['items'][number]): string {
  if (snapshot.language === 'CHINESE') return item.nameZh ?? item.nameEn ?? ''
  if (snapshot.language === 'ENGLISH') return item.nameEn ?? item.nameZh ?? ''
  return [item.nameEn, item.nameZh].filter(Boolean).join(' / ')
}

function label(snapshot: QuotationSnapshot, chinese: string, english: string): string {
  if (snapshot.language === 'CHINESE') return chinese
  if (snapshot.language === 'BILINGUAL') return `${chinese} / ${english}`
  return english
}

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
  row.alignment = { vertical: 'middle', wrapText: true }
}

export async function generateCustomerExcel(snapshot: QuotationSnapshot): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LAIFAPPE Quotation Workbench'
  const sheet = workbook.addWorksheet('Quotation', { views: [{ state: 'frozen', ySplit: 8 }] })
  const contact = snapshot.customer.contact
  sheet.addRows([
    [label(snapshot, '报价单', 'QUOTATION'), snapshot.quotation.number],
    [label(snapshot, '版本', 'Revision'), snapshot.quotation.revision],
    [label(snapshot, '日期', 'Date'), snapshot.quotation.date],
    [label(snapshot, '有效期至', 'Valid Until'), snapshot.quotation.validUntil ?? ''],
    [label(snapshot, '客户', 'Customer'), cellText(snapshot.customer.companyName)],
    [label(snapshot, '联系人', 'Contact'), cellText(contact ? [contact.name, contact.email, contact.phone].filter(Boolean).join(' / ') : '')],
    [label(snapshot, '币种', 'Currency'), snapshot.money.currency],
    [
      label(snapshot, '序号', 'No.'), label(snapshot, '产品', 'Product'), label(snapshot, '型号/SKU', 'Model/SKU'),
      label(snapshot, '规格', 'Specifications'), label(snapshot, '确认图片', 'Approved Images'), label(snapshot, '数量', 'Qty'),
      label(snapshot, '单位', 'Unit'), label(snapshot, '单价', 'Unit Price'), label(snapshot, '金额', 'Line Total'),
    ],
  ])
  styleHeader(sheet.getRow(8))
  for (const item of snapshot.items) {
    const row = sheet.addRow([
      item.position,
      cellText(displayName(snapshot, item)),
      cellText([item.model, item.sku].filter(Boolean).join(' / ')),
      cellText(item.specifications.map((entry) => `• ${entry}`).join('\n')),
      '',
      item.quantity,
      cellText(item.unit),
      item.unitPrice,
      item.lineTotal,
    ])
    row.alignment = { vertical: 'top', wrapText: true }
    const imageRows = Math.max(1, Math.ceil(item.images.length / 3))
    row.height = Math.max(42, imageRows * 42)
    item.images.forEach((image, imageIndex) => {
      const extension = image.contentType === 'image/jpeg' ? 'jpeg' : 'png'
      const imageId = workbook.addImage({ base64: image.dataUrl, extension })
      const columnOffset = (imageIndex % 3) * 0.42
      const rowOffset = Math.floor(imageIndex / 3) * (40 / row.height)
      sheet.addImage(imageId, {
        tl: { col: 4 + columnOffset, row: row.number - 1 + rowOffset },
        ext: { width: 38, height: 38 },
        editAs: 'oneCell',
      })
    })
  }
  sheet.addRow([])
  for (const [totalLabel, value] of [
    [label(snapshot, '小计', 'Subtotal'), snapshot.money.subtotal],
    [label(snapshot, '折扣', 'Discount'), snapshot.money.discount],
    [label(snapshot, '运费', 'Shipping'), snapshot.money.shipping],
    [label(snapshot, '其他费用', 'Other Fee'), snapshot.money.otherFee],
    [label(snapshot, '税费', 'Tax'), snapshot.money.tax],
    [label(snapshot, '舍入调整', 'Rounding'), snapshot.money.roundingAdjustment],
    [`${label(snapshot, '合计', 'Total')} (${snapshot.money.currency})`, snapshot.money.total],
  ]) sheet.addRow(['', '', '', '', '', '', '', totalLabel, value])
  sheet.addRow([])
  sheet.addRow([label(snapshot, '公开条款', 'Public Terms')]).font = { bold: true }
  Object.entries(snapshot.terms).forEach(([key, value]) => sheet.addRow([cellText(key), cellText(value)]))
  sheet.columns = [6, 36, 22, 56, 20, 12, 10, 16, 18].map((width) => ({ width }))
  sheet.eachRow((row) => row.eachCell((cell) => {
    cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'top' }
  }))
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export type InternalValuationInput = {
  quotationNumber: string
  revisionNumber: number
  currency: string
  total: string
  totalCost: string | null
  profit: string | null
  items: Array<{
    position: number
    name: string
    quantity: string
    unitPrice: string
    lineTotal: string
    unitCost: string | null
    costCurrency: string | null
    exchangeRate: string | null
    lineCost: string | null
    internalNotes: string | null
  }>
}

/** Generates a separate ADMIN-only workbook. Never pass this data to a customer artifact. */
export async function generateInternalValuationExcel(input: InternalValuationInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('INTERNAL Valuation')
  sheet.addRows([
    ['INTERNAL - CONFIDENTIAL VALUATION'],
    ['Quotation', cellText(input.quotationNumber)],
    ['Revision', input.revisionNumber],
    ['Sales Currency', input.currency],
    [],
    ['No.', 'Product', 'Qty', 'Unit Price', 'Line Total', 'Unit Cost', 'Cost Currency', 'Exchange Rate', 'Line Cost', 'Internal Notes'],
  ])
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFB91C1C' }, size: 16 }
  styleHeader(sheet.getRow(6))
  input.items.forEach((item) => sheet.addRow([
    item.position,
    cellText(item.name),
    item.quantity,
    item.unitPrice,
    item.lineTotal,
    item.unitCost ?? '',
    item.costCurrency ?? '',
    item.exchangeRate ?? '',
    item.lineCost ?? '',
    cellText(item.internalNotes),
  ]))
  sheet.addRow([])
  sheet.addRow(['', '', '', '', 'Sales Total', input.total])
  sheet.addRow(['', '', '', '', 'Total Cost', input.totalCost ?? 'N/A'])
  sheet.addRow(['', '', '', '', 'Profit', input.profit ?? 'N/A'])
  sheet.columns = [6, 38, 12, 16, 18, 16, 14, 16, 18, 42].map((width) => ({ width }))
  sheet.eachRow((row) => row.eachCell((cell) => {
    cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'top' }
  }))
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
