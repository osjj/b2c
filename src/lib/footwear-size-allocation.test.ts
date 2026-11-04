import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateAllocation, MAX_INPUT_ROWS } from './footwear-size-allocation'
import type { AllocationInputRow } from './footwear-size-allocation'

function input(overrides: Partial<AllocationInputRow> = {}): AllocationInputRow {
  return { id: 'row-1', model: 'Boot 2', color: 'Black', system: 'eu', size: '42', quantity: '10', ...overrides }
}

test('merges matching sizes before rounding suggested spares upward', () => {
  const plan = calculateAllocation([input(), input({ id: 'row-2', quantity: '5', size: '042,00', model: ' Boot 2 ' })], '10')
  assert.equal(plan.valid, true)
  assert.equal(plan.rows.length, 1)
  assert.deepEqual(plan.totals, { workers: 15, spares: 2, order: 17 })
  assert.equal(plan.rows[0]?.size, '42')
  assert.equal(plan.rows[0]?.suggestedQuantity, 17)
})

test('keeps models, colors and exact regional systems separate and sorts naturally', () => {
  const plan = calculateAllocation([
    input({ id: 'a', model: 'Boot 10', size: '9' }),
    input({ id: 'b', size: '10' }),
    input({ id: 'c', size: '9.500' }),
    input({ id: 'd', color: 'Blue' }),
    input({ id: 'e', system: 'uk' }),
  ], '0')
  assert.equal(plan.valid, true)
  assert.equal(plan.rows.length, 5)
  assert.equal(plan.rows[0]?.size, '9.5')
  assert.equal(plan.rows[1]?.size, '10')
  assert.equal(plan.rows[4]?.model, 'Boot 10')
  assert.equal(plan.totals.spares, 0)
})

test('uses integer percentage arithmetic to avoid extra spares at exact boundaries', () => {
  const plan = calculateAllocation([input({ quantity: '100' })], '7')
  assert.equal(plan.rows[0]?.spares, 7)
  assert.equal(calculateAllocation([input({ quantity: '10000' })], '0.01').rows[0]?.spares, 1)
})

test('applies final overrides and restores recommendations for empty overrides', () => {
  const base = calculateAllocation([input({ quantity: '15' })], '10')
  const key = base.rows[0]?.key ?? ''
  const adjusted = calculateAllocation([input({ quantity: '15' })], '10', { [key]: '18' })
  assert.equal(adjusted.rows[0]?.orderQuantity, 18)
  assert.equal(adjusted.rows[0]?.overridden, true)
  assert.deepEqual(adjusted.totals, { workers: 15, spares: 3, order: 18 })
  assert.equal(calculateAllocation([input({ quantity: '15' })], '10', { [key]: ' ' }).rows[0]?.orderQuantity, 17)
  for (const value of ['14', '-1', '18.0', '1e2', '1000001']) {
    const invalid = calculateAllocation([input({ quantity: '15' })], '10', { [key]: value })
    assert.equal(invalid.valid, false, value)
    assert.equal(invalid.errors[0]?.rowId, key)
  }
  assert.equal(calculateAllocation([input()], '0', { stale: '20' }).valid, false)
})

test('permits grouped and overridden quantities above the per-input limit', () => {
  const rows = [input({ quantity: '100000' }), input({ id: 'second', quantity: '100000' })]
  const initial = calculateAllocation(rows, '0')
  const key = initial.rows[0]?.key ?? ''
  const plan = calculateAllocation(rows, '0', { [key]: '250000' })
  assert.equal(plan.valid, true)
  assert.equal(plan.rows[0]?.quantity, 200000)
  assert.equal(plan.rows[0]?.orderQuantity, 250000)
})

test('rejects invalid rows without producing a partial usable plan', () => {
  for (const quantity of ['0', '-1', '1.5', '10.0', '1e2', '100001', 'Infinity', '']) {
    const plan = calculateAllocation([input(), input({ id: 'bad', quantity })], '0')
    assert.equal(plan.valid, false, quantity)
    assert.equal(plan.rows.length, 0)
    assert.ok(plan.errors.some((error) => error.rowId === 'bad'))
  }
  for (const size of ['0', '0.25', '70.5', '42.25', '4e1', 'EU42', '']) {
    assert.equal(calculateAllocation([input({ size })], '0').valid, false, size)
  }
  for (const sparePercent of ['-1', '100.01', '0.001', '1e1', '']) {
    assert.equal(calculateAllocation([input()], sparePercent).valid, false, sparePercent)
  }
  const unsupported = input()
  Object.assign(unsupported, { system: 'us' })
  assert.equal(calculateAllocation([unsupported], '0').valid, false)
  assert.equal(calculateAllocation([input({ model: 'a'.repeat(65) })], '0').valid, false)
  assert.equal(calculateAllocation([input({ color: 'a'.repeat(33) })], '0').valid, false)
})

test('bounds row counts, base totals and final totals; empty input is unusable', () => {
  assert.equal(calculateAllocation([], '0').valid, false)
  assert.equal(calculateAllocation([input({ model: '', color: '', size: '', quantity: '' })], '0').valid, false)
  assert.equal(calculateAllocation(Array.from({ length: MAX_INPUT_ROWS + 1 }, (_, i) => input({ id: String(i) })), '0').valid, false)
  const million = Array.from({ length: 10 }, (_, i) => input({ id: String(i), quantity: '100000' }))
  assert.equal(calculateAllocation(million, '0').valid, true)
  assert.equal(calculateAllocation(million, '0.01').valid, false)
  assert.equal(calculateAllocation([...million, input()], '0').valid, false)
})
