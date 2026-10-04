import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeLabel } from './compliance-checker/parser'
import { calculatePlan, defaultAssumptions, exportPlanCsv, roundPurchase, validHeadcount } from './ppe-calculator/calculation'

test('ASTM example M is male designation, never EN metatarsal', () => {
  const r = decodeLabel('ASTM F2413-18 M I/75 C/75 EH PR')
  assert.equal(r.matches.find(m => m.code.code === 'M')?.code.standard, 'ASTM')
  assert.match(r.matches.find(m => m.code.code === 'M')!.code.name, /Men/)
  assert.equal(r.matches.length, 5)
  assert.equal(r.unknown.length, 0)
  assert.ok(r.warnings.some(w => w.includes('legacy rating')))
})
test('case insensitive ASTM Mt and plain 2024 I/C are interpreted', () => {
  const r = decodeLabel('astm f2413-24 f i c mt eh')
  assert.equal(r.matches.length, 5)
  assert.equal(r.matches.find(m => m.code.code === 'Mt')?.code.name, 'Metatarsal protection')
})
test('EN M is metatarsal and SR is optional', () => {
  const r = decodeLabel('EN ISO 20345:2022 S3 SR M')
  assert.equal(r.matches.find(m => m.code.code === 'M')?.code.standard, 'EN-ADDON')
  assert.match(r.matches.find(m => m.code.code === 'SR')!.code.description, /Optional/)
})
test('separate ASTM and EN headers keep identical codes scoped', () => {
  const r = decodeLabel('ASTM F2413-18 M I C; EN ISO 20345:2022 S3 M C')
  assert.equal(r.matches.filter(m => m.code.code === 'M').length, 2)
  assert.equal(r.matches.filter(m => m.code.code === 'C').length, 2)
})
test('2022 rejects legacy SRC and WRU, retaining valid codes', () => {
  const r = decodeLabel('EN ISO 20345:2022 S3 SRC WRU HRO')
  assert.equal(r.matches.length, 2)
  assert.equal(r.unknown.length, 2)
  assert.ok(r.warnings.every(w => w.includes('mixed-edition')))
})
test('2011 rejects new SR/PS, includes FO and edition-specific P', () => {
  const r = decodeLabel('EN ISO 20345:2011 S3 SRC SR PS')
  assert.equal(r.matches.length, 2)
  assert.equal(r.unknown.length, 2)
  assert.match(r.matches[0].code.description, /FO/)
  assert.match(r.matches[0].code.description, /2011 does not distinguish/)
})
test('multiple EN editions remain separate', () => {
  const r = decodeLabel('EN ISO 20345:2011 S3 SRC; EN ISO 20345:2022 S3 SR')
  assert.equal(r.matches.length, 4)
  assert.equal(r.warnings.length, 0)
})
test('missing header M remains ambiguous; inferred EN is flagged', () => {
  assert.equal(decodeLabel('M').matches.length, 0)
  assert.equal(decodeLabel('M').unknown.length, 1)
  const r = decodeLabel('S3 SRC HRO')
  assert.equal(r.matches.length, 3)
  assert.ok(r.warnings.length > 0)
})
test('unknown and foreign codes cannot silently match substrings', () => {
  const r = decodeLabel('EN ISO 20345:2022 S3XYZ FP ESD EH PR')
  assert.equal(r.matches.length, 0)
  assert.equal(r.unknown.length, 5)
})
test('unsupported edition is unresolved, not silently interpreted', () => {
  const r = decodeLabel('EN ISO 20345:2030 S3 SR M')
  assert.equal(r.matches.length, 0)
  assert.equal(r.unknown.length, 3)
})
test('conformity and explicit size metadata do not become protection codes', () => {
  const r = decodeLabel('CE 0493 EN ISO 20345:2022 S3 SR Size 43 W')
  assert.equal(r.matches.length, 2)
  assert.equal(r.unknown.length, 0)
})
for (const input of ['-5','0','1.5','',' ','NaN','Infinity','1e100','9007199254740992']) {
  test(`reject invalid worker count ${JSON.stringify(input)} and block export`, () => {
    assert.equal(validHeadcount(input), false)
    const r = calculatePlan(input,'construction','single','medium',defaultAssumptions())
    assert.equal(r.valid, false)
    assert.equal(r.rows.length, 0)
    assert.equal(exportPlanCsv(input,'construction','single','medium',defaultAssumptions(),'2026-10-03'), null)
  })
}
test('default model costs USD 2371.248 per worker/year with separate rounded quantities', () => {
  const r = calculatePlan('50','construction','single','medium',defaultAssumptions())
  assert.equal(r.valid, true)
  assert.equal(r.rows.length, 12)
  assert.ok(Math.abs(r.totals.annual / 50 - 2371.248) < 0.0001)
  const hat = r.rows.find(row => row.key === 'hard-hat')!
  const boots = r.rows.find(row => row.key === 'safety-boots')!
  assert.ok(Math.abs(hat.monthlyQty - 2.2) < 0.0001)
  assert.equal(hat.monthlyPurchase, 3)
  assert.equal(hat.annualPurchase, 27)
  assert.ok(Math.abs(boots.monthlyQty - 9.9) < 0.0001)
  assert.equal(boots.monthlyPurchase, 10)
})
test('pack multiples round each horizon independently; exact integers stay exact', () => {
  assert.equal(roundPurchase(2.2, 5), 5)
  assert.equal(roundPurchase(9.9, 6), 12)
  assert.equal(roundPurchase(10.000000000000002, 5), 10)
  assert.equal(roundPurchase(10.01, 5), 15)
  assert.equal(roundPurchase(0, 10), 0)
  const a = defaultAssumptions(); a['hard-hat'].pack = '5'
  const r = calculatePlan('50','construction','single','medium',a)
  const hat = r.rows.find(row => row.key === 'hard-hat')!
  assert.equal(hat.monthlyPurchase, 5)
  assert.equal(hat.annualPurchase, 30)
})
test('editable cycle price rate and inclusion change actual plan', () => {
  const a = defaultAssumptions()
  a['hard-hat'] = {enabled:true, price:'40', usage:'20', pack:'1'}
  a['safety-boots'].enabled = false
  a['disposable-gloves'].usage = '10'
  const r = calculatePlan('50','construction','single','medium',a)
  assert.equal(r.rows.find(row => row.key === 'hard-hat')!.monthlyCost, 110)
  assert.equal(r.rows.some(row => row.key === 'safety-boots'), false)
  assert.ok(Math.abs(r.rows.find(row => row.key === 'disposable-gloves')!.monthlyQty - 550) < 0.00001)
})
test('invalid price usage and packs are rejected, overflow never exports', () => {
  for (const [field, value] of [['price','-1'], ['price',''], ['usage','0'], ['usage','NaN'], ['usage','1e-320'], ['pack','2.2'], ['pack','0']] as const) {
    const a = defaultAssumptions(); a['hard-hat'][field] = value
    assert.equal(calculatePlan('50','construction','single','medium',a).valid, false)
    assert.equal(exportPlanCsv('50','construction','single','medium',a,'2026-10-03'), null)
  }
})
test('zero item selection is invalid', () => {
  const a = defaultAssumptions(); Object.values(a).forEach(item => item.enabled = false)
  assert.equal(calculatePlan('50','construction','single','medium',a).valid, false)
})
test('CSV preserves fractional consumption, whole purchases, formulas and user inputs', () => {
  const csv = exportPlanCsv('50','construction','single','medium',defaultAssumptions(),'2026-10-03')!
  assert.ok(csv.includes('"USD"'))
  assert.ok(csv.includes('"2.2000"'))
  assert.ok(csv.includes('"Monthly whole-unit purchase"'))
  assert.ok(csv.includes('"Role multiplier","1.1"'))
  assert.equal(exportPlanCsv('50','construction','single','medium',defaultAssumptions(),''), null)
})
