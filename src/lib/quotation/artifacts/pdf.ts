import { readFile } from 'node:fs/promises'

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { QuotationError } from '../errors'
import type { QuotationSnapshot } from './snapshot'

function displayName(snapshot: QuotationSnapshot, item: QuotationSnapshot['items'][number]): string {
  if (snapshot.language === 'CHINESE') return item.nameZh ?? item.nameEn ?? ''
  if (snapshot.language === 'ENGLISH') return item.nameEn ?? item.nameZh ?? ''
  return [item.nameEn, item.nameZh].filter(Boolean).join(' / ')
}

function hasNonAscii(snapshot: QuotationSnapshot): boolean {
  return snapshot.language !== 'ENGLISH' || /[^\x00-\x7f]/.test(JSON.stringify(snapshot))
}

function label(snapshot: QuotationSnapshot, chinese: string, english: string): string {
  if (snapshot.language === 'CHINESE') return chinese
  if (snapshot.language === 'BILINGUAL') return `${chinese} / ${english}`
  return english
}

async function configureFont(document: jsPDF, snapshot: QuotationSnapshot): Promise<void> {
  if (!hasNonAscii(snapshot)) return
  const fontPath = process.env.QUOTATION_PDF_FONT_PATH
  if (!fontPath) {
    throw new QuotationError(
      'DOCUMENT_GENERATION_FAILED',
      'QUOTATION_PDF_FONT_PATH is required for Chinese or bilingual PDF output',
    )
  }
  const font = await readFile(fontPath)
  document.addFileToVFS('QuotationUnicode.ttf', font.toString('base64'))
  document.addFont('QuotationUnicode.ttf', 'QuotationUnicode', 'normal')
  // Register the same full-glyph font for bold requests made by autoTable.
  // This prevents a fallback to a built-in Latin-only font in Chinese headers.
  document.addFont('QuotationUnicode.ttf', 'QuotationUnicode', 'bold')
  document.setFont('QuotationUnicode')
}

export async function generateCustomerPdf(snapshot: QuotationSnapshot): Promise<Buffer> {
  const document = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  await configureFont(document, snapshot)
  document.setFontSize(18)
  document.text(label(snapshot, '报价单', 'QUOTATION'), 40, 48)
  document.setFontSize(10)
  document.text(`${label(snapshot, '编号', 'No.')}: ${snapshot.quotation.number}  ${label(snapshot, '版本', 'Rev')}: ${snapshot.quotation.revision}`, 40, 70)
  document.text(`${label(snapshot, '日期', 'Date')}: ${snapshot.quotation.date}`, 40, 86)
  document.text(`${label(snapshot, '客户', 'Customer')}: ${snapshot.customer.companyName}`, 40, 102)
  if (snapshot.quotation.validUntil) document.text(`${label(snapshot, '有效期至', 'Valid until')}: ${snapshot.quotation.validUntil}`, 360, 86)
  if (snapshot.customer.contact) {
    document.text(`${label(snapshot, '联系人', 'Contact')}: ${snapshot.customer.contact.name}`, 40, 118)
  }

  autoTable(document, {
    startY: snapshot.customer.contact ? 134 : 122,
    head: [[
      label(snapshot, '序号', 'No.'), label(snapshot, '图片', 'Image'), label(snapshot, '产品', 'Product'),
      label(snapshot, '型号 / SKU', 'Model / SKU'), label(snapshot, '规格', 'Specifications'), label(snapshot, '数量', 'Qty'),
      label(snapshot, '单位', 'Unit'), label(snapshot, '单价', 'Price'), label(snapshot, '金额', 'Total'),
    ]],
    body: snapshot.items.map((item) => [
      String(item.position),
      '',
      displayName(snapshot, item),
      [item.model, item.sku].filter(Boolean).join(' / '),
      item.specifications.map((entry) => `• ${entry}`).join('\n'),
      item.quantity,
      item.unit,
      item.unitPrice,
      item.lineTotal,
    ]),
    styles: { font: hasNonAscii(snapshot) ? 'QuotationUnicode' : 'helvetica', fontSize: 7, cellPadding: 3 },
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
