import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGloveMarkingReport, decodeGloveMarking, MAX_GLOVE_INPUT_LENGTH } from './glove-marking-decoder'

test('decodes separately scoped modern mechanical and thermal references', () => {
  const result = decodeGloveMarking('EN388:2016+A1:2018 4X43CP; EN407:2020 X1XXXX')
  assert.equal(result.inputError, null)
  assert.equal(result.hasDecodedFields, true)
  assert.equal(result.sections.length, 2)
  assert.equal(result.sections[0]?.edition, '2016+A1:2018')
  assert.equal(result.sections[0]?.fields.length, 6)
  assert.equal(result.sections[0]?.fields[4]?.name, 'TDM cut resistance')
  assert.equal(result.sections[0]?.fields[5]?.status, 'rated')
  assert.match(result.sections[0]?.fields[5]?.meaning ?? '', /passed.*impact/i)
  assert.equal(result.sections[1]?.fields.length, 6)
  assert.match(result.sections[1]?.fields[1]?.meaning ?? '', /100°C.*laboratory/i)
  assert.equal(result.sections[1]?.complete, true)
})

test('requires an edition and uses only an explicit matching fallback for missing context', () => {
  assert.equal(decodeGloveMarking('4X43F').hasDecodedFields, false)
  assert.equal(decodeGloveMarking('111111').hasDecodedFields, false)
  const bare = decodeGloveMarking('4X43F', { standard: 'EN388', edition: '2016' })
  assert.equal(bare.sections[0]?.fields[4]?.code, 'F')
  assert.equal(bare.sections[0]?.fields[4]?.status, 'rated')
  assert.match(bare.sections[0]?.warnings.join(' ') ?? '', /explicit.*context/i)
  assert.equal(decodeGloveMarking('EN388 4X43F').hasDecodedFields, false)
  assert.equal(decodeGloveMarking('EN388 4X43F', { standard: 'EN388', edition: '2016' }).hasDecodedFields, true)
  assert.equal(decodeGloveMarking('EN407 X1XXXX', { standard: 'EN388', edition: '2016' }).hasDecodedFields, false)
})

test('never overrides explicit unsupported editions or strips unknown amendments', () => {
  for (const input of ['EN388:2019 4X43C', 'EN388:2016+A2:2020 4X43C', 'EN388:2016+A1:2018junk 4X43C', 'EN407:2020+A1:2022 X1XXXX']) {
    const result = decodeGloveMarking(input, { standard: 'EN388', edition: '2016' })
    assert.equal(result.hasDecodedFields, false, input)
    assert.equal(result.sections[0]?.complete, false)
    assert.match(result.sections[0]?.warnings.join(' ') ?? '', /unsupported/i)
  }
  const headerWins = decodeGloveMarking('EN388:2003 254X', { standard: 'EN388', edition: '2016' })
  assert.equal(headerWins.sections[0]?.fields.length, 4)
  assert.equal(headerWins.sections[0]?.edition, '2003')
  assert.equal(decodeGloveMarking('EN 388 2003 254X').sections[0]?.edition, '2003')
  assert.equal(decodeGloveMarking('EN 388 2019 4X43C', { standard: 'EN388', edition: '2003' }).hasDecodedFields, false)
})

test('distinguishes legacy four positions, zero, X, and edition-specific thermal names', () => {
  const legacy = decodeGloveMarking('EN388:2003 254X')
  assert.equal(legacy.sections[0]?.fields.length, 4)
  assert.equal(legacy.sections[0]?.fields[1]?.code, '5')
  assert.equal(legacy.sections[0]?.fields[3]?.status, 'not-tested')
  const zero = decodeGloveMarking('EN407:2004 0X1234').sections[0]?.fields
  assert.equal(zero?.[0]?.status, 'below-level-1')
  assert.equal(zero?.[1]?.status, 'not-tested')
  assert.equal(zero?.[0]?.name, 'Burning behaviour')
  assert.equal(decodeGloveMarking('EN407:2020 0X1234').sections[0]?.fields[0]?.name, 'Limited flame spread')
  assert.equal(decodeGloveMarking('EN388:2003 4X43C').hasDecodedFields, false)
})

test('keeps TDM F separate from terminal manufacturer impact notation and missing suffix', () => {
  const noSuffix = decodeGloveMarking('EN388:2016 4X43F').sections[0]
  assert.equal(noSuffix?.fields.length, 5)
  assert.equal(noSuffix?.fields[4]?.status, 'rated')
  assert.match(noSuffix?.warnings.join(' ') ?? '', /no passed-impact.*shown/i)
  for (const suffix of ['F', 'X']) {
    const section = decodeGloveMarking(`EN388:2016 4X43C${suffix}`).sections[0]
    assert.equal(section?.fields[5]?.status, 'unresolved')
    assert.match(section?.fields[5]?.meaning ?? '', /manufacturer.*confirm/i)
    assert.match(section?.warnings.join(' ') ?? '', /no passed-impact/i)
  }
})

test('rejects wrong domains and complete invalid tokens without decoding valid substrings', () => {
  const badMechanical = decodeGloveMarking('EN388:2016 5X43G').sections[0]
  assert.equal(badMechanical?.fields[0]?.status, 'unresolved')
  assert.equal(badMechanical?.fields[4]?.status, 'unresolved')
  assert.equal(badMechanical?.complete, false)
  for (const input of ['EN388:2016 prefix4X43Csuffix', 'EN388:2016 4X43Cjunk', 'EN388:2016 4X43CP7', 'EN407:2020 X1XXX', 'EN407:2020 X1XXXXjunk']) {
    assert.equal(decodeGloveMarking(input).hasDecodedFields, false, input)
  }
  assert.equal(decodeGloveMarking('EN407:2020 X5XXXX').sections[0]?.fields[1]?.status, 'unresolved')
})

test('normalizes spacing/case without joining codes across CE, body, size or unknown standard scopes', () => {
  const spaced = decodeGloveMarking('en 388 : 2016 + a1 : 2018 4 x 4 3 c p; EN 407 : 2020 x 1 x x x x')
  assert.equal(spaced.sections[0]?.marking, '4X43CP')
  assert.equal(spaced.sections[1]?.marking, 'X1XXXX')
  assert.equal(decodeGloveMarking('EN388:2003 CE 1234').hasDecodedFields, false)
  assert.equal(decodeGloveMarking('EN388:2003 size 1234').hasDecodedFields, false)
  const unknown = decodeGloveMarking('EN388:2016 4X43C EN511:2006 111 EN407:2020 X1XXXX CE 0123 size 9')
  assert.equal(unknown.sections.length, 2)
  assert.ok(unknown.unknown.some((text) => text.includes('EN511:2006 111')))
  assert.ok(unknown.sections[1]?.unknown.some((text) => text.includes('CE 0123 size 9')))
  assert.equal(decodeGloveMarking('EN388:2016 EN511:2006 4X43C').hasDecodedFields, false)
  assert.equal(decodeGloveMarking('EN388:2016 ENISO374-1:2016 4X43C').hasDecodedFields, false)
  assert.equal(decodeGloveMarking('EN388:2016 ASTM F2992 4X43C').hasDecodedFields, false)
})

test('unknown foreign standards and malformed header-like tokens close the preceding standard scope', () => {
  assert.equal(decodeGloveMarking('EN388:2016 EN407A:2020 X1XXXX').hasDecodedFields, false)
  for (const foreign of ['AS/NZS 2161.3:2020', 'JIS T 8116:2005', 'GB 24541:2009', 'ANSIISEA105:2016', 'CSA Z195:2014', 'EN407A:2020', 'EN388XYZ:2016', 'FOO 1234:2020']) {
    const input = `EN388:2016 ${foreign} 4X43CP`
    const result = decodeGloveMarking(input)
    assert.equal(result.hasDecodedFields, false, input)
    assert.ok(result.unknown.some((text) => text.includes(foreign) && text.includes('4X43CP')), input)
    assert.equal(buildGloveMarkingReport(input), null)
  }
  const separated = decodeGloveMarking('EN388:2016 4X43C AS/NZS 2161.3:2020 4X43CP; EN407:2020 X1XXXX')
  assert.equal(separated.sections[0]?.marking, '4X43C')
  assert.equal(separated.sections[1]?.standard, 'EN407')
  assert.ok(separated.unknown.some((text) => text.includes('AS/NZS')))
})

test('metadata clauses consume complete size/model/body runs rather than joining their remaining digits', () => {
  for (const clause of ['Sizes 1 2 3 4 4', 'Size: 1 2 3 4 4', 'CE 0 1 2 3 4', 'CE No. 0123', 'CE notified body 0123', 'Notified body: 0123', 'Model A 2 3 4 4', 'Reference AB 2 3 4 4']) {
    const result = decodeGloveMarking(`EN388:2003 ${clause}`)
    assert.equal(result.hasDecodedFields, false, clause)
    assert.ok(result.sections[0]?.unknown.some((text) => text.includes(clause)), clause)
  }
  assert.equal(decodeGloveMarking('EN388:2003 Sizes 1 2 3 4 4; 2 5 4 X').sections[0]?.marking, '254X')
  assert.equal(decodeGloveMarking('EN388:2016 model:4X43CP').hasDecodedFields, false)
})

test('empty input is neutral and bounded input or section overflow produces no partial decoding', () => {
  assert.deepEqual(decodeGloveMarking('  '), { sections: [], warnings: [], unknown: [], inputError: null, hasDecodedFields: false })
  assert.equal(buildGloveMarkingReport(''), null)
  for (const text of ['x'.repeat(MAX_GLOVE_INPUT_LENGTH + 1), Array.from({ length: 9 }, () => 'EN388:2016 4X43C').join('; ')]) {
    const result = decodeGloveMarking(text)
    assert.ok(result.inputError)
    assert.equal(result.sections.length, 0)
    assert.equal(buildGloveMarkingReport(text), null)
  }
})

test('complete report preserves input/context, every decoded position, unknown text and procurement caveats', () => {
  const input = 'Batch Alpha EN388:2016 4X43F CE 0123; EN407:2020 X2XXXX extra-note'
  const report = buildGloveMarkingReport(input, { standard: 'EN388', edition: '2003' })
  assert.ok(report)
  assert.ok(report.includes(input))
  for (const expected of ['2003', 'TDM cut resistance', '250°C', 'laboratory', 'extra-note', 'CE 0123', 'not a safe-use temperature', 'certification', 'ANSI', 'instructions', '2026-10-30', 'satra.com', 'atg-glovesolutions.com']) assert.ok(report.includes(expected), expected)
  assert.equal(buildGloveMarkingReport('EN388:2019 4X43C'), null)
})
