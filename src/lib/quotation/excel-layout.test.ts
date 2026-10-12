import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import ExcelJS from 'exceljs'
import sharp from 'sharp'
import JSZip from 'jszip'
import { generateStudioExcel } from './artifacts/excel-template'
import { quotationSnapshotSchema, type QuotationSnapshot } from './artifacts/snapshot'

const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const fixture = (items: QuotationSnapshot['items']): QuotationSnapshot => quotationSnapshotSchema.parse({
  schemaVersion: '1.0', templateVersion: 'jordan-ai-v1', language: 'ENGLISH',
  quotation: { number: 'QT-LAYOUT', revision: 1, date: '2026-10-09', validUntil: null },
  customer: { companyName: 'Sample', countryCode: null, email: null, phone: null, address: null, contact: null },
  money: { currency: 'USD', minorUnit: 2, roundingMode: 'HALF_UP', subtotal: '12345678901234567.8900', discount: '0', shipping: '0', otherFee: '0', taxRate: '0', tax: '0', roundingAdjustment: '0', total: '12345678901234567.8900' },
  terms: { Terms: 'All supplied product details apply.' }, items,
})
const item = (position = 1): QuotationSnapshot['items'][number] => ({
  position, nameEn: `Product ${position}`, nameZh: null, model: null, sku: null,
  specifications: ['Material: Cotton', 'Color: Blue', 'Size: L'],
  quantity: '12345678901234567.123456', unit: 'pcs', unitPrice: '0.0000123400', lineTotal: '12345678901234567.8900', images: [],
})
const workbook = async (snapshot: QuotationSnapshot) => {
  const book = new ExcelJS.Workbook()
  const bytes = await generateStudioExcel(snapshot)
  await book.xlsx.load(bytes as unknown as ExcelJS.Buffer)
  const sheet = book.getWorksheet('Quotation')
  assert.ok(sheet)
  // ExcelJS does not restore rowBreaks when reading its own files.
  const archive = await JSZip.loadAsync(bytes)
  const xml = await archive.file('xl/worksheets/sheet1.xml')?.async('string')
  assert.ok(xml)
  const pageBreaks = [...xml.matchAll(/<brk id="(\d+)"/g)].map(match => Number(match[1]))
  return { book, sheet, pageBreaks }
}
const image = async (width: number, height: number, color: string) => {
  const bytes = await sharp({ create: { width, height, channels: 4, background: color } }).png().toBuffer()
  return { contentType: 'image/png' as const, dataUrl: `data:image/png;base64,${bytes.toString('base64')}`, sha256: hash(bytes) }
}
const columnWidth = (sheet: ExcelJS.Worksheet, column: number) => Math.floor((sheet.getColumn(column).width || 8) * 7 + 5)
const imageLocation = (sheet: ExcelJS.Worksheet, drawing: ReturnType<ExcelJS.Worksheet['getImages']>[number]) => {
  const { tl, ext } = drawing.range as ExcelJS.ImageRange & ExcelJS.ImagePosition
  const left = Array.from({ length: tl.nativeCol }, (_, index) => columnWidth(sheet, index + 1)).reduce((sum, width) => sum + width, 0) + tl.nativeColOff / 9525
  const top = Array.from({ length: tl.nativeRow }, (_, index) => (sheet.getRow(index + 1).height || 15) / .75).reduce((sum, height) => sum + height, 0) + tl.nativeRowOff / 9525
  assert.ok(ext)
  return { left, top, width: ext.width, height: ext.height }
}

test('compact Excel keeps complete specifications and exact commercial strings in top-aligned header cells', async () => {
  const source = item()
  source.nameEn = '=2+2'
  source.specifications = ['Material: Cotton', 'A complete specification remains in one cell even when it wraps to a second visual line.']
  source.model = '@MODEL'
  const snapshot = fixture([source])
  const original = JSON.stringify(snapshot)
  const { sheet } = await workbook(snapshot)
  assert.equal(sheet.getCell('C12').value, "'=2+2")
  assert.equal(sheet.getCell('C13').value, '• Material: Cotton')
  assert.equal(sheet.getCell('C14').value, `• ${source.specifications[1]}`)
  assert.ok((sheet.getRow(14).height || 0) > (sheet.getRow(13).height || 0))
  assert.equal(sheet.getCell('C15').value, "'@MODEL")
  for (const [column, value] of [[1, '1'], [5, source.quantity], [6, source.unit], [7, source.unitPrice], [8, source.lineTotal]] as const) {
    assert.equal(sheet.getCell(12, column).value, value)
    assert.equal(sheet.getCell(12, column).alignment.vertical, 'top')
    assert.equal(sheet.getCell(13, column).value, null)
    assert.equal(sheet.getCell(12, column).isMerged, false)
  }
  assert.equal(sheet.getCell('C12').font.size, 11)
  assert.equal(sheet.getCell('C13').font.size, 11)
  assert.ok((sheet.getRow(12).height || 0) >= 47, 'Long decimal strings need enough header-row height to wrap visibly')
  assert.equal(sheet.views[0].state, 'normal')
  assert.equal(sheet.pageSetup.printTitlesRow, '11:11')
  assert.equal(sheet.pageSetup.fitToWidth, 1)
  assert.equal(sheet.pageSetup.orientation, 'landscape')
  assert.match(sheet.pageSetup.printArea || '', /^A1:H\d+$/)
  assert.ok(JSON.stringify(sheet.getSheetValues()).includes(snapshot.money.total))
  sheet.eachRow(row => row.eachCell(cell => assert.notEqual(cell.type, ExcelJS.ValueType.Formula)))
  assert.equal(JSON.stringify(snapshot), original)
})

test('pagination uses accumulated page space instead of forcing a page per compact product', async () => {
  const { sheet, pageBreaks } = await workbook(fixture(Array.from({ length: 12 }, (_, index) => ({ ...item(index + 1), quantity: '2000', unitPrice: '3.5000', lineTotal: '7000.0000' }))))
  const starts: number[] = []
  sheet.eachRow(row => { if (typeof row.getCell(1).value === 'string' && /^\d+$/.test(String(row.getCell(1).value)) && row.number >= 12) starts.push(row.number) })
  assert.equal(starts.length, 12)
  const productHeight = starts.slice(0, -1).reduce((sum, row, index) => sum + Array.from({ length: starts[index + 1] - row }, (_, offset) => sheet.getRow(row + offset).height || 15).reduce((height, current) => height + current, 0), 0)
  assert.ok(productHeight <= 11 * 90, `Short specifications create excessive height: ${productHeight}`)
  assert.ok(pageBreaks.length >= 1)
  assert.ok(pageBreaks.length <= 3, `Unexpected product page breaks: ${pageBreaks.length}`)
  for (const pageBreak of pageBreaks) assert.ok(starts.includes(pageBreak + 1), `Page break splits a product at row ${pageBreak}`)
})

test('photo anchors center contained original images in shared slots using actual row and column sizes', async () => {
  const source = item()
  source.images = [await image(40, 80, '#b33'), await image(80, 40, '#3b3')]
  const snapshot = fixture([source])
  const { book, sheet } = await workbook(snapshot)
  const drawings = sheet.getImages()
  assert.equal(drawings.length, source.images.length)
  const top = Array.from({ length: 11 }, (_, index) => (sheet.getRow(index + 1).height || 15) / .75).reduce((sum, height) => sum + height, 0)
  const photoWidth = columnWidth(sheet, 2) - 16
  const slotWidth = (photoWidth - 8) / 2
  for (const [index, drawing] of drawings.entries()) {
    const geometry = imageLocation(sheet, drawing)
    const expectedCenterX = columnWidth(sheet, 1) + 8 + index * (slotWidth + 8) + slotWidth / 2
    assert.ok(Math.abs(geometry.left + geometry.width / 2 - expectedCenterX) < .01)
    assert.ok(Math.abs(geometry.top + geometry.height / 2 - (top + 8 + 48)) < .01)
    assert.ok(geometry.width <= slotWidth)
    assert.ok(geometry.height <= 96)
    const embedded = book.getImage(Number(drawing.imageId))
    assert.ok(embedded.buffer)
    assert.equal(hash(Buffer.from(embedded.buffer)), source.images[index].sha256)
  }
})

test('long Unicode and unbreakable specifications flow without dropped characters or oversized Excel rows', async () => {
  const source = item()
  const specification = `技术规格：${'防护材料尺寸说明🧤'.repeat(150)}\n${'W'.repeat(2200)}`
  source.specifications = [specification]
  const { sheet, pageBreaks } = await workbook(fixture([source]))
  let recovered = ''
  let row = 13
  while (typeof sheet.getCell(row, 3).value === 'string') {
    recovered += sheet.getCell(row, 3).value
    assert.ok((sheet.getRow(row).height || 0) <= 400)
    assert.ok((sheet.getRow(row).height || 0) >= 17)
    row++
  }
  assert.equal(recovered, `• ${specification}`)
  assert.ok(row > 14)
  assert.ok(pageBreaks.length > 0)
  assert.ok(!pageBreaks.includes(11), 'Opening page must contain product content as well as the quotation header')
  assert.equal(sheet.getCell('E12').value, source.quantity)
})

test('merged header width keeps a complete first product on the opening page while long branding still wraps', async () => {
  const source = { ...item(), quantity: '2000', unitPrice: '3.5000', lineTotal: '7000.0000', specifications: Array.from({ length: 15 }, (_, index) => `Specification ${index + 1}: Original product detail`) }
  const snapshot = fixture([source])
  snapshot.brand = {
    companyName: 'ADVANCED INTERNATIONAL INDUSTRIAL PERSONAL PROTECTION EQUIPMENT COMPANY LIMITED',
    contactLine: '', tagline: '',
    address: '1200 Industrial Avenue, Building 15, Innovation Business Park, Zhejiang Province, China, 310000; Quotation Department, Export Division',
    logo: await image(80, 40, '#333'),
  }
  const { sheet, pageBreaks } = await workbook(snapshot)
  assert.equal(sheet.getRow(1).height, 40)
  assert.ok((sheet.getRow(2).height || 0) >= 30 && (sheet.getRow(2).height || 0) <= 34)
  assert.ok(!pageBreaks.some(row => row >= 11 && row < 27), 'The complete first product fits below its realistically sized header')
  const longBrand = { ...snapshot, brand: { ...snapshot.brand, companyName: snapshot.brand.companyName.repeat(3), address: snapshot.brand.address?.repeat(4) } }
  const { sheet: longSheet } = await workbook(longBrand)
  assert.ok((longSheet.getRow(1).height || 0) > 40)
  assert.ok((longSheet.getRow(2).height || 0) > 34)
  assert.equal(longSheet.getCell('C1').value, longBrand.brand.companyName)
  assert.equal(longSheet.getCell('A2').value, `Address: ${longBrand.brand.address}`)
})

test('a continuing long product starts on the next page when its title and opening content cannot fit', async () => {
  const normal = (position: number) => ({ ...item(position), quantity: '2000', unitPrice: '3.5000', lineTotal: '7000.0000' })
  const long = { ...normal(5), specifications: Array.from({ length: 40 }, (_, index) => `Specification ${index + 1}: Original product detail`) }
  long.images = [await image(40, 80, '#555'), await image(80, 40, '#888')]
  const { sheet, pageBreaks } = await workbook(fixture([...Array.from({ length: 4 }, (_, index) => normal(index + 1)), long]))
  let first = 0
  sheet.eachRow(row => { if (row.getCell(1).value === '5') first = row.number })
  assert.equal(first, 28)
  assert.ok(pageBreaks.includes(first - 1), 'Long product must move before its title, rather than leaving the title at the page bottom')
  assert.ok(!pageBreaks.includes(first), 'Title and first specification must stay together')
})
