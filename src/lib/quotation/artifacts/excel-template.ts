import ExcelJS from 'exceljs'
import sharp from 'sharp'
import type { QuotationSnapshot } from './snapshot'

const NAVY = 'FF193F66'
const TEAL = 'FF157E86'
const LIGHT = 'FFF0F5F9'
const INK = 'FF17263B'
const safe = (value: string) => /^[=+\-@]/.test(value) ? `'${value}` : value

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
  sheet.columns = [6, 27, 34, 30, 12, 10, 18, 20].map((width) => ({ width }))
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
  band(1, brand?.logo ? 3 : 1, 8, brand?.companyName || 'LAIFAPPE', { fill: NAVY, color: 'FFFFFFFF', size: brand?.logo ? 18 : 20, bold: true }); sheet.getRow(1).height = brand?.logo ? 56 : 42
  band(2, 1, 4, brand?.address || '', { color: TEAL })
  band(2, 5, 8, brand?.contactLine || '', { right: true })
  band(3, 1, 4, brand?.tagline || '', { color: TEAL, size: 10 })
  band(3, 5, 8, brand?.website || '', { right: true })
  band(4, 5, 8, brand?.email || '', { right: true })
  sheet.getRow(2).height = Math.max(30, Math.ceil(Math.max(brand?.contactLine.length || 0, brand?.address?.length || 0) / 55) * 15)
  sheet.getRow(3).height = 27; sheet.getRow(4).height = 25; sheet.getRow(5).height = 12
  band(6, 1, 4, 'QUOTATION', { size: 24, bold: true, color: NAVY })
  band(6, 5, 8, `${snapshot.quotation.number}  /  R${snapshot.quotation.revision}`, { bold: true, right: true }); sheet.getRow(6).height = 42
  band(7, 1, 4, `TO  ${snapshot.customer.companyName}`, { fill: LIGHT, bold: true })
  band(7, 5, 8, `DATE  ${snapshot.quotation.date}`, { fill: LIGHT, right: true })
  band(8, 1, 4, [snapshot.customer.contact?.name, snapshot.customer.email, snapshot.customer.phone].filter(Boolean).join(' | '))
  band(8, 5, 8, `VALID UNTIL  ${snapshot.quotation.validUntil || '—'}`, { right: true })
  band(9, 1, 4, snapshot.customer.address || '')
  band(9, 5, 8, `CURRENCY  ${snapshot.money.currency}`, { right: true, bold: true })
  for (const row of [7, 8, 9]) sheet.getRow(row).height = Math.max(25, Math.ceil(String(sheet.getCell(row, 1).value).length / 65) * 15)
  sheet.getRow(10).height = 12
  const titles = ['#', 'PRODUCT PHOTO', 'PRODUCT / SPECIFICATIONS', '', 'QUANTITY', 'UNIT', `UNIT PRICE (${snapshot.money.currency})`, `AMOUNT (${snapshot.money.currency})`]
  titles.forEach((title, index) => { if (index !== 3) band(11, index + 1, index === 2 ? 4 : index + 1, title, { fill: NAVY, color: 'FFFFFFFF', bold: true, size: 10 }) }); sheet.getRow(11).height = 32
  let cursor = 12
  const addImage = async (dataUrl: string, col: number, row: number, maxWidth: number, maxHeight: number, stamp = false) => {
    const bytes = Buffer.from(dataUrl.split(',')[1], 'base64')
    const meta = await sharp(bytes).metadata()
    const scale = Math.min(maxWidth / (meta.width || maxWidth), maxHeight / (meta.height || maxHeight))
    // A visible date remains underneath a transparent seal in the cell itself.
    const id = book.addImage({ base64: dataUrl, extension: dataUrl.startsWith('data:image/jpeg') ? 'jpeg' : 'png' })
    sheet.addImage(id, { tl: { col: Math.floor(col), row: Math.floor(row) }, ext: { width: (meta.width || maxWidth) * scale, height: (meta.height || maxHeight) * scale }, editAs: stamp ? 'absolute' : 'oneCell' })
    const anchor = sheet.getImages().at(-1)?.range.tl
    if (anchor) {
      // Native offsets are EMUs; ExcelJS fractional cell offsets do not account for display column widths.
      anchor.nativeColOff = Math.round((col % 1) * ((sheet.getColumn(Math.floor(col) + 1).width || 8) * 7 + 5) * 9525)
      anchor.nativeRowOff = Math.round((row % 1) * (sheet.getRow(Math.floor(row) + 1).height || 22) / .75 * 9525)
    }
  }
  if (brand?.logo) await addImage(brand.logo.dataUrl, .25, .12, 200, 52)
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
  for (const [index, item] of snapshot.items.entries()) {
    const name = snapshot.language === 'CHINESE' ? item.nameZh || item.nameEn || '' : snapshot.language === 'BILINGUAL' ? [item.nameEn, item.nameZh].filter(Boolean).join(' / ') : item.nameEn || item.nameZh || ''
    const nameLines = wrapped(name)
    const lines = [...nameLines, ...item.specifications.flatMap((line) => wrapped(`• ${line}`)), ...[item.model, item.sku].filter((value): value is string => Boolean(value)).flatMap((value) => wrapped(value))]
    const height = Math.max(7, lines.length + 1, Math.ceil(item.images.length / 2) * 4 + 1)
    const first = cursor; const last = cursor + height - 1
    for (let row = first; row <= last; row++) {
      sheet.getRow(row).height = 22
      for (let col = 1; col <= 8; col++) {
        const cell = sheet.getCell(row, col)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 ? 'FFF5F8FB' : 'FFFFFFFF' } }
        cell.font = { name: 'Calibri', size: 11, color: { argb: INK } }
        cell.border = { left: { style: 'hair', color: { argb: 'FFD4DFE9' } }, bottom: row === last ? { style: 'thin', color: { argb: 'FFD4DFE9' } } : undefined }
      }
      band(row, 3, 4, lines[row - first] || '', { bold: row - first < nameLines.length, color: row - first < nameLines.length ? NAVY : INK })
    }
    for (const [col, value] of [[1, String(item.position)], [2, ''], [5, item.quantity], [6, item.unit], [7, item.unitPrice], [8, item.lineTotal]] as const) {
      sheet.mergeCells(first, col, last, col)
      const cell = sheet.getCell(first, col); cell.value = value ? safe(value) : null; cell.alignment = { horizontal: col >= 7 ? 'right' : 'center', vertical: 'middle', wrapText: true, indent: col >= 7 ? 1 : 0 }; cell.font = { name: 'Calibri', size: 12, bold: col === 8, color: { argb: INK } }
    }
    for (const [imageIndex, image] of item.images.entries()) await addImage(image.dataUrl, 1.06 + (imageIndex % 2) * .49, first - 1 + .2 + Math.floor(imageIndex / 2) * 4, item.images.length === 1 ? 170 : 86, item.images.length === 1 ? 180 : 104)
    if (last - first < 23 && first > 12) sheet.getRow(first - 1).addPageBreak()
    cursor = last + 1
  }
  cursor++
  for (const [label, amount] of [['Subtotal', snapshot.money.subtotal], ['Discount', snapshot.money.discount], ['Shipping', snapshot.money.shipping], ['Other charges', snapshot.money.otherFee], ['Tax', snapshot.money.tax], ['Rounding adjustment', snapshot.money.roundingAdjustment], ['GRAND TOTAL', snapshot.money.total]]) {
    if (label !== 'Subtotal' && label !== 'GRAND TOTAL' && /^0(?:\.0+)?$/.test(amount)) continue
    const total = label === 'GRAND TOTAL'
    band(cursor, 5, 7, `${label} (${snapshot.money.currency})`, { fill: total ? NAVY : LIGHT, color: total ? 'FFFFFFFF' : INK, bold: true, right: true })
    band(cursor, 8, 8, amount, { fill: total ? NAVY : LIGHT, color: total ? 'FFFFFFFF' : INK, bold: true, right: true, size: total ? 14 : 11 })
    sheet.getRow(cursor++).height = total ? 34 : 25
  }
  cursor += 1
  band(cursor, 1, 8, 'TERMS & CONDITIONS', { color: TEAL, bold: true }); sheet.getRow(cursor++).height = 28
  for (const [key, value] of Object.entries(snapshot.terms)) for (const line of wrapped(key === 'Terms' ? value : `${key}: ${value}`, 130)) { band(cursor, 1, 8, line, { size: 10 }); sheet.getRow(cursor++).height = 19 }
  if (brand?.seal) {
    cursor++
    band(cursor, 6, 8, 'AUTHORIZED COMPANY SEAL', { color: TEAL, right: true, bold: true }); sheet.getRow(cursor++).height = 24
    for (let row = cursor; row < cursor + 6; row++) sheet.getRow(row).height = 22
    band(cursor + 2, 7, 8, snapshot.quotation.date, { color: 'FF53667E' }).alignment = { horizontal: 'center', vertical: 'middle' }
    await addImage(brand.seal.dataUrl, 6.5, cursor - 1, 140, 140, true)
    band(cursor + 6, 6, 8, `Date: ${snapshot.quotation.date}`, { right: true, size: 10 }); cursor += 7
  }
  sheet.pageSetup.printArea = `A1:H${cursor}`
  return Buffer.from(await book.xlsx.writeBuffer())
}
