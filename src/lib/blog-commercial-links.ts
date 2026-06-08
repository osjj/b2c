export interface BlogCommercialLink {
  href: string
  label: string
}

export interface BlogCommercialLinks {
  solution: BlogCommercialLink
  categories: BlogCommercialLink[]
  products: BlogCommercialLink[]
  cta: BlogCommercialLink
  resources?: BlogCommercialLink[]
}

const BLOG_COMMERCIAL_LINKS: Record<string, BlogCommercialLinks> = {
  'construction-gloves-selection-guide': {
    solution: {
      href: '/solutions/construction-site-ppe-solution',
      label: 'Complete construction PPE solution',
    },
    categories: [
      { href: '/categories/hand-protection', label: 'Hand protection' },
      {
        href: '/categories/hand-protection/cut-resistant-gloves',
        label: 'Cut resistant gloves',
      },
      {
        href: '/categories/hand-protection/nitrile-coated-gloves',
        label: 'Nitrile coated gloves',
      },
      {
        href: '/categories/hand-protection/leather-work-gloves',
        label: 'Leather work gloves',
      },
    ],
    products: [
      {
        href: '/products/a5-cut-resistant-tpr-impact-mechanic-gloves-sandy-nitrile',
        label: 'A5 cut resistant mechanic gloves',
      },
      {
        href: '/products/blue-nitrile-coated-safety-work-gloves-n518',
        label: 'Nitrile coated safety work gloves',
      },
      {
        href: '/products/hppe-cut-resistant-nitrile-palm-coated-anti-slip-work',
        label: 'HPPE cut resistant nitrile gloves',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request a bulk glove quote',
    },
  },
  'construction-safety-footwear-guide': {
    solution: {
      href: '/solutions/construction-site-ppe-solution',
      label: 'Construction PPE sourcing solution',
    },
    categories: [
      { href: '/categories/foot-protection', label: 'Foot protection' },
      { href: '/categories/foot-protection/safety-shoes', label: 'Safety shoes' },
      { href: '/categories/foot-protection/safety-boots', label: 'Safety boots' },
      {
        href: '/categories/foot-protection/safety-rain-boots',
        label: 'Safety rain boots',
      },
    ],
    products: [
      {
        href: '/products/breathable-low-cut-safety-shoes-with-steel-toe',
        label: 'Breathable steel toe safety shoes',
      },
      {
        href: '/products/s3-anti-static-waterproof-steel-toe-puncture-resistant',
        label: 'S3 waterproof puncture resistant shoes',
      },
      {
        href: '/products/pvc-steel-toe-safety-rain-boots-for-mining-and-industrial',
        label: 'PVC steel toe safety rain boots',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request a safety footwear quote',
    },
  },
  'construction-hard-hat-types': {
    solution: {
      href: '/solutions/construction-site-ppe-solution',
      label: 'Construction head protection solution',
    },
    categories: [
      { href: '/categories/head-protection', label: 'Head protection' },
      { href: '/categories/head-protection/safety-helmets', label: 'Safety helmets' },
      { href: '/categories/head-protection/face-shields', label: 'Face shields' },
    ],
    products: [
      {
        href: '/products/en397-abs-safety-helmet-with-6-point-suspension',
        label: 'EN397 ABS safety helmet',
      },
      {
        href: '/products/green-abs-vented-safety-helmet-ce-en397-ansi-ratchet-fit',
        label: 'CE EN397 ANSI vented safety helmet',
      },
      {
        href: '/products/hdpe-safety-helmet-with-chin-strap-slider-adjustable-6',
        label: 'HDPE safety helmet with chin strap',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request a hard hat quote',
    },
  },
  'bulk-construction-ppe-procurement': {
    solution: {
      href: '/solutions/construction-site-ppe-solution',
      label: 'Bulk construction PPE solution',
    },
    categories: [
      { href: '/categories/hand-protection', label: 'Work gloves' },
      { href: '/categories/foot-protection', label: 'Safety footwear' },
      { href: '/categories/head-protection', label: 'Head protection' },
      { href: '/categories/body-protection/hi-vis-workwear', label: 'Hi-vis workwear' },
      { href: '/categories/fall-protection', label: 'Fall protection' },
    ],
    products: [
      {
        href: '/products/en397-abs-safety-helmet-with-6-point-suspension',
        label: 'EN397 ABS safety helmet',
      },
      {
        href: '/products/blue-nitrile-coated-safety-work-gloves-n518',
        label: 'Nitrile coated safety work gloves',
      },
      {
        href: '/products/mens-reflective-safety-work-vest-v-neck-zipper-front',
        label: 'Reflective safety work vest',
      },
      {
        href: '/products/ce-en-361-certified-yellow-black-polyester-webbing-fall',
        label: 'CE EN361 fall arrest harness',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request a bulk PPE quote',
    },
    resources: [
      {
        href: '/downloads/construction-ppe-rfq-template?source=blog-bulk-construction-ppe-procurement',
        label: 'RFQ template',
      },
    ],
  },
  'construction-ppe-checklist': {
    solution: {
      href: '/solutions/construction-site-ppe-solution',
      label: 'Complete construction PPE solution',
    },
    categories: [
      { href: '/categories/head-protection/safety-helmets', label: 'Safety helmets' },
      { href: '/categories/eye-protection', label: 'Eye protection' },
      { href: '/categories/hand-protection', label: 'Work gloves' },
      { href: '/categories/foot-protection', label: 'Safety footwear' },
      { href: '/categories/body-protection/hi-vis-workwear', label: 'Hi-vis workwear' },
      { href: '/categories/respiratory-protection', label: 'Respiratory protection' },
    ],
    products: [
      {
        href: '/products/en397-abs-safety-helmet-with-6-point-suspension',
        label: 'EN397 ABS safety helmet',
      },
      {
        href: '/products/en166f-anti-fog-anti-scratch-dustproof-safety-glasses',
        label: 'EN166F anti-fog safety glasses',
      },
      {
        href: '/products/breathable-low-cut-safety-shoes-with-steel-toe',
        label: 'Breathable steel toe safety shoes',
      },
      {
        href: '/products/reusable-half-face-respirator-dual-filters-dust',
        label: 'Reusable half-face dust respirator',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Build a construction PPE kit',
    },
    resources: [
      {
        href: '/downloads/construction-ppe-rfq-template?source=blog-construction-ppe-checklist',
        label: 'RFQ template',
      },
    ],
  },
  'osha-ppe-requirements-construction': {
    solution: {
      href: '/solutions/construction-site-ppe-solution',
      label: 'OSHA-ready construction PPE solution',
    },
    categories: [
      { href: '/categories/head-protection/safety-helmets', label: 'Safety helmets' },
      { href: '/categories/eye-protection', label: 'Eye protection' },
      { href: '/categories/foot-protection', label: 'Safety footwear' },
      { href: '/categories/respiratory-protection', label: 'Respiratory protection' },
      { href: '/categories/fall-protection', label: 'Fall protection' },
    ],
    products: [
      {
        href: '/products/en397-abs-safety-helmet-with-6-point-suspension',
        label: 'EN397 ABS safety helmet',
      },
      {
        href: '/products/en166f-anti-fog-anti-scratch-dustproof-safety-glasses',
        label: 'EN166F anti-fog safety glasses',
      },
      {
        href: '/products/ce-en-361-certified-yellow-black-polyester-webbing-fall',
        label: 'CE EN361 fall arrest harness',
      },
      {
        href: '/products/reusable-half-face-respirator-dual-filters-dust',
        label: 'Reusable half-face dust respirator',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request compliant PPE options',
    },
  },
  'construction-hearing-protection': {
    solution: {
      href: '/solutions/construction-site-ppe-solution',
      label: 'Construction PPE solution with hearing protection',
    },
    categories: [
      {
        href: '/categories/head-protection/hearing-protection',
        label: 'Hearing protection',
      },
      { href: '/categories/head-protection', label: 'Head protection' },
      { href: '/categories/body-protection/hi-vis-workwear', label: 'Hi-vis workwear' },
    ],
    products: [
      {
        href: '/products/3m-1100-earplugs-noise-reduction-hearing-protection',
        label: '3M 1100 noise reduction earplugs',
      },
      {
        href: '/products/bds-flanged-ear-plugs-orange-25-db-nrr-ansi-certified-slow',
        label: 'BDS flanged ear plugs',
      },
      {
        href: '/products/red-adjustable-foldable-noise-reduction-earmuffs',
        label: 'Adjustable noise reduction earmuffs',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request a hearing PPE quote',
    },
  },
  'construction-respiratory-protection': {
    solution: {
      href: '/solutions/ppe-for-demolition-and-concrete-cutting-work',
      label: 'Respiratory PPE for demolition and concrete cutting',
    },
    categories: [
      { href: '/categories/respiratory-protection', label: 'Respiratory protection' },
      {
        href: '/categories/respiratory-protection/half-face-respirators',
        label: 'Half-face respirators',
      },
      { href: '/categories/eye-protection/safety-goggles', label: 'Safety goggles' },
    ],
    products: [
      {
        href: '/products/reusable-half-face-respirator-dual-filters-dust',
        label: 'Reusable half-face dust respirator',
      },
      {
        href: '/products/half-face-chemical-respirator-with-safety-goggles',
        label: 'Half-face chemical respirator with goggles',
      },
      {
        href: '/products/anti-fog-dustproof-pc-safety-goggles-for-construction',
        label: 'Anti-fog dustproof safety goggles',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request a respirator quote',
    },
    resources: [
      {
        href: '/downloads/construction-ppe-rfq-template?source=blog-construction-respiratory-protection',
        label: 'RFQ template',
      },
    ],
  },
  'construction-eye-face-protection': {
    solution: {
      href: '/solutions/ppe-for-demolition-and-concrete-cutting-work',
      label: 'Eye and face PPE for high-dust work',
    },
    categories: [
      { href: '/categories/eye-protection', label: 'Eye protection' },
      { href: '/categories/eye-protection/safety-glasses', label: 'Safety glasses' },
      { href: '/categories/eye-protection/safety-goggles', label: 'Safety goggles' },
      { href: '/categories/head-protection/face-shields', label: 'Face shields' },
    ],
    products: [
      {
        href: '/products/en166f-anti-fog-anti-scratch-dustproof-safety-glasses',
        label: 'EN166F anti-fog safety glasses',
      },
      {
        href: '/products/anti-fog-anti-scratch-transparent-safety-goggles',
        label: 'Anti-fog transparent safety goggles',
      },
      {
        href: '/products/clear-pc-full-face-shield-anti-impact-anti-splash',
        label: 'Clear PC full face shield',
      },
      {
        href: '/products/direct-adhesive-available-welding-helmet-flip-up-design',
        label: 'Flip-up welding helmet',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request eye and face PPE options',
    },
  },
  'demolition-concrete-cutting-ppe-checklist': {
    solution: {
      href: '/solutions/ppe-for-demolition-and-concrete-cutting-work',
      label: 'Demolition and concrete cutting PPE solution',
    },
    categories: [
      { href: '/categories/respiratory-protection', label: 'Respiratory protection' },
      { href: '/categories/eye-protection/safety-goggles', label: 'Safety goggles' },
      {
        href: '/categories/head-protection/hearing-protection',
        label: 'Hearing protection',
      },
      { href: '/categories/hand-protection/cut-resistant-gloves', label: 'Cut gloves' },
      { href: '/categories/foot-protection/safety-boots', label: 'Safety boots' },
    ],
    products: [
      {
        href: '/products/reusable-half-face-respirator-dual-filters-dust',
        label: 'Reusable half-face dust respirator',
      },
      {
        href: '/products/anti-fog-dustproof-pc-safety-goggles-for-construction',
        label: 'Anti-fog dustproof safety goggles',
      },
      {
        href: '/products/red-adjustable-foldable-noise-reduction-earmuffs',
        label: 'Adjustable noise reduction earmuffs',
      },
      {
        href: '/products/a5-cut-resistant-tpr-impact-mechanic-gloves-sandy-nitrile',
        label: 'A5 cut resistant mechanic gloves',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request a demolition PPE quote',
    },
  },
  'heat-stress-ppe-construction-workers': {
    solution: {
      href: '/solutions/ppe-for-road-and-bridge-construction-projects',
      label: 'Road and outdoor construction PPE solution',
    },
    categories: [
      { href: '/categories/body-protection/hi-vis-workwear', label: 'Hi-vis workwear' },
      { href: '/categories/body-protection/safety-vests', label: 'Safety vests' },
      { href: '/categories/head-protection/safety-helmets', label: 'Safety helmets' },
      { href: '/categories/hand-protection/knit-gloves', label: 'Lightweight gloves' },
    ],
    products: [
      {
        href: '/products/mens-reflective-safety-work-vest-v-neck-zipper-front',
        label: 'Reflective safety work vest',
      },
      {
        href: '/products/250gsm-cotton-hi-vis-reflective-jacket-and-pants-workwear',
        label: 'Hi-vis reflective workwear set',
      },
      {
        href: '/products/green-abs-vented-safety-helmet-ce-en397-ansi-ratchet-fit',
        label: 'Vented CE EN397 safety helmet',
      },
      {
        href: '/products/70g-thickened-cotton-knit-work-gloves-general-purpose',
        label: 'Cotton knit work gloves',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request hot-weather PPE options',
    },
  },
  'heavy-equipment-operator-ppe-checklist': {
    solution: {
      href: '/solutions/ppe-for-heavy-equipment-operators-on-construction-sites',
      label: 'Heavy equipment operator PPE solution',
    },
    categories: [
      { href: '/categories/body-protection/hi-vis-workwear', label: 'Hi-vis workwear' },
      {
        href: '/categories/head-protection/hearing-protection',
        label: 'Hearing protection',
      },
      { href: '/categories/foot-protection/safety-shoes', label: 'Safety shoes' },
      { href: '/categories/eye-protection/safety-glasses', label: 'Safety glasses' },
      { href: '/categories/head-protection/safety-helmets', label: 'Safety helmets' },
    ],
    products: [
      {
        href: '/products/mens-reflective-safety-work-vest-v-neck-zipper-front',
        label: 'Reflective safety work vest',
      },
      {
        href: '/products/red-adjustable-foldable-noise-reduction-earmuffs',
        label: 'Adjustable noise reduction earmuffs',
      },
      {
        href: '/products/breathable-low-cut-safety-shoes-with-steel-toe',
        label: 'Breathable steel toe safety shoes',
      },
      {
        href: '/products/en166f-anti-fog-anti-scratch-dustproof-safety-glasses',
        label: 'EN166F anti-fog safety glasses',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request operator PPE kits',
    },
  },
  'high-visibility-clothing-construction': {
    solution: {
      href: '/solutions/ppe-for-night-construction-and-low-visibility-work',
      label: 'Night and low-visibility PPE solution',
    },
    categories: [
      { href: '/categories/body-protection/hi-vis-workwear', label: 'Hi-vis workwear' },
      { href: '/categories/body-protection/safety-vests', label: 'Safety vests' },
      { href: '/categories/body-protection/rainwear', label: 'Reflective rainwear' },
      { href: '/categories/body-protection/work-coveralls', label: 'Work coveralls' },
    ],
    products: [
      {
        href: '/products/mens-reflective-safety-work-vest-v-neck-zipper-front',
        label: 'Reflective safety work vest',
      },
      {
        href: '/products/250gsm-cotton-hi-vis-reflective-jacket-and-pants-workwear',
        label: 'Hi-vis reflective jacket and pants',
      },
      {
        href: '/products/yellow-pvc-polyester-waterproof-chemical-resistant',
        label: 'Yellow waterproof protective rainwear',
      },
      {
        href: '/products/flame-retardant-reflective-worker-coveralls-for-mining',
        label: 'Flame retardant reflective coveralls',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request hi-vis workwear pricing',
    },
    resources: [
      {
        href: '/downloads/construction-ppe-rfq-template?source=blog-high-visibility-clothing-construction',
        label: 'RFQ template',
      },
    ],
  },
  'construction-safety-helmet-vs-hard-hat': {
    solution: {
      href: '/solutions/ppe-for-scaffolding-and-elevated-platforms',
      label: 'Helmet PPE for elevated work',
    },
    categories: [
      { href: '/categories/head-protection', label: 'Head protection' },
      { href: '/categories/head-protection/safety-helmets', label: 'Safety helmets' },
      { href: '/categories/fall-protection/safety-harness', label: 'Safety harnesses' },
    ],
    products: [
      {
        href: '/products/en397-abs-safety-helmet-with-6-point-suspension',
        label: 'EN397 ABS safety helmet',
      },
      {
        href: '/products/hdpe-safety-helmet-with-chin-strap-slider-adjustable-6',
        label: 'HDPE safety helmet with chin strap',
      },
      {
        href: '/products/ce-en397-abs-safety-helmet-with-switchable-vents-slotted',
        label: 'Vented ABS safety helmet',
      },
      {
        href: '/products/ce-en-361-certified-yellow-black-polyester-webbing-fall',
        label: 'CE EN361 fall arrest harness',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Compare helmet options',
    },
  },
  'contractor-ppe-kit-checklist': {
    solution: {
      href: '/solutions/construction-site-ppe-solution',
      label: 'Construction contractor PPE kit solution',
    },
    categories: [
      { href: '/categories/head-protection/safety-helmets', label: 'Safety helmets' },
      { href: '/categories/eye-protection/safety-glasses', label: 'Safety glasses' },
      { href: '/categories/hand-protection', label: 'Work gloves' },
      { href: '/categories/foot-protection/safety-shoes', label: 'Safety shoes' },
      { href: '/categories/body-protection/safety-vests', label: 'Safety vests' },
    ],
    products: [
      {
        href: '/products/en397-abs-safety-helmet-with-6-point-suspension',
        label: 'EN397 ABS safety helmet',
      },
      {
        href: '/products/en166f-anti-fog-anti-scratch-dustproof-safety-glasses',
        label: 'EN166F anti-fog safety glasses',
      },
      {
        href: '/products/blue-nitrile-coated-safety-work-gloves-n518',
        label: 'Nitrile coated safety work gloves',
      },
      {
        href: '/products/mens-reflective-safety-work-vest-v-neck-zipper-front',
        label: 'Reflective safety work vest',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Build contractor PPE kits',
    },
    resources: [
      {
        href: '/downloads/construction-ppe-rfq-template?source=blog-contractor-ppe-kit-checklist',
        label: 'RFQ template',
      },
    ],
  },
  'trenching-excavation-ppe-checklist': {
    solution: {
      href: '/solutions/ppe-for-road-and-bridge-construction-projects',
      label: 'Civil construction PPE solution',
    },
    categories: [
      { href: '/categories/head-protection/safety-helmets', label: 'Safety helmets' },
      { href: '/categories/body-protection/hi-vis-workwear', label: 'Hi-vis workwear' },
      { href: '/categories/foot-protection/safety-boots', label: 'Safety boots' },
      { href: '/categories/hand-protection/latex-coated-gloves', label: 'Grip gloves' },
      { href: '/categories/eye-protection/safety-goggles', label: 'Safety goggles' },
    ],
    products: [
      {
        href: '/products/green-abs-vented-safety-helmet-ce-en397-ansi-ratchet-fit',
        label: 'Vented CE EN397 safety helmet',
      },
      {
        href: '/products/mens-reflective-safety-work-vest-v-neck-zipper-front',
        label: 'Reflective safety work vest',
      },
      {
        href: '/products/mens-mid-calf-waterproof-anti-slip-cushioned-work-boots',
        label: 'Waterproof anti-slip work boots',
      },
      {
        href: '/products/ce-en388-13g-polyester-cotton-latex-crinkle-anti-slip-work',
        label: 'Latex crinkle anti-slip work gloves',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request trenching PPE options',
    },
  },
  'scaffolding-ppe-checklist': {
    solution: {
      href: '/solutions/ppe-for-scaffolding-and-elevated-platforms',
      label: 'Scaffolding and elevated work PPE solution',
    },
    categories: [
      { href: '/categories/fall-protection', label: 'Fall protection' },
      { href: '/categories/fall-protection/safety-harness', label: 'Safety harnesses' },
      { href: '/categories/head-protection/safety-helmets', label: 'Safety helmets' },
      { href: '/categories/foot-protection/safety-boots', label: 'Safety boots' },
      { href: '/categories/hand-protection/leather-work-gloves', label: 'Work gloves' },
    ],
    products: [
      {
        href: '/products/ce-en-361-certified-yellow-black-polyester-webbing-fall',
        label: 'CE EN361 fall arrest harness',
      },
      {
        href: '/products/hdpe-safety-helmet-with-chin-strap-slider-adjustable-6',
        label: 'HDPE safety helmet with chin strap',
      },
      {
        href: '/products/mens-mid-calf-waterproof-anti-slip-cushioned-work-boots',
        label: 'Waterproof anti-slip work boots',
      },
      {
        href: '/products/heavy-duty-cowhide-leather-back-cotton-blend-work-gloves',
        label: 'Heavy-duty cowhide work gloves',
      },
    ],
    cta: {
      href: '/quote',
      label: 'Request scaffolding PPE kits',
    },
  },
}

export function getBlogCommercialLinks(slug: string) {
  const links = BLOG_COMMERCIAL_LINKS[slug]

  if (!links) {
    return undefined
  }

  return {
    ...links,
    cta: {
      ...links.cta,
      href:
        links.cta.href === '/quote'
          ? `/quote?source=${encodeURIComponent(`blog-${slug}`)}`
          : links.cta.href,
    },
  }
}
