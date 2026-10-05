import { caseInputSchema } from './types'
import type { CaseInput } from './types'

/** Source-backed editorial draft. Never imported as a public data fallback. */
export const southAfricaMiningDraft: CaseInput = caseInputSchema.parse({
  title: 'A Six-Category PPE Procurement Order for a South African Mining Company',
  slug: 'south-africa-mining-ppe-procurement-2026',
  summary: 'A South African mining buyer visited our store and factories in China to review PPE samples, then placed a six-category order with customized helmet and workwear logos.',
  country: 'South Africa',
  industry: 'Mining',
  cooperationDate: '2026-08-02',
  buyerProfile: 'An anonymized South African mining company with more than 600 employees.',
  coverImage: '',
  coverAlt: '',
  procurement: [
    { name: 'Safety helmets', quantity: 500, unit: 'pieces', note: 'Blue logo printed on the helmets.' },
    { name: 'Cut-resistant gloves', quantity: 1200, unit: 'pairs', note: '' },
    { name: 'Cotton yarn gloves', quantity: 4800, unit: 'pairs', note: '' },
    { name: 'Safety shoes', quantity: 200, unit: 'pairs', note: '' },
    { name: 'Safety rain boots', quantity: 200, unit: 'pairs', note: '' },
    { name: 'Workwear', quantity: 200, unit: 'sets', note: 'Logo placement on the right chest and back.' },
  ],
  customization: 'The safety helmets were specified with a printed blue logo. The workwear was specified with logos on the right chest and back.',
  sections: [
    {
      title: 'An in-person sample review in China',
      body: 'The buyer visited our store and factories in China and examined PPE samples in person. The sourcing discussion covered six product categories for the mining company.',
    },
    {
      title: 'A defined order and branding scope',
      body: 'The confirmed order included 500 safety helmets, 1,200 pairs of cut-resistant gloves, 4,800 pairs of cotton yarn gloves, 200 pairs of safety shoes, 200 pairs of safety rain boots and 200 sets of workwear. Helmet customization used a printed blue logo. Workwear logo placement was the right chest and back.',
    },
    {
      title: 'Quotation, preparation and video inspection',
      body: 'After accepting the quotation and pro forma invoice, the buyer paid a 30% deposit. For this order, preparation took approximately ten days. When the goods were ready, the buyer reviewed them by video, paid the balance and arranged shipment to the freight forwarder’s warehouse.',
    },
    {
      title: 'Warehouse progress and logistics',
      body: 'The logistics arrangement included export and import customs clearance and door delivery. The available tracking record confirms warehouse receipt, inspection and dispatch steps, including outbound dispatch on September 4, 2026. Final delivery has not yet been verified.',
    },
  ],
  timeline: [
    { date: '2026-08-02', label: 'Cooperation date', description: 'The cooperation date confirmed by LAIFAPPE for this procurement case.' },
    { date: '2026-08-20', label: 'Logistics order received', description: 'The freight forwarder recorded receipt of the logistics order.' },
    { date: '2026-08-21', label: 'Consolidation warehouse receipt', description: 'Warehouse arrival and receipt were recorded, with photos uploaded.' },
    { date: '2026-08-22', label: 'Warehouse inspection completed', description: 'The screenshot records inspection completion and uploaded photos.' },
    { date: '2026-09-04', label: 'Warehouse dispatch recorded', description: 'Warehouse processing, sorting and outbound dispatch were recorded.' },
  ],
  gallery: [],
  relatedLinks: [],
  status: 'DRAFT',
  featured: false,
  sortOrder: 0,
  seoTitle: 'South Africa Mining PPE Procurement Case | LAIFAPPE',
  seoDescription: 'A real six-category PPE order for a South African mining buyer, with confirmed quantities, helmet and workwear logo customization, and documented warehouse progress.',
  publicationApproved: false,
  privateNotes: 'SOURCE: https://app.notion.com/p/3efd505a003080908479f409582b7517 — Procurement case supplied by the owner. Date, item quantities/units and right-chest/back logo placement were confirmed directly. Keep unpublished until editorial review and publication permission are confirmed.\n\nImages are deliberately absent: store/group photos show customer faces or documents; loading photos include third-party marks and location/date watermarks. Do not upload or publish these without permission and appropriate redaction. Product images may show third-party branding. Two original downloads were incomplete and must not be used.\n\nCertificate evidence is not order-matched or independently authenticated. CTC certificate 0075/2577/162/01/22/0130 lists XY-103 and EN ISO 21420:2020 / EN 388:2016+A1:2018 4X42D; issuer/current authenticity and supplied SKU correspondence require verification. Rain-boot ICR/VC/HP231101 and workwear ICR/VC/HS231038 are voluntary conformity documents, not proof of mandatory EU type examination. Helmet SGS 0598/PPE/24/3642 is page 2 of 2 only; the principal page, applicable standard and expiry are missing. Do not state that this order is certified or approved for South Africa on this evidence.\n\nNo repeat-purchase history, exact prices, savings, customer testimonial, safety outcomes or final signed delivery are confirmed. The approximately ten-day preparation time applies only to this order, not a general lead-time promise. Logistics screenshot is partial; September 4 warehouse dispatch does not prove final delivery. Customer identity is anonymized. The 600+ employees describe the buyer, not the order quantity. On-site sample review is not third-party testing. Do not combine quantities across unlike units. Workwear logo color and application method remain unspecified.',
})
