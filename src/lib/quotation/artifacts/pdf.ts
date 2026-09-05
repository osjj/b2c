import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { configureQuotationPdfFont, type PdfFontOptions } from './pdf-font'
import type { QuotationSnapshot } from './snapshot'
import { generatePresentationPdf } from './presentation-pdf'

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

export async function generateCustomerPdf(snapshot: QuotationSnapshot, fontOptions?: PdfFontOptions, preview = false): Promise<Buffer> {
  if (snapshot.templateVersion === 'presentation-v2') return generatePresentationPdf(snapshot, fontOptions, preview)
  // These exact strings are both inspected for glyph coverage and rendered below.
  const heading = [
    { text: label(snapshot, '报价单', 'QUOTATION'), x: 40, y: 48, size: 18 },
    { text: `${label(snapshot, '编号', 'No.')}: ${snapshot.quotation.number}  ${label(snapshot, '版本', 'Rev')}: ${snapshot.quotation.revision}`, x: 40, y: 70, size: 10 },
    { text: `${label(snapshot, '日期', 'Date')}: ${snapshot.quotation.date}`, x: 40, y: 86, size: 10 },
    { text: `${label(snapshot, '客户', 'Customer')}: ${snapshot.customer.companyName}`, x: 40, y: 102, size: 10 },
    ...(snapshot.quotation.validUntil ? [{ text: `${label(snapshot, '有效期至', 'Valid until')}: ${snapshot.quotation.validUntil}`, x: 360, y: 86, size: 10 }] : []),
    ...(snapshot.customer.contact ? [{ text: `${label(snapshot, '联系人', 'Contact')}: ${snapshot.customer.contact.name}`, x: 40, y: 118, size: 10 }] : []),
  ]
  const head = [[
      label(snapshot, '序号', 'No.'), label(snapshot, '图片', 'Image'), label(snapshot, '产品', 'Product'),
      label(snapshot, '型号 / SKU', 'Model / SKU'), label(snapshot, '规格', 'Specifications'), label(snapshot, '数量', 'Qty'),
      label(snapshot, '单位', 'Unit'), label(snapshot, '单价', 'Price'), label(snapshot, '金额', 'Total'),
    ]]
  const body = snapshot.items.map((item) => [
      String(item.position),
      '',
      displayName(snapshot, item),
      [item.model, item.sku].filter(Boolean).join(' / '),
      item.specifications.map((entry) => `• ${entry}`).join('\n'),
      item.quantity,
      item.unit,
      item.unitPrice,
      item.lineTotal,
    ])
  const totals = [
    `${label(snapshot, '小计', 'Subtotal')}: ${snapshot.money.currency} ${snapshot.money.subtotal}`,
    `${label(snapshot, '折扣', 'Discount')}: ${snapshot.money.discount}`,
    `${label(snapshot, '运费', 'Shipping')}: ${snapshot.money.shipping}`,
    `${label(snapshot, '其他费用', 'Other fee')}: ${snapshot.money.otherFee}`,
    `${label(snapshot, '税费', 'Tax')}: ${snapshot.money.tax}`,
    `${label(snapshot, '舍入调整', 'Rounding')}: ${snapshot.money.roundingAdjustment}`,
    `${label(snapshot, '合计', 'TOTAL')}: ${snapshot.money.currency} ${snapshot.money.total}`,
  ]
  const terms = Object.entries(snapshot.terms).map(([key, value]) => `${key}: ${value}`)
  const document = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const font = await configureQuotationPdfFont(document,
    [...heading.map((line) => line.text), ...head.flat(), ...body.flat(), ...totals, ...terms].join('\n'), fontOptions)
  document.setFont(font)
  for (const line of heading) {
    document.setFontSize(line.size)
    document.text(line.text, line.x, line.y)
  }

  autoTable(document, {
    startY: snapshot.customer.contact ? 134 : 122,
    head,
    body,
    styles: { font, fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [31, 41, 55] },
    columnStyles: { 1: { cellWidth: 66 } },
    margin: { left: 30, right: 30 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1 && snapshot.items[data.row.index]?.images.length) {
        data.cell.styles.minCellHeight = Math.ceil(snapshot.items[data.row.index].images.length / 2) * 34 + 4
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 1) return
      const images = snapshot.items[data.row.index]?.images ?? []
      images.forEach((image, index) => {
        const format = image.contentType === 'image/jpeg' ? 'JPEG' : 'PNG'
        const x = data.cell.x + 2 + (index % 2) * 31
        const y = data.cell.y + 2 + Math.floor(index / 2) * 34
        document.addImage(image.dataUrl, format, x, y, 29, 29, image.sha256, 'FAST')
      })
    },
  })

  const finalY = (document as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 140
  const requiredHeight = 18 + (Math.max(totals.length, terms.length) * 12)
  const pageHeight = document.internal.pageSize.getHeight()
  let contentY = finalY + 24
  if (contentY + requiredHeight > pageHeight - 30) {
    document.addPage()
    contentY = 40
  }
  document.setFontSize(10)
  document.text(totals, 360, contentY)
  if (terms.length) document.text(terms, 40, contentY, { maxWidth: 300 })
  return Buffer.from(document.output('arraybuffer'))
}
