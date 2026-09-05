import { jsPDF } from 'jspdf'
import { configureQuotationPdfFont, type PdfFontOptions } from './pdf-font'
import { quotationSnapshotSchema, type QuotationSnapshot } from './snapshot'

const NAVY = '#183547'
const TEAL = '#138B86'
const MUTED = '#526878'
const PAPER = '#F2F7F8'
const LEFT = 32
const RIGHT = 810
const WIDTH = RIGHT - LEFT

/** Fixed branded landscape template. All text is measured and paginated, never ellipsized. */
export async function generatePresentationPdf(input: QuotationSnapshot, fontOptions?: PdfFontOptions, preview = false): Promise<Buffer> {
  const snapshot = quotationSnapshotSchema.parse(input)
  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true })
  const brand = snapshot.brand ?? { companyName: 'LAIFAPPE', contactLine: '', tagline: 'PERSONAL PROTECTIVE EQUIPMENT' }
  const displayName = (item: QuotationSnapshot['items'][number]) => snapshot.language === 'CHINESE' ? item.nameZh || item.nameEn || '' : snapshot.language === 'BILINGUAL' ? [item.nameEn, item.nameZh].filter(Boolean).join(' / ') : item.nameEn || item.nameZh || ''
  const fontText = [brand.companyName, brand.contactLine, brand.tagline, snapshot.customer.companyName, snapshot.quotation.number, snapshot.quotation.date, snapshot.quotation.validUntil, snapshot.money.currency, ...Object.values(snapshot.terms), ...Object.keys(snapshot.terms), ...snapshot.items.flatMap((item) => [displayName(item), item.model, item.sku, item.unit, ...item.specifications])].filter(Boolean).join('\n')
  const font = await configureQuotationPdfFont(document, `${fontText}\n•`, fontOptions)
  document.setFont(font)
  document.setLineHeightFactor(1.25)
  const selectFont = (value: string, size: number) => document.setFont(/[^\x00-\x7f\u2022]/.test(value) ? font : 'helvetica', size >= 13 ? 'bold' : 'normal')
  const text = (value: string | string[], x: number, y: number, size = 10, color = NAVY, align: 'left' | 'right' | 'center' = 'left') => {
    selectFont(Array.isArray(value) ? value.join('\n') : value, size); document.setFontSize(size); document.setTextColor(color); document.text(value, x, y, { align })
  }
  const lines = (value: string, width: number, size: number): string[] => {
    selectFont(value, size); document.setFontSize(size)
    return document.splitTextToSize(value, width) as string[]
  }
  const wrapHeader = (value: string, width: number, preferred: number, maxHeight: number) => {
    let size = preferred
    while (lines(value, width, size).length * size * 1.25 > maxHeight && size > 4) size -= .5
    return { value: lines(value, width, size), size }
  }
  function pageHeader() {
    document.setFillColor(NAVY); document.rect(0, 0, 842, 7, 'F')
    const brandX = brand.logo ? LEFT + 54 : LEFT
    if (brand.logo) {
      const props = document.getImageProperties(brand.logo.dataUrl)
      const scale = Math.min(44 / props.width, 44 / props.height)
      document.addImage(brand.logo.dataUrl, props.fileType, LEFT, 22, props.width * scale, props.height * scale, brand.logo.sha256)
    }
    const company = wrapHeader(brand.companyName, 550 - (brandX - LEFT), 20, 45)
    text(company.value, brandX, 33, company.size)
    text('QUOTATION', RIGHT, 37, 22, NAVY, 'right')
    if (preview) text('PREVIEW - NOT A FORMAL DOCUMENT', RIGHT, 53, 8, TEAL, 'right')
    const contact = wrapHeader(brand.contactLine, WIDTH, 8, 28)
    text(contact.value, LEFT, 76, contact.size, MUTED)
    document.setFillColor(PAPER); document.roundedRect(LEFT, 106, WIDTH, 46, 5, 5, 'F')
    text('TO', LEFT + 12, 120, 7, TEAL)
    const customer = wrapHeader(snapshot.customer.companyName, 355, 11, 22)
    text(customer.value, LEFT + 12, 131, customer.size)
    text('QUOTATION / REV', 420, 120, 7, TEAL); text(`${snapshot.quotation.number} / R${snapshot.quotation.revision}`, 420, 136, 9)
    text('DATE', 640, 120, 7, TEAL); text(snapshot.quotation.date, 640, 136, 9)
    text('CURRENCY', RIGHT - 65, 120, 7, TEAL); text(snapshot.money.currency, RIGHT - 65, 136, 9)
  }
  const columns = [24, 240, 282, 40, 48, 68, 76]
  const starts = columns.map((_, index) => LEFT + columns.slice(0, index).reduce((sum, col) => sum + col, 0))
  function tableHeader() {
    document.setFillColor(NAVY); document.rect(LEFT, 166, WIDTH, 27, 'F')
    ;['SN', 'PHOTO', 'PRODUCT / SPECIFICATIONS', 'UNIT', 'QTY', 'UNIT PRICE', 'AMOUNT'].forEach((label, index) => text(label, starts[index] + columns[index] / 2, 183, index > 2 ? 7 : 8, '#FFFFFF', 'center'))
  }
  let first = true
  function nextPage() { if (!first) document.addPage(); first = false; pageHeader() }
  for (const item of snapshot.items) {
    const name = displayName(item)
    const blocks: { text: string; size: number; color: string; height: number }[] = []
    for (const row of lines(name, columns[2] - 24, 13)) blocks.push({ text: row, size: 13, color: NAVY, height: 18 })
    blocks.push({ text: '', size: 10, color: TEAL, height: 10 })
    const descriptions = [...[item.model, item.sku].filter((entry): entry is string => Boolean(entry)), ...item.specifications]
    for (const description of descriptions) {
      lines(`• ${description}`, columns[2] - 24, 10).forEach((row) => blocks.push({ text: row, size: 10, color: MUTED, height: 14 }))
      blocks.push({ text: '', size: 10, color: MUTED, height: 5 })
    }
    let blockIndex = 0
    let imageIndex = 0
    let part = 0
    do {
      nextPage(); tableHeader()
      document.setDrawColor('#DAE4E8'); document.setLineWidth(.5); document.rect(LEFT, 193, WIDTH, 336)
      for (const start of starts.slice(1)) document.line(start, 193, start, 529)
      text(String(item.position), LEFT + 12, 218, 10, NAVY, 'center')
      const numeric = [item.unit, item.quantity, item.unitPrice, item.lineTotal]
      numeric.forEach((value, index) => { const column = index + 3; text(lines(value, columns[column] - 8, 9), starts[column] + columns[column] / 2, 219, 9, NAVY, 'center') })
      const selected = item.images.slice(imageIndex, imageIndex + 4)
      const gridColumns = selected.length > 1 ? 2 : 1
      const gridRows = Math.ceil(selected.length / gridColumns) || 1
      const cellWidth = (columns[1] - 24) / gridColumns
      const cellHeight = 292 / gridRows
      selected.forEach((image, index) => {
        const x = starts[1] + 12 + index % gridColumns * cellWidth
        const y = 209 + Math.floor(index / gridColumns) * cellHeight
        const metadata = document.getImageProperties(image.dataUrl)
        const factor = Math.min((cellWidth - 10) / metadata.width, (cellHeight - 10) / metadata.height)
        const width = metadata.width * factor; const height = metadata.height * factor
        document.addImage(image.dataUrl, image.contentType === 'image/png' ? 'PNG' : 'JPEG', x + (cellWidth - width) / 2, y + (cellHeight - height) / 2, width, height, image.sha256, 'FAST')
      })
      imageIndex += selected.length
      let y = 216
      if (part > 0) { text('PRODUCT DETAILS - CONTINUED', starts[2] + 12, y, 8, TEAL); y += 22 }
      while (blockIndex < blocks.length && y + blocks[blockIndex].height < 517) {
        const block = blocks[blockIndex++]; text(block.text, starts[2] + 12, y, block.size, block.color); y += block.height
      }
      part++
    } while (blockIndex < blocks.length || imageIndex < item.images.length)
  }
  // A consistent summary page avoids squeezing totals/terms into a variable product row.
  nextPage()
  text('QUOTATION SUMMARY', LEFT, 183, 15)
  const rows = [
    ['Subtotal', snapshot.money.subtotal], ['Discount', snapshot.money.discount], ['Shipping', snapshot.money.shipping], ['Other charges', snapshot.money.otherFee], ['Tax', snapshot.money.tax], ['Rounding adjustment', snapshot.money.roundingAdjustment],
  ].filter(([label, amount]) => label === 'Subtotal' || !/^0(?:\.0+)?$/.test(amount))
  let summaryY = 215
  for (const [label, amount] of rows) { text(label, 555, summaryY); text(`${snapshot.money.currency} ${amount}`, RIGHT - 12, summaryY, 11, NAVY, 'right'); summaryY += 25 }
  document.setFillColor(NAVY); document.roundedRect(540, summaryY - 6, 270, 45, 5, 5, 'F')
  text('TOTAL', 555, summaryY + 21, 11, '#FFFFFF'); text(`${snapshot.money.currency} ${snapshot.money.total}`, RIGHT - 12, summaryY + 21, 15, '#FFFFFF', 'right')
  if (brand.seal && !preview) {
    const props = document.getImageProperties(brand.seal.dataUrl)
    const scale = Math.min(100 / props.width, 95 / props.height)
    document.addImage(brand.seal.dataUrl, props.fileType, RIGHT - 120, summaryY + 52, props.width * scale, props.height * scale, brand.seal.sha256)
  }
  const terms = [...(snapshot.quotation.validUntil ? [`Valid until: ${snapshot.quotation.validUntil}`] : []), ...Object.entries(snapshot.terms).filter(([, value]) => value.trim()).map(([key, value]) => key === 'Terms' ? value : `${key}: ${value}`)]
  const termLines = terms.flatMap((term) => [...lines(term, 455, 10), ''])
  let termIndex = 0
  let termY = 220
  text('TERMS & CONDITIONS', LEFT, 203, 9, TEAL)
  while (termIndex < termLines.length) {
    if (termY > 518) { nextPage(); text('TERMS & CONDITIONS - CONTINUED', LEFT, 184, 11, TEAL); termY = 211 }
    text(termLines[termIndex++], LEFT, termY, 10, MUTED); termY += 14
  }
  const pages = document.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    document.setPage(page); document.setDrawColor('#DAE4E8'); document.line(LEFT, 550, RIGHT, 550)
    const tagline = wrapHeader(brand.tagline, 620, 8, 20)
    text(tagline.value, LEFT, 568, tagline.size, MUTED)
    text(`Page ${page} of ${pages}`, RIGHT, 568, 8, MUTED, 'right')
  }
  return Buffer.from(document.output('arraybuffer'))
}
