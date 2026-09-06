import { jsPDF } from 'jspdf'

import { validateJordanLayout } from '../services/ai-layout'
import { QuotationError } from '../errors'
import { configureQuotationPdfFont, type PdfFontOptions } from './pdf-font'
import { quotationSnapshotSchema, type QuotationSnapshot } from './snapshot'

const L = 68
const R = 774
const W = R - L
const NAVY = '#193F66'
const TEAL = '#1F9DA4'
const INK = '#17263B'
const MUTED = '#53667E'
const LIGHT = '#F0F5F9'
const BORDER = '#C6D4E4'
const columns = [28, 218, 248, 42, 52, 58, 60]
const starts = columns.map((_, index) => L + columns.slice(0, index).reduce((sum, width) => sum + width, 0))

/** Executable template transcribed from the reviewed seven-page Jordan reference.
 * No reference customer, products, commercial terms or seal are copied into output.
 * The renderer never calls AI; a finalized snapshot contains its validated layout.
 */
export async function generateJordanPdf(input: QuotationSnapshot, options?: PdfFontOptions, preview = false): Promise<Buffer> {
  const snapshot = quotationSnapshotSchema.parse(input)
  const layout = snapshot.layout ? validateJordanLayout(snapshot, snapshot.layout) : undefined
  if (!preview && !layout) throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Jordan 正式报价缺少 AI 排版结果，请通过正式生成流程重试')
  const brand = snapshot.brand ?? { companyName: 'LAIFAPPE', contactLine: '', tagline: 'PERSONAL PROTECTIVE EQUIPMENT' }
  const name = (item: QuotationSnapshot['items'][number]) => snapshot.language === 'BILINGUAL'
    ? [item.nameEn, item.nameZh].filter(Boolean).join(' / ')
    : snapshot.language === 'CHINESE' ? item.nameZh || item.nameEn || '' : item.nameEn || item.nameZh || ''
  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true })
  const visible = [brand.companyName, brand.contactLine, brand.address || '', brand.website || '', brand.email || '', brand.tagline, snapshot.customer.companyName,
    snapshot.quotation.number, ...Object.keys(snapshot.terms), ...Object.values(snapshot.terms),
    ...snapshot.items.flatMap((item) => [name(item), item.unit, item.model || '', item.sku || '', ...item.specifications])].join('\n')
  const unicodeFont = await configureQuotationPdfFont(document, visible, options)
  document.setLineHeightFactor(1.2)
  function font(value: string, size: number, bold = false) {
    const unicode = /[^\x00-\x7f]/.test(value)
    document.setFont(unicode ? unicodeFont : 'helvetica', !unicode && bold ? 'bold' : 'normal')
    document.setFontSize(size)
  }
  function text(value: string | string[], x: number, y: number, size = 8.5, color = INK, bold = false, align: 'left' | 'right' | 'center' = 'left') {
    font(Array.isArray(value) ? value.join('\n') : value, size, bold)
    document.setTextColor(color); document.text(value, x, y, { align })
  }
  function wrap(value: string, width: number, size: number, bold = false): string[] {
    font(value, size, bold)
    return document.splitTextToSize(value, width) as string[]
  }
  function fit(value: string, width: number, height: number, initial = 9, bold = false) {
    let size = initial
    while (wrap(value, width, size, bold).length * size * 1.2 > height && size > 4) size -= .25
    return { lines: wrap(value, width, size, bold), size }
  }
  function image(dataUrl: string, hash: string, x: number, y: number, width: number, height: number) {
    const metadata = document.getImageProperties(dataUrl)
    const factor = Math.min(width / metadata.width, height / metadata.height)
    const w = metadata.width * factor; const h = metadata.height * factor
    document.addImage(dataUrl, metadata.fileType, x + (width - w) / 2, y + (height - h) / 2, w, h, hash, 'FAST')
  }
  let firstPage = true
  function pageHeader(): number {
    if (!firstPage) document.addPage()
    const first = firstPage; firstPage = false
    document.setFillColor(NAVY); document.rect(0, 0, 842, 13, 'F')
    document.setFillColor(TEAL); document.rect(0, 13, 205, 5, 'F')
    if (first) {
      const companyX = brand.logo ? L + 58 : L
      if (brand.logo) image(brand.logo.dataUrl, brand.logo.sha256, L, 33, 43, 43)
      const title = fit(brand.companyName, 484 - companyX, 38, 17, true)
      text(title.lines, companyX, 39, title.size, NAVY, true)
      const subtitle = fit(brand.tagline, 460 - companyX, 13, 8, true)
      text(subtitle.lines, companyX, 77, subtitle.size, NAVY, true)
      document.setFillColor(LIGHT); document.roundedRect(560, 32, R - 560, 52, 8, 8, 'F')
      text('QUOTATION', R - 14, 48, 19, NAVY, true, 'right')
      text('PPE Supply Quotation', R - 14, 65, 8.5, MUTED, false, 'right')
      document.setFillColor('#F5F8FB'); document.setDrawColor(BORDER)
      const address = wrap(brand.address || '', W * .44 - 22, 8)
      const contact = [brand.contactLine, brand.website, brand.email].filter((value): value is string => Boolean(value)).flatMap((value) => wrap(value, W * .52 - 22, 8))
      const contactHeight = Math.max(38, 22 + Math.max(contact.length, address.length) * 10)
      document.roundedRect(L, 98, W, contactHeight, 5, 5, 'FD')
      if (address.length) text(address, L + 10, 112, 8, MUTED)
      if (contact.length) text(contact, R - 10, 112, 8, MUTED, false, 'right')
      const customerLines = wrap(snapshot.customer.companyName, W - 24, 8)
      const longCustomer = wrap(snapshot.customer.companyName, (W - 40) / 5 - 14, 6).length > 2
      let fieldsY = 106 + contactHeight
      if (longCustomer) {
        const customerHeight = 17 + customerLines.length * 10
        document.setFillColor(LIGHT); document.roundedRect(L, fieldsY, W, customerHeight, 4, 4, 'F')
        text('TO', L + 7, fieldsY + 9, 6.5, MUTED, true)
        text(customerLines, L + 7, fieldsY + 20, 8)
        fieldsY += customerHeight + 7
      }
      const fields = [...(longCustomer ? [] : [['TO', snapshot.customer.companyName]]), ['NO.', `${snapshot.quotation.number} / R${snapshot.quotation.revision}`], ['DATE', snapshot.quotation.date], ['VALID UNTIL', snapshot.quotation.validUntil || '-'], ['CURRENCY', snapshot.money.currency]]
      const boxWidth = (W - (fields.length - 1) * 10) / fields.length
      fields.forEach(([label, value], index) => {
        const x = L + index * (boxWidth + 10)
        document.setFillColor(LIGHT); document.roundedRect(x, fieldsY, boxWidth, 29, 4, 4, 'F')
        text(label, x + 7, fieldsY + 8, 6.5, MUTED, true)
        const field = fit(value, boxWidth - 14, 16, 8.5)
        text(field.lines, x + 7, fieldsY + 18, field.size)
      })
      return fieldsY + 41
    }
    text('QUOTATION', L, 34, 11, NAVY, true)
    const description = fit(`${snapshot.customer.companyName} | ${snapshot.quotation.number} / R${snapshot.quotation.revision} | ${snapshot.quotation.date} | ${snapshot.money.currency}`, W - 95, 15, 7.5)
    text(description.lines, L, 47, description.size, MUTED)
    return 63
  }
  function tableHeader(y: number) {
    document.setFillColor(NAVY); document.roundedRect(L, y, W, 34, 5, 5, 'F')
    const labels = ['SN', 'Photo', 'Product / Specifications', 'Unit', 'Quantity', `Unit Price\n(${snapshot.money.currency})`, `Amount\n(${snapshot.money.currency})`]
    labels.forEach((label, index) => text(label, starts[index] + columns[index] / 2, y + (index > 4 ? 13 : 20), 7.5, '#FFFFFF', true, 'center'))
  }
  const pretty = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  // Group only the integer part; keep exact stored decimal strings.
  const number = (value: string) => { const [integer, fraction] = value.split('.'); return pretty(integer) + (fraction === undefined ? '' : `.${fraction}`) }
  const fees = [['Subtotal', snapshot.money.subtotal], ['Discount', snapshot.money.discount], ['Shipping', snapshot.money.shipping], ['Other charges', snapshot.money.otherFee], ['Tax', snapshot.money.tax], ['Rounding adjustment', snapshot.money.roundingAdjustment]]
    .filter(([label, amount]) => label === 'Subtotal' || !/^0(?:\.0+)?$/.test(amount))
  const termLines = Object.entries(snapshot.terms).filter(([, value]) => value.trim()).flatMap(([key, value]) => [...wrap(key === 'Terms' ? value : `${key}: ${value}`, W - 8, 7), ''])
  const summaryHeight = fees.length * 22 + 34 + termLines.length * 9 + (brand.seal && !preview ? 98 : 0) + 10
  let summaryY: number | undefined

  for (const [itemIndex, item] of snapshot.items.entries()) {
    const format = layout?.items[itemIndex]
    const gridColumns = format?.imageColumns ?? (item.images.length > 1 ? 2 : 1)
    const maxImages = gridColumns * 2
    const blocks: { value: string; size: number; height: number; prefix: number; title?: boolean; bullet?: boolean }[] = []
    wrap(name(item), columns[2] - 18, 9.5, true).forEach((value) => blocks.push({ value, size: 9.5, height: 12, prefix: 0, title: true }))
    blocks.push({ value: '', size: 8, height: 12, prefix: 0 })
    const extra = [item.model, item.sku].filter((entry): entry is string => Boolean(entry))
    for (const [index, description] of [...item.specifications, ...extra].entries()) {
      const colon = description.search(/[:：]/)
      const prefix = index < item.specifications.length ? format?.labelLengths[index] ?? (colon >= 0 && colon < 80 ? colon + 1 : 0) : 0
      let cursor = 0
      wrap(description, columns[2] - 30, 8).forEach((value, row) => {
        const offset = description.indexOf(value, cursor)
        const start = offset >= 0 ? offset : cursor
        blocks.push({ value, size: 8, height: 10, prefix: Math.max(0, Math.min(value.length, prefix - start)), bullet: row === 0 })
        cursor = start + value.length
      })
      blocks.push({ value: '', size: 8, height: 3, prefix: 0 })
    }
    const note = [`Total: ${number(item.quantity)} ${item.unit}`, ...(format?.noteIndices ?? []).map((index) => item.specifications[index])].join(' | ')
    const fullNoteLines = wrap(note, columns[2] - 32, 6.5)
    // Long selected notes remain in full in the specification column; do not shrink them illegibly.
    const noteLines = fullNoteLines.length <= 4 ? fullNoteLines : wrap(`Total: ${number(item.quantity)} ${item.unit}`, columns[2] - 32, 6.5)
    const noteHeight = 20 + noteLines.length * 8
    let blockIndex = 0; let imageIndex = 0; let part = 0
    do {
      const headerY = pageHeader(); tableHeader(headerY)
      const top = headerY + 34
      const available = 551 - top
      const remainingHeight = blocks.slice(blockIndex).reduce((sum, block) => sum + block.height, 0)
      const inlineHeight = available - summaryHeight - 14
      const canInline = itemIndex === snapshot.items.length - 1 && item.images.length - imageIndex <= maxImages && inlineHeight >= 180
        && remainingHeight + noteHeight + 30 + (part ? 15 : 0) <= inlineHeight
      const height = canInline ? inlineHeight : available
      const bottom = top + height
      document.setFillColor(itemIndex % 2 ? '#F7F9FC' : '#FFFFFF'); document.setDrawColor(BORDER); document.setLineWidth(.65)
      document.rect(L, top, W, height, 'FD')
      starts.slice(1).forEach((x) => document.line(x, top, x, bottom))
      text(String(item.position), L + columns[0] / 2, top + height / 2, 8.5, INK, true, 'center')
      ;[item.unit, number(item.quantity), number(item.unitPrice), number(item.lineTotal)].forEach((value, index) => {
        const col = index + 3; const numeric = fit(value, columns[col] - 6, 50, 8.5, true)
        text(numeric.lines, starts[col] + columns[col] / 2, top + height / 2, numeric.size, INK, true, 'center')
      })
      const selected = item.images.slice(imageIndex, imageIndex + maxImages)
      const rows = Math.max(1, Math.ceil(selected.length / gridColumns))
      const imageWidth = (columns[1] - 20 - (gridColumns - 1) * 8) / gridColumns
      const imageHeight = (height - 16 - (rows - 1) * 8) / rows
      selected.forEach((asset, index) => {
        const finalCentered = selected.length % gridColumns === 1 && index === selected.length - 1
        const x = starts[1] + 10 + (finalCentered ? (columns[1] - 20 - imageWidth) / 2 : (index % gridColumns) * (imageWidth + 8))
        const y = top + 8 + Math.floor(index / gridColumns) * (imageHeight + 8)
        document.setFillColor('#FFFFFF'); document.roundedRect(x, y, imageWidth, imageHeight, 7, 7, 'FD')
        image(asset.dataUrl, asset.sha256, x + 5, y + 5, imageWidth - 10, imageHeight - 10)
      })
      imageIndex += selected.length
      let y = top + 14
      if (part) { text('SPECIFICATIONS - CONTINUED', starts[2] + 9, y, 7, TEAL, true); y += 15 }
      while (blockIndex < blocks.length && y + blocks[blockIndex].height <= bottom - noteHeight - 15) {
        const block = blocks[blockIndex++]
        const x = starts[2] + (block.title ? 9 : 23)
        if (block.bullet) { document.setFillColor(TEAL); document.circle(starts[2] + 12, y - 2, 1.6, 'F') }
        if (block.prefix) {
          const prefix = block.value.slice(0, block.prefix)
          text(prefix, x, y, block.size, INK, true)
          font(prefix, block.size, true)
          const width = document.getTextWidth(prefix)
          text(block.value.slice(block.prefix), x + width, y, block.size)
        } else text(block.value, x, y, block.size, block.title ? NAVY : INK, Boolean(block.title))
        y += block.height
      }
      const noteY = bottom - noteHeight - 7
      document.setDrawColor('#CAE4E8'); document.setFillColor('#EEF7F9')
      document.roundedRect(starts[2] + 8, noteY, columns[2] - 16, noteHeight, 4, 4, 'FD')
      text('ORDER QUANTITY / SIZE NOTE', starts[2] + 15, noteY + 10, 6.5, NAVY, true)
      text(noteLines, starts[2] + 15, noteY + 20, 6.5)
      if (canInline) summaryY = bottom + 14
      part++
    } while (blockIndex < blocks.length || imageIndex < item.images.length)
  }

  let y = summaryY ?? pageHeader() + 8
  const summaryWidth = W - (brand.seal && !preview ? 88 : 0)
  const ensure = (needed: number) => { if (y + needed > 550) y = pageHeader() + 10 }
  for (const [label, amount] of fees) {
    ensure(22)
    document.setFillColor(LIGHT); document.roundedRect(L, y, summaryWidth, 19, 4, 4, 'F')
    text(label, L + 10, y + 12, 7.5, NAVY, true)
    text(`${snapshot.money.currency} ${number(amount)}`, L + summaryWidth - 10, y + 12, 7.5, NAVY, true, 'right'); y += 22
  }
  ensure(brand.seal && !preview ? 132 : 34)
  document.setFillColor(NAVY); document.roundedRect(L, y, summaryWidth, 27, 5, 5, 'F')
  text('GRAND TOTAL', L + 10, y + 17, 9, '#FFFFFF', true)
  text(`${snapshot.money.currency} ${number(snapshot.money.total)}`, L + summaryWidth - 10, y + 17, 9, '#FFFFFF', true, 'right')
  y += 35
  if (brand.seal && !preview) {
    text(snapshot.quotation.date, R - 42, y + 43, 9, MUTED, false, 'center')
    image(brand.seal.dataUrl, brand.seal.sha256, R - 80, y, 76, 76)
    text(`Date: ${snapshot.quotation.date}`, R, y + 85, 7, MUTED, false, 'right')
    y += 94
  }
  for (const line of termLines) { ensure(10); text(line, L + 4, y, 7, MUTED); y += 9 }

  const pages = document.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    document.setPage(page)
    text(`Page ${page} of ${pages}`, page === 1 ? R - 14 : R, page === 1 ? 78 : 34, 7.5, MUTED, false, 'right')
    document.setDrawColor(BORDER); document.setLineWidth(1); document.line(L, 565, R, 565)
    const footer = fit(brand.tagline, W - 110, 12, 7)
    text(footer.lines, L, 576, footer.size, MUTED)
    text(`Page ${page} of ${pages}`, R, 576, 7, MUTED, false, 'right')
    if (preview) text('TEMPLATE PREVIEW - AI LAYOUT IS APPLIED ONLY WHEN FINALIZING', 421, 589, 6, TEAL, false, 'center')
  }
  return Buffer.from(document.output('arraybuffer'))
}
