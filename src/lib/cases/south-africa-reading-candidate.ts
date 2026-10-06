import assert from 'node:assert/strict'

import { caseInputSchema, caseViewSchema, emptyCaseInput, hasCasePrivateImages } from './types'
import type { CaseView } from './types'

export const SOUTH_AFRICA_READING_SLUG = 'south-africa-mining-ppe-procurement-2026'
export const SOUTH_AFRICA_READING_ID = 'cmuu1gcon0000um188vsx2o88'
export const SOUTH_AFRICA_READING_VERSION = 11

/** Reviewed public media identity, including the owner's replacement helmet image. */
export const SOUTH_AFRICA_READING_MEDIA = [
  '2becdc7c1d4830eea62705e2faf575cca333a76dbdc82f5276c782211b2fbf4b.png',
  'ceff3d858db3a90f8309b40d29b8badb093b70b7457860fac9820527a4e35bde.png',
  '83e296c1a0476ccebc84f08f30a0bde9754e9841800e60ae3c3e632dc3805ebb.png',
  '9c0b5177b0182cee12ba94b54bbc571705840c4535023a54003430bbb1bed6cc.jpg',
  'dd2dfc6aecca8bf3ae49d342492672920a0cd7b236b6f9be0ecfb3a21465a1fe.jpg',
  '3049462c68c214ad3461a4b0ebce62214dd12d97cd1df2458ac306224d3d487e.jpg',
  '/products/1791256803027-ae2z9.webp',
  'b1bc7c049f3c9df3838b804510878c819227c7aa22324ad8553a5b7ef0d8cc03.png',
  '77780c67ceacfd7a0c663c6b1aece9a5b3e2e9f590e5f083ddf1bb790a8e66ad.jpg',
  'af71163bfc1dec52858a7476f1a084e6b2b8e237d335af9568f2ccd05db21581.png',
  '7eaeaeb29fd5dc6386c95ab81b7cd76b702eb63c51f1616c8a4cf277f48ad465.png',
  '1807c7978bde71adcb300ad9ae55bda684131399d7d9129ac3eefdaa819ad122.png',
  '8c0de755730ad0e31c566e714e387ed1aa120b55a71ca4d684726f20548751cf.png',
  '43aebe93b70b2f7775f8712265b43dc1bfc79192b9883dcc2748296b7923a02f.png',
  '6fd44673e68fdd7cd12e36095df780040cbb605cb1b68214c5dffecba696e055.png',
  '4fa55a2ebcdb1b184327c8b70c8c12d30200ae01435711d9557e6244daf55d06.png',
].map((path) => path.startsWith('/') ? path : `/cases/${SOUTH_AFRICA_READING_SLUG}/${path}`)

/** Local editorial candidate only. There is deliberately no persistence operation. */
export function southAfricaReadingCandidate(input: CaseView): CaseView {
  const source = caseViewSchema.parse(input)
  assert.equal(source.id, SOUTH_AFRICA_READING_ID, 'Unexpected source case identity')
  assert.equal(source.version, SOUTH_AFRICA_READING_VERSION, 'Source version changed; review the current facts before rewriting')
  assert.equal(source.slug, SOUTH_AFRICA_READING_SLUG, 'Unexpected source case')
  assert.equal(source.cooperationDate, '2026-08-02', 'Source facts changed; review before preparing a candidate')
  assert.equal(source.country, 'South Africa')
  assert.equal(source.industry, 'Mining')
  assert.equal(hasCasePrivateImages(source), false, 'Use the current public source, not private draft media')
  assert.equal(source.gallery.length, 16, 'Source media changed; review before regrouping')
  assert.deepEqual(source.gallery.map(({ url }) => new URL(url).pathname), SOUTH_AFRICA_READING_MEDIA, 'Reviewed media identity or order changed; review before rewriting captions')
  assert.equal(source.coverImage, source.gallery[0].url)
  assert.deepEqual(source.procurement.map(({ name, quantity, unit }) => [name, quantity, unit]), [
    ['Safety helmets', 500, 'pieces'], ['Cut-resistant gloves', 1200, 'pairs'], ['Cotton yarn gloves', 4800, 'pairs'],
    ['Safety shoes', 200, 'pairs'], ['Safety rain boots', 200, 'pairs'], ['Workwear', 200, 'sets'],
  ], 'Source order changed; review before rewriting')
  const expectedPlacements = ['buyer-visit', 'buyer-visit', 'gloves-workshop', 'footwear-rain-boots', 'footwear-rain-boots', 'workwear-branding', 'helmet-branding', 'packing-loading', 'packing-loading', 'gloves-workshop', 'footwear-rain-boots', 'helmet-branding', 'workwear-branding', 'warehouse-progress', 'packing-loading', 'quotation-preparation']
  assert.deepEqual(source.gallery.map(({ placement }) => placement), expectedPlacements.map((key) => `section:${key}`), 'Media order or placement changed; review before regrouping')
  const paths = ['/categories/head-protection', '/categories/hand-protection', '/categories/hand-protection', '/categories/foot-protection', '/categories/foot-protection', '/categories/body-protection']
  const captions = [
    'The buyer and LAIFAPPE team reviewing PPE samples at the store.',
    'The buyer visiting the LAIFAPPE team in China.',
    'Viewing glove-production equipment during the factory visit.',
    'Black footwear sample from the procurement records.',
    'Grey footwear sample from the procurement records.',
    'Workwear sample; the specified right-chest and back logos are not visible.',
    'Helmet sample; the specified blue logo is not visible.',
    'Wrapped cartons on warehouse pallets.',
    'Cartons being handled at a goods vehicle.',
    'Protective-glove examination document supplied with the case notes.',
    'Voluntary conformity document supplied for rain boots.',
    'Helmet document, page 2 of 2. The main page is unavailable here.',
    'Voluntary conformity document supplied for workwear; no flame-resistance or chemical-protection rating is established.',
    'Warehouse tracking through outbound dispatch on 4 September 2026; no final-delivery receipt.',
    'Night-time container loading. The date and completion of the full load are not established.',
    'Quotation format example, page 1 of 8 and part of the next page, with prices obscured. It is not the accepted quotation or PI; its pcs unit does not replace the confirmed 200 sets.',
  ]
  const documentIndexes = new Set([9, 10, 11, 12, 13, 15])
  const placements = ['section:buyer-visit', 'section:buyer-visit', 'section:buyer-visit', 'section:product-samples', 'section:product-samples', 'section:product-samples', 'section:product-samples', 'section:packing-loading', 'section:packing-loading', 'section:product-samples', 'section:product-samples', 'section:product-samples', 'section:product-samples', 'project-timeline', 'section:packing-loading', 'section:quotation-preparation']
  const candidate = caseViewSchema.parse({
    ...source,
    title: 'South Africa Mining PPE Procurement',
    summary: 'A six-category PPE order, following an in-person visit in China. The buyer specified helmet logo printing and workwear branding; this case records the quantities, preparation and warehouse dispatch.',
    buyerProfile: 'An anonymous South African mining company with more than 600 employees. This workforce figure describes the buyer’s company; the order quantities are listed separately below.',
    procurement: source.procurement.map((item, index) => ({ ...item, href: paths[index] })),
    sections: [
      { key: 'buyer-visit', title: 'Buyer visit and glove workshop', body: 'The buyer met the LAIFAPPE team at the store in China and reviewed gloves, a helmet and footwear samples. The visit continued to factories, including a glove workshop where the buyer viewed production equipment and processes.' },
      { key: 'product-samples', title: 'Product samples and supporting documents', body: 'The sample records include two footwear designs, a white helmet and orange workwear with silver-colored strips. The final ordered footwear model has not been matched to these photographs. The helmet’s blue logo and the workwear’s right-chest and back logos are not visible in the sample images.\n\nThe supporting glove, rain-boot, helmet and workwear documents are supplied records. Their authenticity and correspondence to the ordered models have not been independently verified; they do not establish certification of this order.' },
      { key: 'quotation-preparation', title: 'Quotation, preparation and video review', body: 'After accepting the quotation and pro forma invoice, the buyer paid a 30% deposit. Preparation took approximately ten days for this order. The buyer reviewed the ready goods by video, paid the balance and arranged shipment to the freight forwarder’s warehouse. This preparation period is specific to the case.\n\nThe supporting screenshot illustrates a quotation format, with prices obscured. Its specifications, MOQ and date are not additional order facts.' },
      { key: 'packing-loading', title: 'Packing and warehouse dispatch', body: 'The photographs record wrapped cartons on pallets, goods handling at a vehicle and night-time container loading. The freight forwarder’s dated warehouse milestones are listed below.\n\nThe logistics arrangement included export and import customs clearance and door delivery. Available tracking ends at warehouse dispatch; final delivery has not been verified.' },
    ],
    gallery: source.gallery.map((image, index) => ({ ...image, caption: captions[index], placement: placements[index], kind: documentIndexes.has(index) ? 'document' : 'photo' })),
    relatedLinks: [
      { label: 'PPE for mining and quarrying', href: '/solutions/ppe-safety-equipment-for-mining-quarrying' },
      { label: 'Mining PPE checklist by task', href: '/blog/mining-ppe-checklist-by-task' },
    ],
  })
  caseInputSchema.parse({ ...emptyCaseInput(), ...candidate, status: 'PUBLISHED', publicationApproved: true })
  assert.deepEqual(candidate.gallery.map(({ url, alt }) => ({ url, alt })), source.gallery.map(({ url, alt }) => ({ url, alt })))
  assert.deepEqual(candidate.timeline, source.timeline)
  assert.equal(candidate.customization, source.customization)
  return candidate
}
