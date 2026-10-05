import assert from 'node:assert/strict'
import test from 'node:test'
import { caseNumber, formatCaseDate, serializeCaseJsonLd } from './case-format'

test('calendar dates remain the cooperation date in every local timezone', () => {
  assert.equal(formatCaseDate('2026-08-02'), '02 Aug 2026')
  assert.equal(formatCaseDate('2026-09-04T00:00:00.000Z'), '04 Sept 2026')
})

test('case numbering is visual sequencing, not a total across different order units', () => {
  assert.equal(caseNumber(0), '01')
  assert.equal(caseNumber(9), '10')
  assert.equal(caseNumber(100), '101')
})

test('JSON-LD cannot close its script element and retains source text after parsing', () => {
  const input = { headline: '</script><script>alert(1)</script>', description: 'Helmets & gloves' }
  const serialized = serializeCaseJsonLd(input)
  assert.equal(serialized.includes('<'), false)
  assert.equal(serialized.includes('</script>'), false)
  assert.deepEqual(JSON.parse(serialized), input)
})
