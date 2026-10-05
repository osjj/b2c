import assert from 'node:assert/strict'
import test from 'node:test'
import { caseImagesAt, caseSectionPlacement, caseUnplacedImages, clearCaseSectionPlacement, initializeCaseSectionKeys } from './layout'
import { emptyCaseInput, type CaseInput } from './types'

const evidence = (index: number, placement?: string) => ({ url: `/cases/image-${index}.png`, alt: `Original image ${index}`, caption: `Record ${index}`, ...(placement === undefined ? {} : { placement }) })

function fixture(): CaseInput {
  return {
    ...emptyCaseInput(), title: 'Case', slug: 'case', buyerProfile: 'Buyer record', customization: 'Logo instructions',
    procurement: [{ name: 'Gloves', quantity: 1200, unit: 'pairs', note: '' }],
    sections: [{ key: 'store-visit', title: 'Store visit', body: 'Recorded meeting' }, { key: 'glove-workshop', title: 'Workshop', body: 'Recorded visit' }],
    timeline: [{ date: '', label: 'Warehouse', description: 'Recorded milestone' }],
    gallery: [evidence(0, 'section:glove-workshop'), evidence(1), evidence(2, 'buyer-context'), evidence(3, 'section:glove-workshop'), evidence(4, 'section:removed'), evidence(5, '')],
  }
}

test('exact contextual assignments preserve original indexes and render each image once', () => {
  const value = fixture()
  assert.deepEqual(caseImagesAt(value, 'section:glove-workshop').map(({ index }) => index), [0, 3])
  assert.deepEqual(caseImagesAt(value, 'buyer-context').map(({ index }) => index), [2])
  assert.deepEqual(caseUnplacedImages(value).map(({ index }) => index), [1, 4, 5])
  const rendered = [...caseImagesAt(value, 'section:glove-workshop'), ...caseImagesAt(value, 'buyer-context'), ...caseUnplacedImages(value)]
  assert.deepEqual(rendered.map(({ index }) => index).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5])
  assert.equal(caseImagesAt(value, 'section:glove-workshop')[0].image, value.gallery[0], 'The original record is retained')
})

test('legacy images and invalid empty or duplicate targets remain available', () => {
  const value = fixture()
  value.buyerProfile = ' '
  value.sections = [{ key: 'glove-workshop', title: 'One', body: 'One' }, { key: 'glove-workshop', title: 'Two', body: 'Two' }]
  assert.deepEqual(caseImagesAt(value, 'buyer-context'), [])
  assert.deepEqual(caseImagesAt(value, 'section:glove-workshop'), [])
  assert.equal(caseUnplacedImages(value).length, value.gallery.length)
  value.sections = [{ title: 'Legacy narrative', body: 'Legacy body' }]
  value.gallery = [evidence(0), evidence(1, 'not-a-placement'), evidence(2, 'section:glove-workshop')]
  assert.equal(caseUnplacedImages(value).length, 3)
  assert.equal(caseSectionPlacement(value.sections[0], 0), 'legacy-section-1')
  assert.equal(caseSectionPlacement({ key: 'Bad/key' }, 1), 'legacy-section-2')
})

test('renaming and moving a section do not change its identity or assignments', () => {
  const value = fixture()
  const workshop = value.sections[1]
  const placement = caseSectionPlacement(workshop, 1)
  value.sections = [{ ...workshop, title: 'Renamed workshop heading' }, value.sections[0]]
  assert.equal(caseSectionPlacement(value.sections[0], 0), placement)
  assert.deepEqual(caseImagesAt(value, placement).map(({ index }) => index), [0, 3])
  value.gallery = [value.gallery[3], ...value.gallery.filter((_, index) => index !== 3)]
  assert.deepEqual(caseImagesAt(value, placement).map(({ image }) => image.url), ['/cases/image-3.png', '/cases/image-0.png'])
})

test('editor initializes only missing keys with unique stable identities', () => {
  const original = [{ key: 'story-visit', title: 'Existing title', body: 'Body' }, { title: 'Visit', body: 'Body' }, { key: '', title: 'Visit', body: 'Body' }, { title: '中文', body: 'Body' }]
  const initialized = initializeCaseSectionKeys(original)
  assert.deepEqual(initialized.map(({ key }) => key), ['story-visit', 'story-visit-2', 'story-visit-3', 'story-4'])
  assert.deepEqual(initializeCaseSectionKeys(initialized), initialized)
  assert.equal('key' in original[1], false, 'Initialization does not mutate the saved source')
  const moved = [initialized[2], { ...initialized[1], title: 'Another heading' }, initialized[0]]
  assert.deepEqual(initializeCaseSectionKeys(moved).map(({ key }) => key), ['story-visit-3', 'story-visit-2', 'story-visit'])
})

test('section deletion releases assigned images without removing or altering evidence', () => {
  const value = fixture()
  const original = value.gallery.map((image) => ({ ...image }))
  const gallery = clearCaseSectionPlacement(value.gallery, 'glove-workshop')
  value.sections = value.sections.filter(({ key }) => key !== 'glove-workshop')
  value.gallery = gallery
  assert.equal(gallery.length, original.length)
  assert.deepEqual(gallery.map(({ url, alt, caption }) => ({ url, alt, caption })), original.map(({ url, alt, caption }) => ({ url, alt, caption })))
  assert.equal(gallery[0].placement, '')
  assert.equal(gallery[3].placement, '')
  assert.equal(gallery[2].placement, 'buyer-context')
  assert.deepEqual(caseUnplacedImages(value).map(({ index }) => index), [0, 1, 3, 4, 5])
  assert.deepEqual(clearCaseSectionPlacement(original, undefined), original)
  assert.equal(original[0].placement, 'section:glove-workshop', 'Original data is not mutated')
})
