import assert from 'node:assert/strict'
import test from 'node:test'
import { moveLine, parseLinePosition } from './line-order'
import { blankQuotation, toQuotationInput, type SimpleLine } from './simple-input'
import { defaultWorkbenchSettings } from './workbench-config'

test('typed positions accept only whole numbers within the current line count', () => {
  for (const [input, expected] of [['1', 1], ['3', 3], [' 02 ', 2]] as const) assert.equal(parseLinePosition(input, 3), expected)
  for (const input of ['', ' ', '0', '4', '-1', '1.5', '1.0', '1e0', '+1', 'abc', 'Infinity', '9007199254740993']) assert.equal(parseLinePosition(input, 3), null, input)
  assert.equal(parseLinePosition('1', 1), 1)
  assert.equal(parseLinePosition('1', 0), null)
})

test('moving a line inserts the complete row and keeps references and images together', () => {
  const lines: SimpleLine[] = Array.from({ length: 3 }, (_, index) => ({
    id: `c${String(index + 1).padStart(24, '0')}`,
    name: `Product ${index + 1}`, description: `Description ${index + 1}`, quantity: String(index + 2), unit: 'pcs', unitPrice: `${index + 1}.25`,
    images: [{ id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`, kind: 'source', name: `Image ${index + 1}` }],
  }))
  const original = structuredClone(lines)
  const keys = ['row-a', 'row-b', 'row-c']
  const reordered = moveLine(lines, 2, 0)
  assert.deepEqual(reordered.map(row => row.name), ['Product 3', 'Product 1', 'Product 2'])
  assert.equal(reordered[0], lines[2])
  assert.equal(reordered[0].images, lines[2].images)
  assert.deepEqual(moveLine(keys, 2, 0), ['row-c', 'row-a', 'row-b'])
  assert.deepEqual(lines, original, 'The input array and all commercial fields stay untouched')
  assert.deepEqual(moveLine(reordered, 0, 2), lines)

  const quotation = blankQuotation(defaultWorkbenchSettings)
  quotation.customerName = 'Ordering fixture'
  quotation.items = reordered
  const input = toQuotationInput(quotation)
  assert.deepEqual(input.items.map(row => ({ id: row.id, sortOrder: row.sortOrder, name: row.nameEn, quantity: row.quantity, price: row.unitPrice, images: row.imageSourceIds })), [2, 0, 1].map((originalIndex, sortOrder) => ({ id: lines[originalIndex].id, sortOrder, name: lines[originalIndex].name, quantity: lines[originalIndex].quantity, price: lines[originalIndex].unitPrice, images: lines[originalIndex].images.map(image => image.id) })))
})

test('same-position and invalid moves do not create a new order', () => {
  const rows = [{ id: 'a' }, { id: 'b' }]
  for (const [from, to] of [[0, 0], [-1, 1], [0, 2], [2, 0], [0, -1], [0.5, 1], [0, NaN]]) assert.equal(moveLine(rows, from, to), rows)
  const single = [{ id: 'only' }]
  assert.equal(moveLine(single, 0, 0), single)
})
