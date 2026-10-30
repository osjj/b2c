import assert from 'node:assert/strict'
import test from 'node:test'
import { extractCatalogSignals, getCategorySeoContent } from './category-seo-content'

test('shoe material and anti-static wording cannot create glove or flame-resistant garment labels', () => {
  const signals = extractCatalogSignals([
    'S3 Black Cowhide Steel Toe Safety Shoes',
    'S1P Low-Cut Leather Steel Toe Anti-Static Puncture-Resistant Safety Shoes',
  ])
  assert.deepEqual(signals, ['Steel toe footwear'])
})

test('PVC and waterproof rain garments are not described as footwear', () => {
  const signals = extractCatalogSignals([
    'Yellow PVC/Polyester Rain Suit Set - XL',
    'Yellow PVC/Polyester Waterproof Chemical-Resistant Raincoat',
  ])
  assert.deepEqual(signals, ['Rainwear styles'])
})

test('disposable earplugs remain hearing products rather than disposable garments', () => {
  assert.deepEqual(extractCatalogSignals([
    '3M 1100 Disposable Foam Earplugs, Individually Packed, Orange',
    'Adjustable Foldable ABS Protective Earmuffs',
  ]), ['Earplug formats', 'Earmuff formats'])
})

test('a feature cannot transfer from one product name to another product type', () => {
  const signals = extractCatalogSignals([
    'Waterproof Raincoat',
    'Industrial Safety Shoes',
    'Cowhide Leather Work Gloves',
  ])
  assert.ok(signals.includes('Leather gloves'))
  assert.ok(signals.includes('Rainwear styles'))
  assert.ok(!signals.includes('Waterproof footwear'))
})

test('materials, model codes and standards alone do not establish protection claims', () => {
  assert.deepEqual(extractCatalogSignals([
    'HPPE A5 Work Gloves',
    'Anti-Static Nonwoven Coverall',
    'NFPA Workwear Reference',
    'FR Safety Shoes',
    'PVC Industrial Boots',
  ]), ['Coverall styles'])
})

test('explicit glove constructions retain useful matching product descriptions', () => {
  assert.deepEqual(extractCatalogSignals([
    'Cut-Resistant HPPE Work Gloves with Nitrile Coating',
    'Cowhide Leather Welding Gloves',
    'Latex Coated Work Gloves',
  ]), ['Cut-resistant gloves', 'Nitrile gloves', 'Latex gloves', 'Welding gloves', 'Leather gloves'])
})

test('an FR abbreviation or model code cannot establish garment flame resistance', () => {
  assert.deepEqual(extractCatalogSignals(['FR-100 Work Jacket', 'FR Work Jacket']), [])
  assert.deepEqual(extractCatalogSignals(['Flame-Retardant Work Coverall']), [
    'Coverall styles',
    'Flame-resistant or flame-retardant garments',
  ])
})

test('explicit model names support footwear, garment and eyewear features only on those items', () => {
  const signals = extractCatalogSignals([
    'Waterproof Steel-Toe Safety Boots',
    'Flame-Retardant Anti-Static Coverall',
    'Disposable Nonwoven Coverall',
    'Anti-Fog Safety Glasses',
  ])
  assert.deepEqual(signals, [
    'Steel toe footwear',
    'Waterproof footwear',
    'Coverall styles',
    'Flame-resistant or flame-retardant garments',
    'Disposable garments',
    'Anti-fog eyewear',
  ])
})

test('unidentified products and feature words alone produce no invented product labels', () => {
  assert.deepEqual(extractCatalogSignals(['Industrial filter', 'PVC material', 'Noise control accessory', 'Leather sample']), [])
  assert.deepEqual(extractCatalogSignals([]), [])
})

test('updated category copy covers the actual eye, head and hearing product families', () => {
  const eye = getCategorySeoContent({ slug: 'eye-protection', name: 'Eye & Face Protection' })
  assert.match(eye.metaTitle, /eye.*face/i)
  assert.match(eye.heroDescription ?? '', /glasses.*goggles.*face shields/i)
  assert.match(eye.intro.join(' '), /face shields/i)
  assert.match(eye.faqs.map(({ question }) => question).join(' '), /face shield/i)

  const head = getCategorySeoContent({ slug: 'head-protection', name: 'Head Protection' })
  assert.doesNotMatch(JSON.stringify(head), /face shield/i)
  assert.match(head.heroDescription ?? '', /helmets.*bump caps.*hoods.*hearing/i)

  const hearing = getCategorySeoContent({ slug: 'hearing-protection', name: 'Hearing Protection' })
  assert.match(hearing.metaTitle, /earplugs.*earmuffs/i)
  assert.match(hearing.heroDescription ?? '', /earplugs.*earmuffs/i)
  assert.match(hearing.intro.join(' '), /earplugs.*earmuffs/i)
})

test('new and generic categories use enquiry copy without SEO implementation terms or availability promises', () => {
  for (const category of [
    { slug: 'firefighting-equipment', name: 'Firefighting Equipment' },
    { slug: 'other-supplies', name: 'Other Supplies' },
    { slug: 'unlisted-accessory', name: 'Unlisted Accessory' },
  ]) {
    const content = getCategorySeoContent(category)
    assert.doesNotMatch(JSON.stringify(content), /site architecture|internal links|live product signals|category-specific FAQ|in stock|certified/i)
    assert.match(JSON.stringify(content.faqs), /enquir|specification/i)
    assert.ok(content.metaDescription.length <= 160)
  }
})
