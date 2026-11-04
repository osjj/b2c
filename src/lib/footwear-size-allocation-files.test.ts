import assert from 'node:assert/strict'
import test from 'node:test'

import ExcelJS from 'exceljs'

import { calculateAllocation, MAX_FILE_BYTES } from './footwear-size-allocation'
import { buildAllocationTemplate, buildAllocationWorkbook, parseAllocationText, readAllocationFile } from './footwear-size-allocation-files'

const defaults = { model: 'Default boot', color: 'Black', system: 'eu' as const }

function file(name: string, bytes: Uint8Array) {
  return { name, size: bytes.byteLength, arrayBuffer: async () => Uint8Array.from(bytes).buffer }
}

test('parses quoted CSV with headers and normalizes numeric sizes', () => {
  const parsed = parseAllocationText('model,color,system,size,quantity\r\n"Boot, A","Navy ""blue""",EU,"42,5",10\r\n', defaults)
  assert.deepEqual(parsed.errors, [])
  assert.equal(parsed.rows[0]?.model, 'Boot, A')
  assert.equal(parsed.rows[0]?.color, 'Navy "blue"')
  assert.equal(parsed.rows[0]?.size, '42.5')
})

test('parses Chinese TSV headers and headerless two-column lists using visible defaults', () => {
  const parsed = parseAllocationText('型号\t颜色\t尺码制式\t尺码\t数量\nA\t灰\tUS Men\t9.5\t3', defaults)
  assert.deepEqual(parsed.errors, [])
  assert.equal(parsed.rows[0]?.system, 'usMen')
  const simple = parseAllocationText('42\t10\n43\t5', defaults)
  assert.deepEqual(simple.errors, [])
  assert.equal(simple.rows[0]?.model, defaults.model)
  assert.equal(simple.rows[1]?.quantity, '5')
  assert.deepEqual(parseAllocationText(`${'\n'.repeat(600)}42\t10\n`, defaults).errors, [])
})

test('rejects ambiguous headers, missing columns, formulas, malformed quoting and every bad row', () => {
  for (const text of [
    'size,size,quantity\n42,42,10',
    'model,size\nBoot,42',
    'system,size,quantity\nUS,42,10',
    'size,quantity\n42,10\n43,1e2',
    'model,size,quantity\n=SUM(A1),42,10',
    'size,quantity\n"42,10',
    'size,quantity\n42,10,unexpected',
    'size,quantity,employee\n42,10,Alice',
    'constructor,size,quantity\nAlice,42,10',
    '',
  ]) {
    const parsed = parseAllocationText(text, defaults)
    assert.ok(parsed.errors.length > 0, text)
    assert.equal(parsed.rows.length, 0, text)
  }
  const tooMany = Array.from({ length: 501 }, () => '42,1').join('\n')
  assert.ok(parseAllocationText(tooMany, defaults).errors.length > 0)
})

test('rejects unsupported/oversized files before reading and reads UTF-8 CSV', async () => {
  let read = false
  const arrayBuffer = async () => { read = true; return new ArrayBuffer(0) }
  assert.ok((await readAllocationFile({ name: 'sizes.csv', size: MAX_FILE_BYTES + 1, arrayBuffer }, defaults)).errors.length)
  assert.ok((await readAllocationFile({ name: 'sizes.xls', size: 1, arrayBuffer }, defaults)).errors.length)
  assert.equal(read, false)
  const result = await readAllocationFile(file('sizes.CSV', new TextEncoder().encode('\ufeffsize,quantity\n42,10')), defaults)
  assert.deepEqual(result.errors, [])
  assert.equal(result.rows[0]?.quantity, '10')
})

test('reads only the first worksheet and rejects actual XLSX formula and error cells', async () => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('First')
  sheet.addRow(['size', 'quantity'])
  sheet.addRow([42, 10])
  workbook.addWorksheet('Ignored').addRow(['not a size'])
  let bytes = new Uint8Array(await workbook.xlsx.writeBuffer())
  assert.deepEqual((await readAllocationFile(file('sizes.xlsx', bytes), defaults)).errors, [])
  sheet.getCell('B2').value = { formula: '5+5', result: 10 }
  bytes = new Uint8Array(await workbook.xlsx.writeBuffer())
  const formula = await readAllocationFile(file('sizes.xlsx', bytes), defaults)
  assert.equal(formula.rows.length, 0)
  assert.match(formula.errors.join(' '), /row 2.*formula/i)
  sheet.getCell('B2').value = { error: '#VALUE!' }
  bytes = new Uint8Array(await workbook.xlsx.writeBuffer())
  assert.match((await readAllocationFile(file('sizes.xlsx', bytes), defaults)).errors.join(' '), /row 2.*error/i)
})

test('exports real XLSX with exact final quantities, totals, percentage and safe string cells', async () => {
  const inputs = [{ id: 'a', model: '=2+2', color: 'Black', system: 'eu' as const, size: '42', quantity: '15' }]
  const original = calculateAllocation(inputs, '10')
  const key = original.rows[0]?.key ?? ''
  const plan = calculateAllocation(inputs, '10', { [key]: '18' })
  const bytes = await buildAllocationWorkbook(plan)
  assert.ok(bytes)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Uint8Array.from(bytes).buffer)
  const sheet = workbook.worksheets[0]
  assert.ok(sheet)
  assert.equal(sheet.getCell('A2').value, '=2+2')
  assert.equal(sheet.getCell('A2').type, ExcelJS.ValueType.String)
  assert.equal(sheet.getCell('E2').value, 15)
  assert.equal(sheet.getCell('F2').value, 2)
  assert.equal(sheet.getCell('G2').value, 17)
  assert.equal(sheet.getCell('H2').value, 18)
  assert.equal(sheet.getCell('I2').value, 'Yes')
  const content = JSON.stringify(sheet.getSheetValues())
  assert.match(content, /Spare percentage/)
  assert.match(content, /10%/)
  assert.match(content, /confirm.*fit/i)
  assert.match(content, /Totals/)
  assert.equal(await buildAllocationWorkbook(calculateAllocation([], '0')), null)
  assert.equal(await buildAllocationWorkbook({ ...plan, totals: { ...plan.totals, order: 19 } }), null)
})

test('downloadable XLSX template imports successfully and invalid workbooks fail clearly', async () => {
  const bytes = await buildAllocationTemplate()
  const result = await readAllocationFile(file('template.xlsx', bytes), defaults)
  assert.deepEqual(result.errors, [])
  assert.ok(result.rows.length > 0)
  assert.ok((await readAllocationFile(file('invalid.xlsx', new TextEncoder().encode('invalid')), defaults)).errors.length > 0)
})

test('bounds the actual file bytes and worksheet rows, and reports read failures', async () => {
  const oversized = new Uint8Array(MAX_FILE_BYTES + 1)
  const hiddenSize = { ...file('sizes.csv', oversized), size: 10 }
  assert.match((await readAllocationFile(hiddenSize, defaults)).errors.join(' '), /2 MiB/)
  assert.ok((await readAllocationFile({ name: 'sizes.csv', size: 1, arrayBuffer: async () => { throw new Error('read denied') } }, defaults)).errors.length)
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Sizes')
  sheet.addRow(['size', 'quantity'])
  for (let i = 0; i < 501; i++) sheet.addRow([42, 1])
  assert.match((await readAllocationFile(file('sizes.xlsx', new Uint8Array(await workbook.xlsx.writeBuffer())), defaults)).errors.join(' '), /500/)
})
