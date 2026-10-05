import assert from 'node:assert/strict'

import { caseInputSchema } from './types'
import type { AdminCaseView, CaseInput } from './types'
import { parseCasePrivateImage } from './private-image-path'

export const SOUTH_AFRICA_CASE_ID = 'cmuu1gcon0000um188vsx2o88'
export const SOUTH_AFRICA_CASE_SLUG = 'south-africa-mining-ppe-procurement-2026'

/** Fixed source order: fourteen Notion originals, loading photo, quote example. */
export const SOUTH_AFRICA_SOURCE_HASHES = [
  '2becdc7c1d4830eea62705e2faf575cca333a76dbdc82f5276c782211b2fbf4b',
  'ceff3d858db3a90f8309b40d29b8badb093b70b7457860fac9820527a4e35bde',
  '83e296c1a0476ccebc84f08f30a0bde9754e9841800e60ae3c3e632dc3805ebb',
  '9c0b5177b0182cee12ba94b54bbc571705840c4535023a54003430bbb1bed6cc',
  'dd2dfc6aecca8bf3ae49d342492672920a0cd7b236b6f9be0ecfb3a21465a1fe',
  '3049462c68c214ad3461a4b0ebce62214dd12d97cd1df2458ac306224d3d487e',
  'd6e1b7a1829817cbde2e12fa0762f14695f13b398bf2d2a99f9c9829ab6ff2cb',
  'b1bc7c049f3c9df3838b804510878c819227c7aa22324ad8553a5b7ef0d8cc03',
  '77780c67ceacfd7a0c663c6b1aece9a5b3e2e9f590e5f083ddf1bb790a8e66ad',
  'af71163bfc1dec52858a7476f1a084e6b2b8e237d335af9568f2ccd05db21581',
  '7eaeaeb29fd5dc6386c95ab81b7cd76b702eb63c51f1616c8a4cf277f48ad465',
  '1807c7978bde71adcb300ad9ae55bda684131399d7d9129ac3eefdaa819ad122',
  '8c0de755730ad0e31c566e714e387ed1aa120b55a71ca4d684726f20548751cf',
  '43aebe93b70b2f7775f8712265b43dc1bfc79192b9883dcc2748296b7923a02f',
  '6fd44673e68fdd7cd12e36095df780040cbb605cb1b68214c5dffecba696e055',
  '4fa55a2ebcdb1b184327c8b70c8c12d30200ae01435711d9557e6244daf55d06',
] as const

const CHAPTERS = [
  {
    key: 'buyer-visit', title: 'Meeting the buyer in China', images: [0, 1],
    body: 'The buyer met the LAIFAPPE team at the store in China and reviewed PPE samples in person. Gloves, a helmet and footwear were laid out for the discussion, which covered six product categories for the mining company.\n\nThe visit extended from the store to factories. Alongside the sample review, the buyer saw production equipment at the glove workshop. The photographs below record the store meeting and the visit with the LAIFAPPE team.',
  },
  {
    key: 'gloves-workshop', title: 'Gloves and the workshop visit', images: [2, 9],
    body: 'Hand protection accounted for two lines in this order: 1,200 pairs of cut-resistant gloves and 4,800 pairs of cotton yarn gloves. The glove quantities formed part of the same procurement schedule as the helmets, footwear and workwear.\n\nDuring the factory visit, the buyer and LAIFAPPE team viewed the glove-production equipment and process. The workshop photograph records this part of the visit. A protective-glove examination document supplied with the case notes is included beside it; the document’s authenticity and correspondence to the ordered model remain unverified.',
  },
  {
    key: 'footwear-rain-boots', title: 'Footwear samples and rain boots', images: [3, 4, 10],
    body: 'The footwear order comprised 200 pairs of safety shoes and 200 pairs of safety rain boots. The case records include two safety-shoe sample photographs: black lace-up footwear with contrasting soles, and a grey sample with mesh panels and yellow accents.\n\nThese images show the designs recorded during sample sourcing; the final ordered model has not been matched to either photograph. The rain-boot record also includes a voluntary conformity document, shown after the sample photographs with its evidence caption.',
  },
  {
    key: 'helmet-branding', title: 'Safety helmets with blue logo printing', images: [6, 11],
    body: 'The buyer ordered 500 safety helmets with a printed blue logo. The blue logo was the confirmed helmet-branding requirement for this procurement.\n\nThe sample photograph shows a white helmet with ventilation slots and a chin strap; the blue logo is not visible. It is accompanied by page 2 of an SGS helmet document. The main document page and its correspondence to the ordered helmets remain to be confirmed.',
  },
  {
    key: 'workwear-branding', title: 'Workwear with two logo positions', images: [5, 12],
    body: 'The workwear order was 200 sets, with the buyer’s logo specified for the right chest and the back. The logo color and application method were not specified in the confirmed case details.\n\nThe sample record shows orange workwear with silver-colored strips on the shoulders, sleeves and lower legs. The right-chest and back logos are not visible in this photograph. A voluntary conformity document was also supplied for the workwear; both the garment sample and the document are shown below.',
  },
  {
    key: 'quotation-preparation', title: 'Quotation, preparation and video review', images: [15],
    body: 'After accepting the quotation and pro forma invoice, the buyer paid a 30% deposit. Preparation took approximately ten days for this order. Once the goods were ready, the buyer reviewed them by video, paid the balance and arranged shipment to the freight forwarder’s warehouse. The preparation period is specific to this case, not a general lead-time commitment.\n\nThe screenshot below is a quotation example supplied by the owner, showing page 1 of 8 and part of the next page, with prices obscured. It illustrates the document format rather than proving the final accepted terms. It is not the complete quotation or the pro forma invoice.\n\nThe example uses “pcs” for workwear; the case retains the confirmed quantity of 200 sets. The example’s specifications, MOQ and document date are not additional order facts.',
  },
  {
    key: 'packing-loading', title: 'Packing and container loading', images: [7, 8, 14],
    body: 'The procurement records include wrapped cartons stacked on pallets in a warehouse, and cartons being handled at the opening of a goods vehicle. These photographs document packing and goods handling.\n\nThe additional photograph supplied by the owner shows a forklift at the rear of an open shipping container, with cartons stacked inside during night-time loading. The loading date and completion of the full container load are not established by this photograph. The dated warehouse progress is recorded in the next section.',
  },
  {
    key: 'warehouse-progress', title: 'Recorded warehouse progress', images: [13],
    body: 'The freight forwarder’s tracking screenshot records receipt of the logistics order on 20 August 2026, arrival at the consolidation warehouse on 21 August and completion of goods checking on 22 August. Warehouse processing, sorting and outbound dispatch were recorded on 4 September 2026.\n\nThe logistics arrangement in the case notes included export and import customs clearance and door delivery. The available tracking evidence currently ends at warehouse dispatch. Final delivery has not been verified. The screenshot below and the project timeline distinguish the recorded warehouse events from delivery to the mining company.',
  },
] as const

/** Pure transformation for this single authorized draft; never a public fallback. */
export function refreshSouthAfricaCase(current: AdminCaseView): CaseInput {
  assert.equal(current.id, SOUTH_AFRICA_CASE_ID)
  assert.equal(current.slug, SOUTH_AFRICA_CASE_SLUG)
  assert.equal(current.status, 'DRAFT')
  assert.equal(current.publicationApproved, false)
  assert.equal(current.publishedAt, null)
  assert.equal(current.gallery.length, SOUTH_AFRICA_SOURCE_HASHES.length)
  current.gallery.forEach((image, index) => {
    const parsed = parseCasePrivateImage(image.url)
    assert.equal(parsed?.caseId, current.id)
    assert.equal(parsed?.sha256, SOUTH_AFRICA_SOURCE_HASHES[index], 'Source image order changed; review instead of guessing placements')
  })
  const candidate = caseInputSchema.parse({
    ...current,
    summary: 'An in-person visit in China led to a six-category PPE order for a South African mining company. This case documents sample discussions, helmet and workwear logo requirements, order preparation, packing, loading and recorded warehouse progress.',
    buyerProfile: 'The buyer represented a South African mining company with more than 600 employees. The customer’s identity is kept anonymous in this case. The workforce figure describes the buyer’s company, not the quantity of PPE ordered.\n\nLAIFAPPE records 2 August 2026 as the cooperation date. The procurement covered six product lines, with specific logo requirements for the helmets and workwear. The schedule below keeps the confirmed quantities and units for each product separate.',
    sections: CHAPTERS.map(({ key, title, body }) => ({ key, title, body })),
    gallery: current.gallery.map((image, index) => {
      const chapter = CHAPTERS.find((item) => (item.images as readonly number[]).includes(index))
      if (!chapter) throw new Error('Source image has no reviewed chapter')
      return { ...image, placement: `section:${chapter.key}` }
    }),
  })
  assert.equal(candidate.sections.length, 8)
  assert.equal(candidate.gallery.every((image) => Boolean(image.placement)), true)
  return candidate
}
