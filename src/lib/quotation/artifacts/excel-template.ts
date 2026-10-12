import ExcelJS from 'exceljs'
import sharp from 'sharp'
import type { QuotationSnapshot } from './snapshot'
import { brandFieldLabel } from './brand-labels'

const NAVY = 'FF193F66'
const TEAL = 'FF157E86'
const LIGHT = 'FFF0F5F9'
const INK = 'FF17263B'
const safe = (value: string) => /^[=+\-@]/.test(value) ? `'${value}` : value
const EMU_PER_PIXEL = 9525
const POINTS_PER_PIXEL = .75
const TEXT_SIZE = 11
const TEXT_LINE_HEIGHT = 13
const ROW_HEIGHT_LIMIT = 400 // Excel caps a row at 409 points.

const characterWeight = (char: string) => (char.codePointAt(0) || 0) > 255 ? 2 : /[MW@%]/.test(char) ? 1.6 : /[mw]/.test(char) ? 1.3 : /[ilI.,:;'!| ]/.test(char) ? .5 : /[a-z]/.test(char) ? .8 : 1
const textLines = (text: string, capacity: number) => text.split(/\r?\n/).reduce((count, paragraph) => {
  let lines = 1; let width = 0; let lastSpaceWidth = 0
  for (const char of paragraph) {
    const weight = characterWeight(char)
    if (width + weight > capacity) {
      lines++
      width = lastSpaceWidth ? width - lastSpaceWidth : 0
      lastSpaceWidth = 0
    }
    width += weight
    if (/\s/.test(char)) lastSpaceWidth = width
  }
  return count + lines
}, 0)

// Normal specifications remain one intact cell. Exceptionally long text needs
// contiguous pieces because Excel cannot display an arbitrarily tall row.
const contentPieces = (text: string, capacity: number): string[] => {
  const maxLines = Math.floor((ROW_HEIGHT_LIMIT - 8) / TEXT_LINE_HEIGHT)
  if (textLines(text, capacity) <= maxLines) return [text]
  const pieces: string[] = []
  let piece = ''
  for (const char of text) {
    if (piece && textLines(piece + char, capacity) > maxLines) { pieces.push(piece); piece = '' }
    piece += char
  }
  if (piece) pieces.push(piece)
  return pieces
}

// Frozen decimal strings deliberately retain the authoritative snapshot, not recalculated formulas.
// This is a formal customer document, not the editable internal costing workbook.
export async function generateStudioExcel(snapshot: QuotationSnapshot): Promise<Buffer> {
  const book = new ExcelJS.Workbook()
  book.creator = 'LAIFAPPE Quotation Studio'
  const sheet = book.addWorksheet('Quotation', {
    views: [{ state: 'normal', showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true, margins: { left: .3, right: .3, top: .4, bottom: .4, header: .15, footer: .15 }, printTitlesRow: '11:11' },
    headerFooter: { oddFooter: '&LQuotation Studio &RPage &P of &N' },
  })
  sheet.columns = [5, 25, 35, 30, 11, 9, 17, 19].map((width) => ({ width }))
  const columnPixels = (column: number) => Math.floor((sheet.getColumn(column).width || 8) * 7 + 5)
  const mergedTextCapacity = (start: number, end: number, fontSize = 11) => {
    const width = Array.from({ length: end - start + 1 }, (_, index) => columnPixels(start + index)).reduce((sum, width) => sum + width, 0)
    return Math.max(1, Math.floor((width - 24) / (fontSize / POINTS_PER_PIXEL * .5)))
  }
  const band = (row: number, start: number, end: number, value: string, options: { fill?: string; color?: string; size?: number; bold?: boolean; right?: boolean } = {}) => {
    if (end > start) sheet.mergeCells(row, start, row, end)
    const cell = sheet.getCell(row, start)
    cell.value = value ? safe(value) : null
    cell.font = { name: 'Calibri', size: options.size || 11, bold: options.bold, color: { argb: options.color || INK } }
    cell.alignment = { vertical: 'middle', horizontal: options.right ? 'right' : 'left', wrapText: true, indent: 1 }
    if (options.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.fill } }
    return cell
  }
  const brand = snapshot.brand
  if (brand?.logo) band(1, 1, 2, '', { fill: 'FFFFFFFF' })
  band(1, brand?.logo ? 3 : 1, 8, brand?.companyName || 'LAIFAPPE', { fill: NAVY, color: 'FFFFFFFF', size: 16, bold: true }); sheet.getRow(1).height = Math.max(brand?.logo ? 40 : 32, textLines(brand?.companyName || 'LAIFAPPE', mergedTextCapacity(brand?.logo ? 3 : 1, 8, 16)) * 20 + 8)
  const address = brandFieldLabel('Address', brand?.address)
  const contact = brandFieldLabel('Contact', brand?.contactLine)
  const website = brandFieldLabel('Website', brand?.website)
  const email = brandFieldLabel('Email', brand?.email)
  band(2, 1, 4, address, { color: TEAL })
  band(2, 5, 8, contact, { right: true })
  band(3, 1, 4, brand?.tagline || '', { color: TEAL, size: 10 })
  band(3, 5, 8, website, { right: true })
  band(4, 5, 8, email, { right: true })
  const headerHeight = (value: string, start: number, end: number) => textLines(value, mergedTextCapacity(start, end)) * TEXT_LINE_HEIGHT + 6
  sheet.getRow(2).height = Math.max(26, headerHeight(address, 1, 4), headerHeight(contact, 5, 8))
  sheet.getRow(3).height = Math.max(22, headerHeight(website, 5, 8)); sheet.getRow(4).height = Math.max(20, headerHeight(email, 5, 8)); sheet.getRow(5).height = 8
  band(6, 1, 4, 'QUOTATION', { size: 18, bold: true, color: NAVY })
  band(6, 5, 8, `${snapshot.quotation.number}  /  R${snapshot.quotation.revision}`, { bold: true, right: true }); sheet.getRow(6).height = 32
  band(7, 1, 4, `TO  ${snapshot.customer.companyName}`, { fill: LIGHT, bold: true })
  band(7, 5, 8, `DATE  ${snapshot.quotation.date}`, { fill: LIGHT, right: true })
  band(8, 1, 4, [snapshot.customer.contact?.name, snapshot.customer.email, snapshot.customer.phone].filter(Boolean).join(' | '))
  band(8, 5, 8, `VALID UNTIL  ${snapshot.quotation.validUntil || '—'}`, { right: true })
  band(9, 1, 4, snapshot.customer.address || '')
  band(9, 5, 8, `CURRENCY  ${snapshot.money.currency}`, { right: true, bold: true })
  for (const row of [7, 8, 9]) sheet.getRow(row).height = Math.max(23, textLines(String(sheet.getCell(row, 1).value || ''), 65) * 15 + 4)
  sheet.getRow(10).height = 8
  const titles = ['#', 'PRODUCT PHOTO', 'PRODUCT / SPECIFICATIONS', '', 'QUANTITY', 'UNIT', `UNIT PRICE (${snapshot.money.currency})`, `AMOUNT (${snapshot.money.currency})`]
  titles.forEach((title, index) => { if (index !== 3) band(11, index + 1, index === 2 ? 4 : index + 1, title, { fill: NAVY, color: 'FFFFFFFF', bold: true, size: 10 }) }); sheet.getRow(11).height = 32
  let cursor = 12
  const rowPixels = (row: number) => (sheet.getRow(row).height || 15) / POINTS_PER_PIXEL
  const columnLeft = (column: number) => Array.from({ length: column - 1 }, (_, index) => columnPixels(index + 1)).reduce((sum, width) => sum + width, 0)
  const rowTop = (row: number) => Array.from({ length: row - 1 }, (_, index) => rowPixels(index + 1)).reduce((sum, height) => sum + height, 0)
  const addImage = async (dataUrl: string, left: number, top: number, maxWidth: number, maxHeight: number, stamp = false, centered = false) => {
    const bytes = Buffer.from(dataUrl.split(',')[1], 'base64')
    const meta = await sharp(bytes).metadata()
    const scale = Math.min(maxWidth / (meta.width || maxWidth), maxHeight / (meta.height || maxHeight))
    // A visible date remains underneath a transparent seal in the cell itself.
    const id = book.addImage({ base64: dataUrl, extension: dataUrl.startsWith('data:image/jpeg') ? 'jpeg' : 'png' })
    const width = (meta.width || maxWidth) * scale
    const height = (meta.height || maxHeight) * scale
    let x = left + (centered ? (maxWidth - width) / 2 : 0)
    let y = top + (centered ? (maxHeight - height) / 2 : 0)
    let column = 1; let row = 1
    while (x >= columnPixels(column)) { x -= columnPixels(column); column++ }
    while (y >= rowPixels(row)) { y -= rowPixels(row); row++ }
    sheet.addImage(id, { tl: { col: column - 1, row: row - 1 }, ext: { width, height }, editAs: stamp ? 'absolute' : 'oneCell' })
    const anchor = sheet.getImages().at(-1)?.range.tl
    if (anchor) {
      // Native offsets are EMUs; ExcelJS fractional cell offsets do not account for display column widths.
      anchor.nativeColOff = Math.round(x * EMU_PER_PIXEL)
      anchor.nativeRowOff = Math.round(y * EMU_PER_PIXEL)
    }
  }
  if (brand?.logo) await addImage(brand.logo.dataUrl, columnPixels(1) * .25, rowPixels(1) * .12, 200, 40)
  const wrapped = (text: string, width = 60) => {
    const result: string[] = []
    for (const paragraph of text.split(/\r?\n/)) {
      let line = ''; let length = 0
      for (const char of paragraph) {
        const weight = char.charCodeAt(0) > 255 ? 2 : 1
        if (length + weight > width) {
          const space = line.lastIndexOf(' ')
          if (space > width / 2) { result.push(line.slice(0, space)); line = line.slice(space + 1); length = [...line].reduce((sum, entry) => sum + (entry.charCodeAt(0) > 255 ? 2 : 1), 0) }
          else { result.push(line); line = ''; length = 0 }
        }
        line += char; length += weight
      }
      result.push(line)
    }
    return result
  }
  const specificationWidth = columnPixels(3) + columnPixels(4) - 24
  // Conservative Calibri width estimate includes cell padding and Unicode width.
  const capacity = Math.floor(specificationWidth / (TEXT_SIZE / POINTS_PER_PIXEL * .5))
  const totalWidth = Array.from({ length: 8 }, (_, index) => columnPixels(index + 1)).reduce((sum, width) => sum + width, 0) * POINTS_PER_PIXEL
  const printScale = Math.min(1, (841.89 - .6 * 72) / totalWidth)
  const printableHeight = (595.28 - .8 * 72) / printScale
  const repeatedHeaderHeight = sheet.getRow(11).height || 32
  const bodyHeight = printableHeight - repeatedHeaderHeight
  let pageHeight = Array.from({ length: 11 }, (_, index) => sheet.getRow(index + 1).height || 15).reduce((sum, height) => sum + height, 0)
  const pageBreakBefore = (row: number) => {
    sheet.getRow(row - 1).addPageBreak()
    pageHeight = repeatedHeaderHeight
  }
  for (const [index, item] of snapshot.items.entries()) {
    const name = snapshot.language === 'CHINESE' ? item.nameZh || item.nameEn || '' : snapshot.language === 'BILINGUAL' ? [item.nameEn, item.nameZh].filter(Boolean).join(' / ') : item.nameEn || item.nameZh || ''
    const contents = [
      ...contentPieces(name, capacity).map(value => ({ value, bold: true })),
      ...item.specifications.flatMap(value => contentPieces(`• ${value}`, capacity).map(value => ({ value, bold: false }))),
      ...[item.model, item.sku].filter((value): value is string => Boolean(value)).flatMap(value => contentPieces(value, capacity).map(value => ({ value, bold: false }))),
    ]
    const heights = contents.map(({ value, bold }) => Math.max(bold ? 22 : 17, textLines(value, capacity) * TEXT_LINE_HEIGHT + (bold ? 8 : 4)))
    const commercialValues = [[1, String(item.position)], [5, item.quantity], [6, item.unit], [7, item.unitPrice], [8, item.lineTotal]] as const
    for (const [column, value] of commercialValues) {
      const valueCapacity = Math.max(1, Math.floor((columnPixels(column) - (column >= 7 ? 16 : 8)) / (11 / POINTS_PER_PIXEL * .5)))
      heights[0] = Math.max(heights[0], textLines(value, valueCapacity) * TEXT_LINE_HEIGHT + 8)
    }
    const imageColumns = item.images.length === 1 ? 1 : 2
    const imageRows = Math.ceil(item.images.length / imageColumns)
    const imageSlotHeight = imageColumns === 1 ? 128 : 96
    const imageGap = 8
    const imageHeight = item.images.length ? (imageRows * imageSlotHeight + Math.max(0, imageRows - 1) * imageGap + 16) * POINTS_PER_PIXEL : 0
    const contentHeight = heights.reduce((sum, height) => sum + height, 0)
    // Empty space needed by photos belongs to the last content row, rather than
    // dozens of fixed micro-rows with empty specification cells.
    if (imageHeight > contentHeight) heights[heights.length - 1] += imageHeight - contentHeight
    const blockHeight = heights.reduce((sum, height) => sum + height, 0)
    const first = cursor; const last = cursor + contents.length - 1
    const allowContinuation = blockHeight > bodyHeight || (first === 12 && pageHeight + blockHeight > printableHeight)
    const openingHeight = Math.min(blockHeight, Math.max(imageHeight, heights[0] + (heights[1] || 0)))
    // Keep the first product with the quotation header, rather than printing a
    // header-only opening page when its full content cannot fit below it.
    if (first > 12 && (blockHeight <= bodyHeight ? pageHeight + blockHeight > printableHeight : pageHeight + openingHeight > printableHeight)) pageBreakBefore(first)
    for (let row = first; row <= last; row++) {
      const height = heights[row - first]
      // An oversized product can continue at content-row boundaries. Most
      // products fit a page and are kept together by the check above.
      if (allowContinuation && row > first && pageHeight + height > printableHeight) pageBreakBefore(row)
      sheet.getRow(row).height = height
      pageHeight += height
      for (let col = 1; col <= 8; col++) {
        const cell = sheet.getCell(row, col)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 ? 'FFF5F8FB' : 'FFFFFFFF' } }
        cell.font = { name: 'Calibri', size: 11, color: { argb: INK } }
        cell.border = { left: { style: 'hair', color: { argb: 'FFD4DFE9' } }, bottom: row === last ? { style: 'thin', color: { argb: 'FFD4DFE9' } } : undefined }
      }
      const content = contents[row - first]
      band(row, 3, 4, content.value, { bold: content.bold, color: NAVY, size: TEXT_SIZE }).alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 }
    }
    for (const [col, value] of commercialValues) {
      const cell = sheet.getCell(first, col); cell.value = value ? safe(value) : null; cell.alignment = { horizontal: col >= 7 ? 'right' : 'center', vertical: 'top', wrapText: true, indent: col >= 7 ? 1 : 0 }; cell.font = { name: 'Calibri', size: 11, bold: col === 8, color: { argb: INK } }
    }
    const photoWidth = columnPixels(2) - 16
    const slotWidth = (photoWidth - (imageColumns - 1) * imageGap) / imageColumns
    for (const [imageIndex, image] of item.images.entries()) await addImage(image.dataUrl, columnLeft(2) + 8 + (imageIndex % imageColumns) * (slotWidth + imageGap), rowTop(first) + 8 + Math.floor(imageIndex / imageColumns) * (imageSlotHeight + imageGap), slotWidth, imageSlotHeight, false, true)
    cursor = last + 1
  }
  cursor++
  pageHeight += 15
  const footerRow = (row: number, height: number, nextHeight = 0) => {
    if (pageHeight + height + nextHeight > printableHeight) pageBreakBefore(row)
    sheet.getRow(row).height = height
    pageHeight += height
  }
  const totals = [['Subtotal', snapshot.money.subtotal], ['Discount', snapshot.money.discount], ['Shipping', snapshot.money.shipping], ['Other charges', snapshot.money.otherFee], ['Tax', snapshot.money.tax], ['Rounding adjustment', snapshot.money.roundingAdjustment], ['GRAND TOTAL', snapshot.money.total]]
    .filter(([label, amount]) => label === 'Subtotal' || label === 'GRAND TOTAL' || !/^0(?:\.0+)?$/.test(amount))
  const totalHeight = totals.reduce((height, [label]) => height + (label === 'GRAND TOTAL' ? 34 : 25), 0)
  if (pageHeight + totalHeight > printableHeight) pageBreakBefore(cursor)
  for (const [label, amount] of totals) {
    const total = label === 'GRAND TOTAL'
    band(cursor, 5, 7, `${label} (${snapshot.money.currency})`, { fill: total ? NAVY : LIGHT, color: total ? 'FFFFFFFF' : INK, bold: true, right: true })
    band(cursor, 8, 8, amount, { fill: total ? NAVY : LIGHT, color: total ? 'FFFFFFFF' : INK, bold: true, right: true, size: total ? 14 : 11 })
    footerRow(cursor++, total ? 34 : 25)
  }
  cursor += 1
  pageHeight += 15
  const terms = Object.entries(snapshot.terms).filter(([, value]) => value.trim())
  if (terms.length) {
    band(cursor, 1, 8, 'TERMS & CONDITIONS', { color: TEAL, bold: true }); footerRow(cursor++, 28, 19)
    for (const [key, value] of terms) for (const line of wrapped(key === 'Terms' ? value : `${key}: ${value}`, 130)) { band(cursor, 1, 8, line, { size: 10, color: NAVY }); footerRow(cursor++, 19) }
  }
  if (brand?.seal) {
    cursor++
    pageHeight += 15
    if (pageHeight + 175 > printableHeight) pageBreakBefore(cursor)
    band(cursor, 6, 8, 'AUTHORIZED COMPANY SEAL', { color: TEAL, right: true, bold: true }); sheet.getRow(cursor++).height = 24
    for (let row = cursor; row < cursor + 6; row++) sheet.getRow(row).height = 22
    band(cursor + 2, 7, 8, snapshot.quotation.date, { color: 'FF53667E' }).alignment = { horizontal: 'center', vertical: 'middle' }
    await addImage(brand.seal.dataUrl, columnLeft(7) + columnPixels(7) * .5, rowTop(cursor), 140, 140, true)
    band(cursor + 6, 6, 8, `Date: ${snapshot.quotation.date}`, { right: true, size: 10 }); cursor += 7
  }
  sheet.pageSetup.printArea = `A1:H${cursor}`
  return Buffer.from(await book.xlsx.writeBuffer())
}
