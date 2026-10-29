import assert from 'node:assert/strict'

import { SOUTH_AFRICA_READING_ID, SOUTH_AFRICA_READING_MEDIA, SOUTH_AFRICA_READING_SLUG } from './south-africa-reading-candidate'
import { caseInputSchema, caseViewSchema, emptyCaseInput, hasCasePrivateImages } from './types'
import type { CaseView } from './types'

export const SOUTH_AFRICA_NARRATIVE_ID = SOUTH_AFRICA_READING_ID
export const SOUTH_AFRICA_NARRATIVE_SLUG = SOUTH_AFRICA_READING_SLUG
export const SOUTH_AFRICA_NARRATIVE_VERSION = 12

const SOURCE_PROCUREMENT = [
  { name: 'Safety helmets', quantity: 500, unit: 'pieces', note: 'Blue logo printed on the helmets.', href: '/categories/head-protection/safety-helmets' },
  { name: 'Cut-resistant gloves', quantity: 1200, unit: 'pairs', note: '', href: '/categories/hand-protection/cut-resistant-gloves' },
  { name: 'Cotton yarn gloves', quantity: 4800, unit: 'pairs', note: '', href: '/categories/hand-protection/knit-gloves' },
  { name: 'Safety shoes', quantity: 200, unit: 'pairs', note: '', href: '/categories/foot-protection/safety-shoes' },
  { name: 'Safety rain boots', quantity: 200, unit: 'pairs', note: '', href: '/categories/foot-protection/safety-rain-boots' },
  { name: 'Workwear', quantity: 200, unit: 'sets', note: 'Logo placement on the right chest and back.', href: '/categories/body-protection' },
]

const SOURCE_PLACEMENTS = ['buyer-visit', 'buyer-visit', 'gloves-workshop', 'footwear-rain-boots', 'footwear-rain-boots', 'workwear-branding', 'helmet-branding', 'packing-loading', 'packing-loading', 'gloves-workshop', 'footwear-rain-boots', 'helmet-branding', 'workwear-branding', 'warehouse-progress', 'packing-loading', 'quotation-preparation']
const DOCUMENT_INDEXES = new Set([9, 10, 11, 12, 13, 15])
const PLACEMENTS = ['buyer-visit', 'buyer-visit', 'buyer-visit', 'product-samples', 'product-samples', 'product-samples', 'product-samples', 'packing-loading', 'packing-loading', 'product-samples', 'product-samples', 'product-samples', 'product-samples', 'packing-loading', 'packing-loading', 'quotation-preparation']
const CAPTIONS = [
  'The buyer and LAIFAPPE team reviewing PPE samples at the store in China.',
  'The buyer visiting the LAIFAPPE team in China.',
  'Viewing glove-production equipment and processes during the factory visit.',
  'Black footwear sample from the sourcing records; the final ordered model has not been matched to this photograph.',
  'Grey footwear sample from the sourcing records; the final ordered model has not been matched to this photograph.',
  'Workwear sample. The specified right-chest and back logos are not visible; logo color and application method remain unspecified.',
  'Helmet sample. The specified printed blue logo is not visible in this photograph.',
  'Wrapped cartons on pallets during warehouse preparation.',
  'Cartons being handled at a goods vehicle.',
  'Protective-glove examination document. Its authenticity and correspondence to the ordered model have not been independently verified.',
  'Rain-boot voluntary conformity document. Its authenticity and order-model correspondence remain unverified; it does not establish conformity of this order.',
  'Helmet document, page 2 of 2. The main page is unavailable here; authenticity and correspondence to the ordered helmets remain unverified.',
  'Workwear voluntary conformity document. Authenticity and order-model correspondence remain unverified; it establishes no flame-resistance or chemical-protection rating for this order.',
  'Tracking records through warehouse dispatch on 4 September 2026. Final delivery or a signed receipt is not shown.',
  'Night-time container loading. The date and completion of the full load are not established; this is not a final-delivery record.',
  'Quotation format example, page 1 of 8 and part of the next page, with prices obscured. It is not the accepted quotation or pro forma invoice. Its workwear unit of pcs does not replace the confirmed 200 sets.',
]

/** Reviewed content candidate only; publishing and optimistic source checks belong to the release CLI. */
export function southAfricaNarrativeCandidate(input: CaseView): CaseView {
  const source = caseViewSchema.parse(input)
  assert.equal(source.id, SOUTH_AFRICA_NARRATIVE_ID, 'Unexpected source case identity')
  assert.equal(source.slug, SOUTH_AFRICA_NARRATIVE_SLUG, 'Unexpected source case slug')
  assert.equal(source.version, SOUTH_AFRICA_NARRATIVE_VERSION, 'Source version changed; review before rewriting')
  assert.equal(source.country, 'South Africa', 'Source destination changed')
  assert.equal(source.industry, 'Mining', 'Source industry changed')
  assert.equal(source.cooperationDate, '2026-08-02', 'Source cooperation date changed')
  assert.deepEqual(source.procurement, SOURCE_PROCUREMENT, 'Source order facts or category links changed')
  assert.equal(source.customization, 'The safety helmets were specified with a printed blue logo. The workwear was specified with logos on the right chest and back.', 'Source customization changed')
  assert.deepEqual(source.timeline.map(({ date }) => date), ['2026-08-02', '2026-08-20', '2026-08-21', '2026-08-22', '2026-09-04'], 'Source milestones changed')
  assert.equal(hasCasePrivateImages(source), false, 'Use the reviewed public source')
  assert.equal(source.gallery.length, 16, 'Source image count changed')
  assert.deepEqual(source.gallery.map(({ url }) => new URL(url).pathname), SOUTH_AFRICA_READING_MEDIA, 'Source media identity or order changed')
  assert.deepEqual(source.gallery.map(({ placement }) => placement), SOURCE_PLACEMENTS.map((key) => `section:${key}`), 'Source image placements changed')
  assert.equal(source.coverImage, source.gallery[0]?.url, 'Source cover changed')

  const candidate = caseViewSchema.parse({
    ...source,
    title: 'South Africa Mining PPE Procurement: Six Product Lines and Custom Branding',
    summary: 'A South African mining buyer reviewed PPE samples in China, then placed a six-line order with helmet and workwear branding. Follow the purchasing requirements, approximately ten-day preparation, video review and recorded warehouse dispatch.',
    buyerProfile: 'An anonymous South African mining company with more than 600 employees. The employee figure describes the company; the six order quantities above are separate purchasing requirements, not 600 complete PPE kits.',
    sections: [
      {
        key: 'buyer-visit',
        title: 'The brief: bring six PPE lines into one purchasing schedule',
        body: 'The project brought together hand protection, helmets, footwear and workwear for a South African mining buyer. It included two glove lines, two footwear lines and separate helmet and workwear requirements. The quantities differed by product, so the purchasing schedule kept pieces, pairs and sets distinct. That detail is useful when comparing a mixed PPE proposal: the total needs a clear scope of supply behind it.\n\nThe buyer visited the LAIFAPPE store in China and reviewed gloves, a helmet and footwear samples in person. The visit continued to factories, including a glove workshop where the buyer viewed production equipment and processes. These conversations and visits formed the starting point for the six-line order and its branding requirements.\n\nThe meeting and workshop photographs document the face-to-face review. The order table above keeps the confirmed product quantities and units together for reference.',
      },
      {
        key: 'product-samples',
        title: 'Define the sample references and product-specific branding',
        body: 'The customization brief separated the helmet requirement from the workwear requirement. Helmets called for a printed blue logo; workwear called for logos on the right chest and back. Recording the instruction by product gives a new purchasing discussion a more useful starting point than a single request to add a company logo. Workwear logo color and application method were not specified in the confirmed case details.\n\nThe sample photographs show two footwear designs, a white helmet and orange workwear. They provide visible references for the sourcing discussion. The final ordered footwear model has not been matched to those images, and the specified logos are not visible on the helmet or workwear samples.\n\nThe expandable documents retain the glove, rain-boot, helmet and workwear records supplied with the case. Their authenticity and correspondence to the ordered models have not been independently verified. Product-specific limitations remain beside each document so a buyer can distinguish the available reference material from confirmed order requirements.',
      },
      {
        key: 'quotation-preparation',
        title: 'Move from the quotation to preparation and video review',
        body: 'After accepting the quotation and pro forma invoice, the buyer paid a 30% deposit. Preparation took approximately ten days for this order. Once the goods were ready, the buyer reviewed them by video, paid the balance and arranged shipment to the freight forwarder’s warehouse. The preparation period is a record of this project, not a general lead-time commitment.\n\nThis sequence connects the commercial agreement, preparation and buyer review with the handover to the forwarder. For a new order, the review points and required records can be discussed alongside the product list and target schedule.\n\nThe supporting screenshot illustrates a quotation format, showing page 1 of 8 and part of the next page with prices obscured. It is not the complete accepted quotation or pro forma invoice. Its specifications, MOQ and document date are example content rather than additional facts about this order; the confirmed workwear quantity remains 200 sets.',
      },
      {
        key: 'packing-loading',
        title: 'The recorded result: prepared goods and warehouse dispatch',
        body: 'The photographs show wrapped cartons on pallets, goods handling at a vehicle and night-time loading at an open shipping container. They document packing and loading stages. The container photograph does not establish its loading date or completion of the full container load.\n\nThe freight forwarder’s tracking records give the dated progress: logistics order received on 20 August 2026, consolidation warehouse receipt on 21 August and goods checking completed on 22 August. Warehouse processing, sorting and outbound dispatch were recorded on 4 September 2026. The original timeline is retained below.\n\nThe logistics arrangement included export and import customs clearance and door delivery. The available evidence ends at warehouse dispatch; final delivery to the mining company has not been verified. This case therefore records the defined purchasing scope, buyer review and preparation-to-dispatch process supported by the supplied material.',
      },
      {
        key: 'buyer-checklist',
        title: 'Prepare a clear brief for your next mixed PPE order',
        body: 'Use the same purchasing questions when preparing a new request. A clear brief helps connect a quotation to the products and review steps you need.\n\nProduct scope: list each product separately with its quantity, unit, color and size allocation where applicable. State the required protective specifications for each line.\n\nBranding: provide the artwork and specify logo color, size, position and preferred application method for each product. Include the front and back of a garment when both require branding.\n\nSample and document review: identify the samples, model-linked documents, photographs or video checks you need before confirming the order and before shipment. The sample-approval guide in the related resources can help organize these points.\n\nCommercial and logistics scope: state your destination, required date, currency and delivery term. Ask the proposal to identify freight, customs, duties and tax inclusions or exclusions so you can compare the quoted scope.',
      },
      {
        key: 'next-project',
        title: 'Discuss your mining PPE product list and customization',
        body: 'Send LAIFAPPE your product list, quantities, size requirements, logo artwork, destination and target date. If you have reference samples or an existing quotation, include the product specifications and commercial scope you want reviewed.\n\nShare these details through the quotation link below to start the discussion. We can work through the product mix, customization instructions and review stages with you before preparing a proposal.',
      },
    ],
    gallery: source.gallery.map((image, index) => ({
      ...image,
      caption: CAPTIONS[index],
      placement: `section:${PLACEMENTS[index]}`,
      kind: DOCUMENT_INDEXES.has(index) ? 'document' : 'photo',
    })),
    relatedLinks: [
      { label: 'Discuss your mining PPE project', href: '/quote' },
      { label: 'PPE for mining and quarrying', href: '/solutions/ppe-safety-equipment-for-mining-quarrying' },
      { label: 'PPE sample approval and pre-shipment checklist', href: '/blog/ppe-sample-approval-pre-shipment-checklist' },
      { label: 'Mining PPE checklist by task', href: '/blog/mining-ppe-checklist-by-task' },
    ],
    seoDescription: 'See a South African mining PPE order with six product lines, custom branding, sample review, preparation and documented warehouse dispatch.',
  })
  caseInputSchema.parse({ ...emptyCaseInput(), ...candidate, status: 'PUBLISHED', publicationApproved: true })
  assert.deepEqual(candidate.procurement, source.procurement)
  assert.deepEqual(candidate.timeline, source.timeline)
  assert.deepEqual(candidate.gallery.map(({ url, alt }) => ({ url, alt })), source.gallery.map(({ url, alt }) => ({ url, alt })))
  return candidate
}
