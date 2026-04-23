type CategoryLike = {
  name: string
  slug: string
  description?: string | null
}

type CategoryFaq = {
  question: string
  answer: string
}

type CategorySeoContent = {
  metaTitle: string
  metaDescription: string
  eyebrow: string
  leadTitle: string
  intro: string[]
  guideTitle: string
  guideSteps: string[]
  applicationsTitle: string
  applications: string[]
  differentiatorsTitle: string
  differentiators: string[]
  faqTitle: string
  faqs: CategoryFaq[]
}

const topLevelCategoryContent: Record<string, CategorySeoContent> = {
  'respiratory-protection': {
    metaTitle: 'Respiratory Protection Equipment',
    metaDescription:
      'Shop respiratory protection equipment for dust, fumes, paint spray, and chemical handling, including reusable respirators and compatible industrial PPE.',
    eyebrow: 'Airborne hazard control',
    leadTitle: 'How industrial buyers evaluate respiratory protection',
    intro: [
      'Most respiratory protection enquiries start with the hazard itself, whether that means dust, fumes, paint spray, chemical exposure, or a reusable setup that works with the rest of the PPE kit.',
      'In this range, the practical differences usually come down to face seal comfort, filter workflow, cleaning routine, and how easily the respirator sits alongside goggles or helmets.',
    ],
    guideTitle: 'How to choose respiratory protection',
    guideSteps: [
      'Match the respirator style to the hazard profile first, including nuisance dust, grinding dust, paint spray, fumes, or chemical exposure.',
      'Check face seal quality, adjustability, and material comfort because poor fit reduces real-world protection even when the product spec looks strong on paper.',
      'Review compatibility with goggles, helmets, and other PPE so the full kit works together without pressure points or seal breaks.',
      'Plan for maintenance, filter changes, cleaning, and replacement cycles before standardizing a respirator across a team.',
    ],
    applicationsTitle: 'Typical respiratory protection searches and use cases',
    applications: [
      'Construction dust control',
      'Chemical handling and maintenance',
      'Paint spraying and coating work',
      'Grinding, cutting, and polishing',
      'Industrial cleaning and shutdown work',
    ],
    differentiatorsTitle: 'What procurement teams usually compare',
    differentiators: [
      'Facepiece comfort for long shifts',
      'Filter compatibility and replacement workflow',
      'Seal stability during movement',
      'Integration with eye and head protection',
    ],
    faqTitle: 'Respiratory protection FAQ',
    faqs: [
      {
        question: 'What is the difference between a reusable respirator and a basic dust mask?',
        answer:
          'Reusable respirators are typically chosen when the buyer needs a more durable facepiece, replaceable filtration components, and a better seal for repeated industrial use.',
      },
      {
        question: 'How do I choose respiratory protection for chemical exposure?',
        answer:
          'Start with the specific airborne hazard, then confirm the respirator style and filter or cartridge setup are suitable for that environment and your internal safety requirements.',
      },
      {
        question: 'Should respiratory protection be selected together with goggles or helmets?',
        answer:
          'Yes. Compatibility matters because eye protection, head protection, and respirator straps can interfere with each other if they are sourced independently.',
      },
    ],
  },
  'hand-protection': {
    metaTitle: 'Hand Protection Gloves for Industrial Safety',
    metaDescription:
      'Browse hand protection gloves for welding, cut resistance, grip work, and general industrial handling across construction and manufacturing applications.',
    eyebrow: 'Grip, cut, and heat defense',
    leadTitle: 'Why buyers search hand protection by glove construction',
    intro: [
      'Hand protection is rarely one broad purchase. Most buyers already know whether they are looking for welding gloves, cut protection, coated grip gloves, or a heavier leather work glove before they open a product page.',
      'The useful comparison points here are coating type, cut performance, heat tolerance, dexterity, and wear life, because those details usually decide which glove family makes sense.',
    ],
    guideTitle: 'How to choose hand protection',
    guideSteps: [
      'Start with the main hazard, such as cut risk, welding heat, abrasive handling, oil contact, or general site labor.',
      'Balance protection with dexterity because heavy gloves can slow handling tasks that require touch sensitivity or precision.',
      'Compare palm coating, shell material, cuff length, and comfort for long-shift wear.',
      'Standardize glove families by job type so replenishment and training stay simple across crews.',
    ],
    applicationsTitle: 'Common hand protection use cases',
    applications: [
      'Welding and fabrication',
      'Material handling',
      'Construction site labor',
      'Warehouse and logistics',
      'Mechanical maintenance',
    ],
    differentiatorsTitle: 'What buyers usually compare',
    differentiators: [
      'Cut and abrasion resistance',
      'Grip in dry or oily conditions',
      'Heat tolerance and cuff length',
      'Comfort, flexibility, and wear life',
    ],
    faqTitle: 'Hand protection FAQ',
    faqs: [
      {
        question: 'How do I decide between coated gloves and leather work gloves?',
        answer:
          'Coated gloves are commonly chosen for grip and dexterity, while leather gloves are often preferred for rough handling, abrasion, and tougher general site work.',
      },
      {
        question: 'Are welding gloves suitable for general handling tasks?',
        answer:
          'They can be used for some heavy tasks, but welding gloves are usually optimized for heat and spark exposure rather than fine handling or coated-grip performance.',
      },
      {
        question: 'Why separate cut-resistant gloves from general work gloves?',
        answer:
          'Different glove families solve different hazards, and separating them makes it easier to compare the right products without mixing unrelated options together.',
      },
    ],
  },
  'head-protection': {
    metaTitle: 'Industrial Safety Helmets and Head Protection',
    metaDescription:
      'Explore industrial head protection including safety helmets, bump caps, face shields, and related PPE for construction and manufacturing environments.',
    eyebrow: 'Impact and overhead protection',
    leadTitle: 'How buyers sort head protection by job and hazard',
    intro: [
      'Head protection covers several very different purchasing jobs, from safety helmets and bump caps to face shields and hearing protection.',
      'The main comparison points are protection type, comfort, accessory compatibility, and whether the item is meant for overhead impact, low-clearance work, splash coverage, or noise control.',
    ],
    guideTitle: 'How to choose head protection',
    guideSteps: [
      'Confirm whether the job requires full helmet protection, a bump cap, face shielding, or a combined setup.',
      'Check adjustment systems, suspension design, and comfort because fit affects real adoption on site.',
      'Review visor, chin strap, hearing protection, and accessory compatibility if the gear will be used as part of a wider PPE system.',
      'Separate lightweight visitor or low-risk options from helmets intended for demanding industrial environments.',
    ],
    applicationsTitle: 'Common head protection use cases',
    applications: [
      'Construction and civil works',
      'Warehousing and maintenance',
      'Utilities and plant work',
      'Fabrication and grinding areas',
      'Visitor and contractor safety kits',
    ],
    differentiatorsTitle: 'What buyers usually compare',
    differentiators: [
      'Impact coverage and shell design',
      'Suspension and adjustability',
      'Accessory mounting options',
      'Ventilation, comfort, and visibility',
    ],
    faqTitle: 'Head protection FAQ',
    faqs: [
      {
        question: 'When should a buyer choose a bump cap instead of a safety helmet?',
        answer:
          'Bump caps are generally considered for low-clearance contact hazards, while safety helmets are chosen when stronger impact protection is required.',
      },
      {
        question: 'Why include face shields in head protection navigation?',
        answer:
          'Many buyers evaluate face protection together with helmets and head-mounted accessories, so the category path should reflect that buying behavior.',
      },
      {
        question: 'What makes a head protection category more useful for buyers?',
        answer:
          'The page is more useful when it explains real use cases, selection criteria, and how helmets, bump caps, face shields, and related items fit into the same PPE kit.',
      },
    ],
  },
  'foot-protection': {
    metaTitle: 'Safety Shoes and Boots for Industrial Work',
    metaDescription:
      'Browse safety shoes, industrial boots, and safety rain boots for construction, warehouse work, manufacturing, and heavy-duty site protection.',
    eyebrow: 'Toe, sole, and slip protection',
    leadTitle: 'Safety footwear buyers search by environment and boot type',
    intro: [
      'Foot protection usually breaks down into three practical choices: lighter safety shoes, heavier safety boots, and waterproof rain boots for wet or muddy environments.',
      'Most footwear comparisons come back to toe protection, sole grip, waterproofing, ankle support, and whether the pair will still feel right at the end of a long shift.',
    ],
    guideTitle: 'How to choose foot protection',
    guideSteps: [
      'Start with the work environment, including indoor production, mixed warehouse work, wet conditions, outdoor construction, or mining support tasks.',
      'Compare shoe height, upper material, sole construction, and waterproofing against the actual hazard profile.',
      'Check whether lighter athletic-style safety shoes or heavier-duty boots are more appropriate for the team.',
      'Review comfort and replacement cycles because footwear decisions affect compliance just as much as protection levels.',
    ],
    applicationsTitle: 'Common foot protection use cases',
    applications: [
      'Construction and contracting',
      'Manufacturing and assembly',
      'Warehouse operations',
      'Mining and heavy industry',
      'Wet-site and outdoor work',
    ],
    differentiatorsTitle: 'What buyers usually compare',
    differentiators: [
      'Toe and underfoot protection',
      'Waterproofing and weather resistance',
      'Ankle coverage and support',
      'Slip resistance and daily comfort',
    ],
    faqTitle: 'Foot protection FAQ',
    faqs: [
      {
        question: 'What is the difference between safety shoes and safety boots?',
        answer:
          'Safety shoes are often chosen for lighter, faster-moving work, while safety boots usually add more coverage and support for tougher environments.',
      },
      {
        question: 'When are safety rain boots the better option?',
        answer:
          'Safety rain boots are commonly considered when waterproofing, easy cleaning, and wet-site durability are more important than lightweight everyday wear.',
      },
      {
        question: 'Why should footwear category pages include guidance content?',
        answer:
          'Because buyers usually compare multiple protection and comfort factors before they click into a product detail page.',
      },
    ],
  },
  'body-protection': {
    metaTitle: 'Protective Workwear and Coveralls',
    metaDescription:
      'Shop protective workwear, coveralls, reflective safety clothing, and rainwear for industrial, construction, and maintenance environments.',
    eyebrow: 'Coverage for weather, visibility, and hazards',
    leadTitle: 'How buyers sort protective workwear by garment type',
    intro: [
      'Body protection spans reflective workwear, disposable coveralls, FR coveralls, rainwear, and general protective clothing used in industrial, utility, maintenance, and construction environments.',
      'In practice, buyers usually narrow the shortlist by garment family first: disposable coveralls for hygiene workflows, FR apparel for hazard-specific work, reflective gear for visibility, and rainwear for weather exposure.',
    ],
    guideTitle: 'How to choose body protection',
    guideSteps: [
      'Identify the primary driver first, such as visibility, contamination control, weather exposure, flame resistance, or general workwear durability.',
      'Separate disposable garments from reusable workwear so teams can compare procurement and replacement logic more clearly.',
      'Look at fabric weight, closures, reflective coverage, and movement comfort for the actual shift conditions.',
      'Group garments by task type so users can land on the right protective clothing family without excessive filtering.',
    ],
    applicationsTitle: 'Common body protection use cases',
    applications: [
      'Roadside and logistics visibility',
      'Industrial maintenance',
      'Food processing and hygiene',
      'Welding and hot work support',
      'Outdoor weather exposure',
    ],
    differentiatorsTitle: 'What buyers usually compare',
    differentiators: [
      'Visibility and reflective coverage',
      'Disposable versus reusable garments',
      'Weather, chemical, or FR performance',
      'Comfort and mobility during long shifts',
    ],
    faqTitle: 'Body protection FAQ',
    faqs: [
      {
        question: 'Why split disposable coveralls from reusable work coveralls?',
        answer:
          'They serve different procurement and safety use cases, so separating them improves product discovery and makes the category page more relevant.',
      },
      {
        question: 'When should buyers evaluate FR coveralls separately?',
        answer:
          'FR garments are usually purchased for specific hazard environments, so they deserve dedicated copy and clearer internal linking.',
      },
      {
        question: 'Why separate workwear into smaller apparel families?',
        answer:
          'Because buyers usually compare reflective garments, disposable coveralls, FR coveralls, and rainwear for different job conditions and replacement cycles.',
      },
    ],
  },
  'fall-protection': {
    metaTitle: 'Fall Protection Equipment for Elevated Work',
    metaDescription:
      'Browse fall protection equipment for roofing, scaffolding, steel work, maintenance, and other elevated tasks, including harness-focused product families.',
    eyebrow: 'Protection for work at height',
    leadTitle: 'How buyers compare fall protection for elevated work',
    intro: [
      'Fall protection is usually purchased around a specific exposure: roofing, scaffolding, tower work, steel erection, maintenance at height, or controlled access on a temporary structure.',
      'Most teams here are trying to match the gear to the work at height itself: how the setup will be worn, how it moves with the worker, and how it fits the rest of the system used on site.',
    ],
    guideTitle: 'How to choose fall protection',
    guideSteps: [
      'Start with the elevated-work task, clearance conditions, and the type of fall exposure the team has to control.',
      'Separate body-worn equipment from the rest of the PPE catalog so buyers can compare fall-arrest products without unrelated apparel noise.',
      'Check how the harness, connection point, and surrounding PPE will work together during real movement on site.',
      'Standardize fall protection by use case so training, inspection, and replacement stay consistent across crews.',
    ],
    applicationsTitle: 'Common fall protection use cases',
    applications: [
      'Roofing and cladding work',
      'Scaffolding and access towers',
      'Steel erection and structural work',
      'Maintenance platforms and plant shutdowns',
      'Utilities and elevated inspection routes',
    ],
    differentiatorsTitle: 'What buyers usually compare',
    differentiators: [
      'Task-specific fall-arrest setup',
      'Worker mobility and comfort',
      'Compatibility with helmets and other PPE',
      'Inspection and replacement workflow',
    ],
    faqTitle: 'Fall protection FAQ',
    faqs: [
      {
        question: 'Why should fall protection sit outside body protection workwear categories?',
        answer:
          'Because the buying job is different. Fall protection is driven by elevated-work risk, connection logic, and inspection workflow rather than garment selection.',
      },
      {
        question: 'What should a fall protection category page help buyers compare?',
        answer:
          'It should help buyers sort gear by the job at height, worker movement, body-worn equipment, and how the setup fits the rest of the PPE kit.',
      },
      {
        question: 'Can a fall protection page still support broader construction PPE journeys?',
        answer:
          'Yes. It should stay focused on elevated-work control while linking back to the wider construction PPE structure when buyers need the full kit.',
      },
    ],
  },
  'eye-protection': {
    metaTitle: 'Safety Glasses and Goggles',
    metaDescription:
      'Find safety glasses and safety goggles for dust, anti-fog performance, impact protection, and industrial eye protection applications.',
    eyebrow: 'Clear vision in hazardous environments',
    leadTitle: 'Eye protection searches split by coverage and lens behavior',
    intro: [
      'Eye protection decisions usually start with one question: do you need open-frame glasses or a more enclosed goggle format?',
      'After that, the real comparison tends to be anti-fog behavior, comfort, seal, and how well the eyewear works with nearby PPE.',
    ],
    guideTitle: 'How to choose eye protection',
    guideSteps: [
      'Decide whether the user needs open safety glasses or a more sealed goggle style for dust, splash, or higher exposure environments.',
      'Check anti-fog and anti-scratch characteristics for the real work environment rather than relying on a basic image comparison.',
      'Evaluate comfort around the nose, temples, and straps when the product will be worn with helmets or respirators.',
      'Keep glasses and goggles on their own paths so buyers can reach the right format faster.',
    ],
    applicationsTitle: 'Common eye protection use cases',
    applications: [
      'Grinding and cutting',
      'Dusty construction zones',
      'Laboratory and chemical work',
      'General site inspection',
      'Maintenance and repair tasks',
    ],
    differentiatorsTitle: 'What buyers usually compare',
    differentiators: [
      'Goggle versus glasses coverage',
      'Anti-fog and anti-scratch performance',
      'Comfort with other PPE',
      'Fit, seal, and all-day wearability',
    ],
    faqTitle: 'Eye protection FAQ',
    faqs: [
      {
        question: 'When are safety goggles a better choice than safety glasses?',
        answer:
          'Goggles are usually considered when more enclosed coverage is needed for dust, splash, or higher exposure work zones.',
      },
      {
        question: 'Why should eye protection pages discuss anti-fog performance?',
        answer:
          'Because anti-fog behavior strongly affects user satisfaction and repeat purchase decisions in active work environments.',
      },
      {
        question: 'Can eye protection pages support related respiratory searches?',
        answer:
          'Yes. Buyers often evaluate goggles and respirators together, so category content should acknowledge cross-PPE compatibility.',
      },
    ],
  },
}

const subcategoryContent: Record<string, CategorySeoContent> = {
  'welding-gloves': {
    metaTitle: 'Welding Gloves for Heat and Spark Protection',
    metaDescription:
      'Browse welding gloves for fabrication, hot work, and metal handling with longer cuffs, leather construction, and industrial heat protection.',
    eyebrow: 'Heat, sparks, and long cuffs',
    leadTitle: 'Welding gloves are chosen for hot-work tasks',
    intro: [
      'Welding gloves are chosen for heat exposure, sparks, long gauntlet cuffs, and heavier leather construction rather than everyday site handling.',
      'They make more sense when compared as a hot-work product family instead of being mixed into cut-resistant, coated, or general-purpose glove ranges.',
    ],
    guideTitle: 'How to choose welding gloves',
    guideSteps: [
      'Prioritize heat and spark exposure before worrying about fine dexterity.',
      'Compare cuff length, leather weight, lining, and seam reinforcement for the actual welding process.',
      'Check whether the glove needs to support stick, MIG, TIG, or general fabrication tasks.',
      'Review wear life and comfort because welding gloves are often used for long, repetitive shifts.',
    ],
    applicationsTitle: 'Typical welding glove applications',
    applications: ['MIG welding', 'Stick welding', 'General fabrication', 'Hot metal handling'],
    differentiatorsTitle: 'What buyers compare in welding gloves',
    differentiators: ['Cuff length', 'Leather thickness', 'Heat protection', 'Palm durability'],
    faqTitle: 'Welding gloves FAQ',
    faqs: [
      {
        question: 'Why are welding gloves usually longer than general work gloves?',
        answer:
          'Longer cuffs help protect wrists and forearms from sparks, hot surfaces, and metal spatter in welding environments.',
      },
      {
        question: 'Can welding gloves replace coated work gloves on site?',
        answer:
          'Not usually. Welding gloves are selected for heat and abrasion, while coated gloves are typically preferred for grip and dexterity.',
      },
      {
        question: 'What should buyers compare on a welding gloves page?',
        answer:
          'Hot-work tasks, leather construction, cuff coverage, and fabrication use cases are usually the details that matter most here.',
      },
    ],
  },
  'cut-resistant-gloves': {
    metaTitle: 'Cut Resistant Gloves for Industrial Handling',
    metaDescription:
      'Explore cut resistant gloves for sharp material handling, fabrication, glass work, and industrial tasks that require dexterity with stronger cut protection.',
    eyebrow: 'Sharp-edge handling control',
    leadTitle: 'How buyers compare cut resistant gloves for sharp-part handling',
    intro: [
      'Cut resistant gloves are usually considered when the work involves blades, sheet material, glass, metal edges, or other sharp-part handling.',
      'Most buyers here focus on cut level, grip coating, dexterity, and how the glove feels during repetitive handling tasks.',
    ],
    guideTitle: 'How to choose cut resistant gloves',
    guideSteps: [
      'Start with the severity and frequency of sharp-edge exposure.',
      'Balance cut protection with flexibility so the glove still supports real handling speed.',
      'Check coating type if the work also involves oily, dusty, or wet parts.',
      'Compare wear life and replacement cadence for repetitive industrial use.',
    ],
    applicationsTitle: 'Typical cut glove applications',
    applications: ['Sheet metal handling', 'Glass handling', 'Warehouse picking', 'Assembly work'],
    differentiatorsTitle: 'What buyers compare in cut gloves',
    differentiators: ['Cut level', 'Grip coating', 'Dexterity', 'All-day comfort'],
    faqTitle: 'Cut resistant gloves FAQ',
    faqs: [
      {
        question: 'Are cut resistant gloves always bulky?',
        answer:
          'No. Many buyers specifically look for cut protection that still preserves dexterity for assembly, sorting, and detailed handling tasks.',
      },
      {
        question: 'Why are some cut resistant gloves also nitrile coated?',
        answer:
          'Because buyers often need both sharp-edge protection and stronger grip performance in the same task.',
      },
      {
        question: 'What should a cut glove category page emphasize?',
        answer:
          'It should focus on sharp-material handling, coating options, dexterity, and real work environments instead of generic glove copy.',
      },
    ],
  },
  'nitrile-coated-gloves': {
    metaTitle: 'Nitrile Coated Gloves for Grip and Abrasion',
    metaDescription:
      'Shop nitrile coated gloves for grip, abrasion resistance, and industrial handling in construction, warehouse, and maintenance environments.',
    eyebrow: 'Grip-first coated glove traffic',
    leadTitle: 'Nitrile coated gloves focus on coated-palm grip',
    intro: [
      'Nitrile coated gloves usually win traffic from buyers who already know they want stronger grip and coated-palm performance, especially for maintenance, handling, and general site work.',
      'They are usually judged by coating feel, wear life, and how confidently they handle repeated industrial tasks.',
    ],
    guideTitle: 'How to choose nitrile coated gloves',
    guideSteps: [
      'Check the handling environment first, including dry, oily, or mixed-surface conditions.',
      'Compare shell flexibility and palm coating density for the right balance of grip and movement.',
      'Look at abrasion expectations if the glove will be used for repetitive handling.',
      'Use product family consistency to simplify replenishment for crews or warehouse teams.',
    ],
    applicationsTitle: 'Typical nitrile glove applications',
    applications: ['General handling', 'Warehouse work', 'Maintenance tasks', 'Construction labor'],
    differentiatorsTitle: 'What buyers compare in nitrile coated gloves',
    differentiators: ['Grip performance', 'Abrasion resistance', 'Palm feel', 'Reorder consistency'],
    faqTitle: 'Nitrile coated gloves FAQ',
    faqs: [
      {
        question: 'Why do buyers search nitrile coated gloves specifically?',
        answer:
          'Because the coating is often the main buying decision, especially when grip and wear life matter more than broad general glove categories.',
      },
      {
        question: 'Are nitrile coated gloves only for oily environments?',
        answer:
          'No. They are also commonly used for dry handling where buyers want a durable coated palm and better control.',
      },
      {
        question: 'What should buyers compare in nitrile coated gloves?',
        answer:
          'Grip behavior, coating durability, shell comfort, and repeated handling performance usually matter more here than broad general glove descriptions.',
      },
    ],
  },
  'latex-coated-gloves': {
    metaTitle: 'Latex Coated Gloves for Construction Grip',
    metaDescription:
      'Browse latex coated gloves for construction, material handling, and site work where grip, comfort, and cost-effective coated protection matter.',
    eyebrow: 'Dry-grip site work focus',
    leadTitle: 'How buyers compare latex coated gloves for everyday grip work',
    intro: [
      'Latex coated gloves are often searched by buyers who want dependable grip and economical coated-glove coverage for construction, warehousing, and general site work.',
      'That means the page needs its own language around coating texture, handling comfort, and day-to-day labor conditions rather than borrowing the same copy as nitrile-coated or leather gloves.',
    ],
    guideTitle: 'How to choose latex coated gloves',
    guideSteps: [
      'Start with the kind of handling task and surface contact the team sees most often.',
      'Compare coating texture and shell weight for grip versus comfort.',
      'Check durability expectations for repeated construction or logistics work.',
      'Separate latex-coated products from other glove families so buyers can compare like for like.',
    ],
    applicationsTitle: 'Typical latex glove applications',
    applications: ['Construction handling', 'Logistics work', 'General labor', 'Warehouse picking'],
    differentiatorsTitle: 'What buyers compare in latex coated gloves',
    differentiators: ['Crinkle grip feel', 'Daily comfort', 'Shell thickness', 'Value for volume purchasing'],
    faqTitle: 'Latex coated gloves FAQ',
    faqs: [
      {
        question: 'Why should latex coated gloves have their own category page?',
        answer:
          'Because buyers frequently search by coating type, and latex-coated gloves solve a different grip and pricing problem than leather or nitrile glove families.',
      },
      {
        question: 'Are latex coated gloves usually chosen for precision work?',
        answer:
          'They are more often selected for practical site handling and general labor where dependable grip and comfort matter.',
      },
      {
        question: 'What makes latex-coated glove content more distinct?',
        answer:
          'Mentioning coating texture, construction use cases, and catalog-specific glove patterns helps separate the page from other glove categories.',
      },
    ],
  },
  'leather-work-gloves': {
    metaTitle: 'Leather Work Gloves for Heavy Duty Handling',
    metaDescription:
      'Find leather work gloves for abrasive handling, construction labor, outdoor jobs, and heavy-duty industrial tasks requiring durable hand protection.',
    eyebrow: 'Cowhide and split leather durability',
    leadTitle: 'How buyers compare leather work gloves for rough handling',
    intro: [
      'Leather work gloves are usually sought for harder-wearing tasks where abrasion resistance and tougher construction matter more than a thin coated-palm feel.',
      'They are easier to evaluate when lined up against heavier construction and industrial handling jobs instead of lighter coated-glove tasks.',
    ],
    guideTitle: 'How to choose leather work gloves',
    guideSteps: [
      'Compare leather type, palm durability, and reinforcement for the expected workload.',
      'Check whether the task needs full heavy-duty coverage or a more flexible combination glove.',
      'Review cuff style and comfort if the glove will be worn all day outdoors or on site.',
      'Use leather work gloves where abrasion and rugged handling matter more than coated grip specialization.',
    ],
    applicationsTitle: 'Typical leather glove applications',
    applications: ['Construction labor', 'Outdoor handling', 'Rough materials', 'General heavy-duty work'],
    differentiatorsTitle: 'What buyers compare in leather work gloves',
    differentiators: ['Leather construction', 'Abrasion durability', 'Palm reinforcement', 'Outdoor comfort'],
    faqTitle: 'Leather work gloves FAQ',
    faqs: [
      {
        question: 'When are leather work gloves a better fit than coated gloves?',
        answer:
          'They are often chosen when the task involves rougher surfaces, heavier abrasion, and a preference for more traditional heavy-duty glove construction.',
      },
      {
        question: 'Are leather work gloves usually chosen for the same jobs as welding gloves?',
        answer:
          'No. Welding gloves focus on hot-work and spark exposure, while leather work gloves are more often used for broader heavy-duty handling tasks.',
      },
      {
        question: 'Why compare leather work gloves separately?',
        answer:
          'Because buyers usually look at different features when they are shopping for leather work gloves versus coated or cut-resistant gloves.',
      },
    ],
  },
  'knit-gloves': {
    metaTitle: 'Knit Gloves for General Site and Warehouse Work',
    metaDescription:
      'Browse knit gloves for general handling, light industrial work, warehouse tasks, and economical glove replenishment programs.',
    eyebrow: 'Lightweight general-purpose glove traffic',
    leadTitle: 'Knit gloves fit lighter, volume-driven purchasing',
    intro: [
      'Knit gloves tend to serve lighter handling, general labor, and volume purchasing scenarios rather than specialized welding or cut-protection tasks.',
      'That gives the page a distinct role in the site architecture: it addresses more practical, entry-level glove searches and supports broader procurement needs.',
    ],
    guideTitle: 'How to choose knit gloves',
    guideSteps: [
      'Confirm that the task is light-duty enough for a simpler glove format.',
      'Compare weight, comfort, and expected daily wear time.',
      'Review whether the glove is being purchased as a standalone product or as part of a larger replenishment program.',
      'Use knit gloves where flexibility and cost-efficient volume matter more than advanced hazard-specific protection.',
    ],
    applicationsTitle: 'Typical knit glove applications',
    applications: ['General labor', 'Warehouse work', 'Packing tasks', 'Basic site handling'],
    differentiatorsTitle: 'What buyers compare in knit gloves',
    differentiators: ['Weight', 'Comfort', 'Volume value', 'Everyday practicality'],
    faqTitle: 'Knit gloves FAQ',
    faqs: [
      {
        question: 'Why keep knit gloves separate from other hand protection pages?',
        answer:
          'Because the use case is lighter-duty and more cost-conscious, which is different from specialty glove categories such as welding or cut protection.',
      },
      {
        question: 'Are knit gloves a good fit for hazard-specific tasks?',
        answer:
          'They are generally better suited to lighter general work than to advanced heat, cut, or coating-driven applications.',
      },
      {
        question: 'Why keep knit gloves separate from other glove types?',
        answer:
          'It helps buyers compare simpler everyday gloves without mixing them with specialty heat, coating, or cut-protection products.',
      },
    ],
  },
  'safety-helmets': {
    metaTitle: 'Safety Helmets for Construction and Industry',
    metaDescription:
      'Shop safety helmets and hard hats for construction, utilities, factories, and industrial workplaces with adjustable suspension and accessory compatibility.',
    eyebrow: 'Hard hats and helmets',
    leadTitle: 'Safety helmets are the core product family inside head protection',
    intro: [
      'Safety helmets usually dominate head protection demand because buyers often know they need hard hats or industrial helmets before they evaluate the rest of the PPE kit.',
      'The products in this range are most often compared through shell type, suspension, ventilation, and accessory compatibility.',
    ],
    guideTitle: 'How to choose safety helmets',
    guideSteps: [
      'Start with the work environment and required head protection level.',
      'Compare shell construction, suspension design, and adjustment systems.',
      'Check compatibility with visors, hearing protection, and chin straps if the helmet is part of a wider PPE setup.',
      'Review comfort and ventilation for crews wearing helmets across full shifts.',
    ],
    applicationsTitle: 'Typical safety helmet applications',
    applications: ['Construction sites', 'Utilities work', 'Industrial plants', 'General contracting'],
    differentiatorsTitle: 'What buyers compare in safety helmets',
    differentiators: ['Shell design', 'Suspension system', 'Accessory options', 'Ventilation and comfort'],
    faqTitle: 'Safety helmets FAQ',
    faqs: [
      {
        question: 'Why should safety helmets have a dedicated subcategory page?',
        answer:
          'Because helmet use, protection level, and job-site expectations are different from bump caps, face shields, or hearing protection.',
      },
      {
        question: 'What product features usually matter most on safety helmet pages?',
        answer:
          'Buyers commonly compare suspension design, fit adjustment, shell format, and compatibility with mounted accessories.',
      },
      {
        question: 'Why compare safety helmets separately from the broader head protection range?',
        answer:
          'Because helmet buyers usually focus on shell design, suspension, fit, and mounted accessories in a way that differs from bump caps or face shields.',
      },
    ],
  },
  'bump-caps': {
    metaTitle: 'Bump Caps for Low Clearance Work Areas',
    metaDescription:
      'Explore bump caps for warehouses, maintenance zones, and low-clearance environments where lightweight head coverage is needed.',
    eyebrow: 'Low-clearance head coverage',
    leadTitle: 'Bump cap traffic is smaller but highly specific',
    intro: [
      'Bump cap buyers are typically not shopping for the same thing as safety helmet buyers. They are usually looking for lighter protection in lower-risk environments where overhead impact from falling objects is not the main concern.',
      'That narrower use case is easier to understand when bump caps are not buried inside a broad head protection page.',
    ],
    guideTitle: 'How to choose bump caps',
    guideSteps: [
      'Confirm the work area involves low-clearance contact rather than higher-impact helmet hazards.',
      'Compare cap comfort, fit, and ventilation for indoor daily wear.',
      'Look at appearance and worker adoption if the cap will be used in logistics or maintenance settings.',
      'Keep bump caps separate from safety helmets so buyers can compare lighter options without confusion.',
    ],
    applicationsTitle: 'Typical bump cap applications',
    applications: ['Warehouses', 'Maintenance zones', 'Facilities work', 'Low-clearance areas'],
    differentiatorsTitle: 'What buyers compare in bump caps',
    differentiators: ['Low-profile comfort', 'Ventilation', 'Daily wearability', 'Task suitability'],
    faqTitle: 'Bump caps FAQ',
    faqs: [
      {
        question: 'When is a bump cap more appropriate than a safety helmet?',
        answer:
          'Bump caps are generally considered for lower-clearance contact hazards rather than jobs that call for full industrial helmet protection.',
      },
      {
        question: 'Why can bump caps not just live under a generic head protection page?',
        answer:
          'Because the language, protection level, and use case are different enough to deserve a separate page.',
      },
      {
        question: 'What should bump cap content talk about?',
        answer:
          'It should focus on low-clearance environments, lightweight comfort, and daily indoor wearability.',
      },
    ],
  },
  'face-shields': {
    metaTitle: 'Face Shields for Splash and Impact Protection',
    metaDescription:
      'Browse face shields for grinding, splash protection, and industrial face coverage with compatibility across helmets and headgear.',
    eyebrow: 'Full-face splash and impact coverage',
    leadTitle: 'Face shield searches are use-case driven and visually specific',
    intro: [
      'Face shield searches often start with the task itself, such as splash protection, grinding, or general full-face coverage.',
      'The range stays easier to browse when face shields remain visible within head protection while still focusing on the hazards that usually drive demand.',
    ],
    guideTitle: 'How to choose face shields',
    guideSteps: [
      'Start with the exposure type, including splash, debris, or full-face coverage needs.',
      'Check compatibility with helmets or mounting systems if the shield is part of a broader PPE setup.',
      'Compare visor clarity and coverage for the exact work task.',
      'Keep face shields separate from basic eye protection so full-face coverage stays easy to find.',
    ],
    applicationsTitle: 'Typical face shield applications',
    applications: ['Grinding tasks', 'Splash protection', 'Workshop operations', 'Industrial maintenance'],
    differentiatorsTitle: 'What buyers compare in face shields',
    differentiators: ['Coverage area', 'Helmet compatibility', 'Visor clarity', 'Task suitability'],
    faqTitle: 'Face shields FAQ',
    faqs: [
      {
        question: 'Why should face shields not be merged into a generic goggles page?',
        answer:
          'Because the product format and hazard coverage are different, and many buyers look for face shields directly.',
      },
      {
        question: 'Are face shields usually selected on their own or with helmets?',
        answer:
          'Many buyers evaluate them alongside helmets and head-mounted systems, which is why the page should discuss compatibility explicitly.',
      },
      {
        question: 'What makes a face shield category easier to use?',
        answer:
          'It helps when the products are framed around real hazards and product-fit questions instead of appearing as just another item list.',
      },
    ],
  },
  'protective-hoods': {
    metaTitle: 'Protective Hoods for Chemical and Industrial Work',
    metaDescription:
      'Find protective hoods for chemical handling, industrial environments, and specialized head coverage beyond standard helmets.',
    eyebrow: 'Specialized hood coverage',
    leadTitle: 'Protective hoods need specialized, low-volume search treatment',
    intro: [
      'Protective hoods are a narrower PPE product family, and buyers looking for them typically know they need specialized coverage beyond a standard helmet alone.',
      'That makes the range easier to understand when it is described through industrial exposure, compatibility, and use-case positioning within the wider head protection catalog.',
    ],
    guideTitle: 'How to choose protective hoods',
    guideSteps: [
      'Identify the environment driving the hood requirement, such as chemical handling or specialty industrial exposure.',
      'Check how the hood integrates with nearby PPE and the rest of the worker setup.',
      'Compare material, comfort, and practical coverage needs for the job.',
      'Treat protective hoods as a specialized niche rather than generic headwear.',
    ],
    applicationsTitle: 'Typical protective hood applications',
    applications: ['Chemical work', 'Industrial processing', 'Maintenance tasks', 'Specialized coverage needs'],
    differentiatorsTitle: 'What buyers compare in protective hoods',
    differentiators: ['Coverage area', 'Compatibility', 'Material suitability', 'Task-specific use'],
    faqTitle: 'Protective hoods FAQ',
    faqs: [
      {
        question: 'Why do protective hoods need their own page?',
        answer:
          'Because the use case is specialized enough that buyers tend to search for this product family directly rather than through generic helmet pages.',
      },
      {
        question: 'Are protective hoods high-volume products?',
        answer:
          'Not always, but narrower categories can still be useful when they serve a clear, specialized use case.',
      },
      {
        question: 'What should hood category copy emphasize?',
        answer:
          'It should focus on specialized coverage, industrial environments, and integration with adjacent PPE.',
      },
    ],
  },
  'hearing-protection': {
    metaTitle: 'Hearing Protection Earmuffs for Industrial Noise',
    metaDescription:
      'Browse hearing protection earmuffs for industrial noise reduction, construction sites, workshops, and loud production environments.',
    eyebrow: 'Industrial noise reduction',
    leadTitle: 'How buyers compare hearing protection for noisy work areas',
    intro: [
      'Hearing protection sits close to head protection in procurement logic, but the search behavior is distinct. Buyers usually search for earmuffs or hearing protection by noise exposure rather than by helmet type.',
      'Keeping hearing protection separate makes it easier to compare noise-control products within the broader head protection range.',
    ],
    guideTitle: 'How to choose hearing protection',
    guideSteps: [
      'Start with the noise environment and how long users will wear the protection.',
      'Check compatibility if earmuffs need to work alongside helmets or other headgear.',
      'Compare comfort and fit because adoption can drop quickly when hearing protection is cumbersome.',
      'Keep hearing protection separate from impact-oriented head protection topics.',
    ],
    applicationsTitle: 'Typical hearing protection applications',
    applications: ['Workshops', 'Construction sites', 'Factories', 'High-noise maintenance'],
    differentiatorsTitle: 'What buyers compare in hearing protection',
    differentiators: ['Noise reduction level', 'Helmet compatibility', 'Comfort', 'Daily wearability'],
    faqTitle: 'Hearing protection FAQ',
    faqs: [
      {
        question: 'Why should hearing protection have its own category page?',
        answer:
          'Because buyers commonly compare hearing protection by noise-control needs, which is different from how they compare helmets or face shields.',
      },
      {
        question: 'Is hearing protection always bought separately from helmets?',
        answer:
          'Not always. Many buyers compare both together, which is why the page should mention compatibility with the wider head protection system.',
      },
      {
        question: 'What makes hearing protection different from the parent category?',
        answer:
          'It focuses on industrial noise reduction, earmuff use cases, and product selection criteria that are specific to hearing protection.',
      },
    ],
  },
  'safety-shoes': {
    metaTitle: 'Safety Shoes for Construction and Warehouse Work',
    metaDescription:
      'Find safety shoes for construction, warehouse, and industrial work with lighter low-cut designs, toe protection, and everyday comfort.',
    eyebrow: 'Low-cut industrial footwear',
    leadTitle: 'How buyers compare safety shoes for lighter daily work',
    intro: [
      'Safety shoes usually appeal to buyers looking for lighter, lower-cut industrial footwear rather than the heavier coverage associated with boots. That makes the page relevant for warehouse, assembly, and general site movement queries.',
      'Most buyers here are balancing lighter comfort against the amount of protection the job still requires.',
    ],
    guideTitle: 'How to choose safety shoes',
    guideSteps: [
      'Confirm the work environment suits a lower-cut safety footwear style.',
      'Compare toe protection, underfoot feel, and upper design for daily wear.',
      'Balance lightness and comfort against the protection needed for the job.',
      'Keep safety shoes separate from boots so lighter footwear options stay easy to compare.',
    ],
    applicationsTitle: 'Typical safety shoe applications',
    applications: ['Warehouse work', 'Assembly lines', 'General construction', 'Daily industrial wear'],
    differentiatorsTitle: 'What buyers compare in safety shoes',
    differentiators: ['Weight', 'Comfort', 'Low-cut mobility', 'Daily use practicality'],
    faqTitle: 'Safety shoes FAQ',
    faqs: [
      {
        question: 'Why do safety shoes need their own page separate from safety boots?',
        answer:
          'Because buyers searching for safety shoes are usually prioritizing lighter everyday wear and lower-cut mobility, which is different from what boot buyers usually need.',
      },
      {
        question: 'Are safety shoes only for light-duty work?',
        answer:
          'Not necessarily, but they are often chosen when comfort and movement matter alongside core protection features.',
      },
      {
        question: 'What should buyers compare on a safety shoes page?',
        answer:
          'Lighter industrial footwear, warehouse and everyday site use, and the differences from boots are usually the most helpful comparisons.',
      },
    ],
  },
  'safety-boots': {
    metaTitle: 'Safety Boots for Construction and Heavy Duty Work',
    metaDescription:
      'Browse safety boots for construction, industrial sites, and heavy-duty work where higher coverage, support, and durability matter.',
    eyebrow: 'Higher coverage industrial boots',
    leadTitle: 'How buyers compare safety boots for tougher site conditions',
    intro: [
      'Safety boots attract buyers who want more coverage and a tougher footwear platform than low-cut safety shoes, especially for more demanding site conditions and longer outdoor wear.',
      'They are usually compared on support, durability, and how well they hold up in rougher site conditions.',
    ],
    guideTitle: 'How to choose safety boots',
    guideSteps: [
      'Start with how much ankle support and coverage the environment calls for.',
      'Compare boot height, upper build, and sole construction for the task.',
      'Review waterproofing and weather resilience where applicable.',
      'Keep safety boot content distinct from lighter safety shoe positioning.',
    ],
    applicationsTitle: 'Typical safety boot applications',
    applications: ['Construction sites', 'Outdoor work', 'Heavy industry', 'Long-shift site use'],
    differentiatorsTitle: 'What buyers compare in safety boots',
    differentiators: ['Coverage height', 'Durability', 'Support', 'Site resilience'],
    faqTitle: 'Safety boots FAQ',
    faqs: [
      {
        question: 'Why do buyers search safety boots separately from safety shoes?',
        answer:
          'Because they usually expect stronger support, more coverage, and a tougher build for demanding site conditions.',
      },
      {
        question: 'What makes safety boots more relevant for heavy-duty environments?',
        answer:
          'Buyers often associate boots with more rugged outdoor use, greater support, and a more durable platform for harsh work conditions.',
      },
      {
        question: 'Why compare safety boots separately from other footwear?',
        answer:
          'It gives heavier-duty footwear buyers a more precise place to compare coverage, support, and rugged site use.',
      },
    ],
  },
  'safety-rain-boots': {
    metaTitle: 'Safety Rain Boots for Wet and Muddy Job Sites',
    metaDescription:
      'Shop safety rain boots and waterproof industrial boots for wet-site construction, mining, outdoor work, and muddy environments.',
    eyebrow: 'Waterproof site footwear',
    leadTitle: 'Rain boot traffic is driven by waterproof, wet-site search terms',
    intro: [
      'Safety rain boots are usually chosen for waterproofing, wet-site durability, and easy-clean industrial footwear. Buyers often come here because standard safety shoes or boots do not fit muddy or flooded work conditions.',
      'The job environment, product materials, and replacement cycle are usually different from general safety footwear.',
    ],
    guideTitle: 'How to choose safety rain boots',
    guideSteps: [
      'Start with the wetness and contamination level of the work environment.',
      'Compare waterproof materials, cleaning ease, and durability for outdoor or industrial use.',
      'Check whether the user needs full rain boot coverage rather than a standard safety boot.',
      'Keep safety rain boots separate so waterproof job-site needs are easier to compare at a glance.',
    ],
    applicationsTitle: 'Typical safety rain boot applications',
    applications: ['Wet construction sites', 'Mining support', 'Outdoor maintenance', 'Muddy industrial work'],
    differentiatorsTitle: 'What buyers compare in safety rain boots',
    differentiators: ['Waterproofing', 'Cleaning ease', 'Wet-site durability', 'Boot height'],
    faqTitle: 'Safety rain boots FAQ',
    faqs: [
      {
        question: 'Why should safety rain boots have a separate category page?',
        answer:
          'Because buyers searching for waterproof industrial footwear usually have a different job environment and product requirement than buyers shopping standard safety boots.',
      },
      {
        question: 'Are safety rain boots mainly for outdoor use?',
        answer:
          'They are especially relevant where water, mud, or washdown conditions make waterproof coverage a priority.',
      },
      {
        question: 'What keeps safety rain boots distinct from other footwear?',
        answer:
          'Waterproof job-site needs, PVC-style materials, and wet-environment use cases make safety rain boots different from standard safety shoes or boots.',
      },
    ],
  },
  'flame-resistant-coveralls': {
    metaTitle: 'Flame Resistant Coveralls for Industrial Work',
    metaDescription:
      'Browse flame resistant coveralls for welding, utilities, mining, and industrial environments requiring FR or anti-static protective clothing.',
    eyebrow: 'FR and anti-static apparel',
    leadTitle: 'How buyers compare FR coveralls for hazard-specific work',
    intro: [
      'Flame resistant coveralls are typically searched by buyers with a known hazard environment, such as hot work, utilities, or industrial sites with FR and anti-static requirements.',
      'That makes the range much more specific than a general workwear collection and easier to compare for narrower industrial clothing needs.',
    ],
    guideTitle: 'How to choose flame resistant coveralls',
    guideSteps: [
      'Start with the hazard environment and internal protective clothing requirements.',
      'Check FR and anti-static positioning in relation to the actual task.',
      'Compare fabric comfort and movement because FR garments are often worn for long shifts.',
      'Keep FR coveralls distinct from disposable or general-purpose work coveralls in navigation and copy.',
    ],
    applicationsTitle: 'Typical FR coverall applications',
    applications: ['Welding support', 'Utilities work', 'Mining operations', 'Industrial maintenance'],
    differentiatorsTitle: 'What buyers compare in FR coveralls',
    differentiators: ['FR positioning', 'Anti-static relevance', 'Garment comfort', 'Hazard fit'],
    faqTitle: 'Flame resistant coveralls FAQ',
    faqs: [
      {
        question: 'Why should FR coveralls have their own category page?',
        answer:
          'Because buyers use different search language and make different procurement decisions when the garment is intended for specific hazard environments.',
      },
      {
        question: 'How is this category different from general work coveralls?',
        answer:
          'The focus here is hazard-specific apparel, especially FR and anti-static positioning, rather than general everyday industrial clothing.',
      },
      {
        question: 'What should buyers look for on an FR coveralls page?',
        answer:
          'Hot-work use cases, industrial hazards, anti-static positioning, and garment purpose usually matter more here than on a general workwear page.',
      },
    ],
  },
  'disposable-coveralls': {
    metaTitle: 'Disposable Coveralls for Hygiene and Protection',
    metaDescription:
      'Explore disposable coveralls for food processing, hygiene, contamination control, and lightweight protective clothing needs.',
    eyebrow: 'Single-use protective apparel',
    leadTitle: 'Disposable coveralls have a completely different buying logic',
    intro: [
      'Disposable coveralls are usually purchased for hygiene, contamination control, and quick replacement workflows rather than for long-term garment durability.',
      'They belong in a separate comparison set from heavier reusable workwear because the replacement cycle and use pattern are completely different.',
    ],
    guideTitle: 'How to choose disposable coveralls',
    guideSteps: [
      'Start with the hygiene or contamination-control requirement driving the purchase.',
      'Compare ease of use and replacement workflow rather than long-term garment life.',
      'Check fit and comfort for the shift duration and environment.',
      'Keep disposable coveralls distinct from reusable workwear so single-use and reusable options stay easy to sort.',
    ],
    applicationsTitle: 'Typical disposable coverall applications',
    applications: ['Food processing', 'Hygiene control', 'Contamination management', 'Light protective tasks'],
    differentiatorsTitle: 'What buyers compare in disposable coveralls',
    differentiators: ['Single-use workflow', 'Contamination control', 'Comfort', 'Procurement simplicity'],
    faqTitle: 'Disposable coveralls FAQ',
    faqs: [
      {
        question: 'Why compare disposable coveralls separately from reusable workwear?',
        answer:
          'Because the buying cycle, use case, and replacement logic are different from reusable industrial workwear and coveralls.',
      },
      {
        question: 'Are disposable coveralls mainly for food and hygiene settings?',
        answer:
          'They are especially relevant in those environments because buyers often prioritize cleanliness and rapid replacement.',
      },
      {
        question: 'What makes disposable coveralls different from other body protection products?',
        answer:
          'They focus on single-use garment logic, contamination concerns, and operational simplicity rather than durability-driven apparel.',
      },
    ],
  },
  'work-coveralls': {
    metaTitle: 'Work Coveralls for Everyday Industrial Use',
    metaDescription:
      'Browse work coveralls for general industrial wear, maintenance teams, daily site clothing, and practical full-body protective apparel.',
    eyebrow: 'General industrial coverall traffic',
    leadTitle: 'How buyers compare work coveralls for daily industrial wear',
    intro: [
      'Work coveralls sit between specialized FR garments and disposable coveralls. Buyers usually land here looking for everyday industrial clothing that offers practical coverage and durability without a narrow hazard-specific focus.',
      'Most buyers here focus on comfort, durability, and practicality rather than FR-specific or disposable-garment requirements.',
    ],
    guideTitle: 'How to choose work coveralls',
    guideSteps: [
      'Start with the day-to-day work environment and coverage needed.',
      'Compare fabric comfort, mobility, and durability for repeated daily use.',
      'Check closures, fit, and practicality for maintenance or site teams.',
      'Keep work coveralls separate so buyers can distinguish general-purpose apparel from FR or disposable garments.',
    ],
    applicationsTitle: 'Typical work coverall applications',
    applications: ['Daily industrial wear', 'Maintenance teams', 'General site clothing', 'Workshop operations'],
    differentiatorsTitle: 'What buyers compare in work coveralls',
    differentiators: ['Daily comfort', 'Durability', 'General-purpose coverage', 'Mobility'],
    faqTitle: 'Work coveralls FAQ',
    faqs: [
      {
        question: 'How are work coveralls different from FR coveralls?',
        answer:
          'Work coveralls are typically chosen for everyday industrial wear, while FR coveralls are associated with more hazard-specific protective requirements.',
      },
      {
        question: 'Why should general work coveralls have their own page?',
        answer:
          'Because buyers often search directly for practical everyday coveralls rather than for the broader body protection category.',
      },
      {
        question: 'What keeps work coveralls different from FR or disposable garments?',
        answer:
          'The comparison points here are daily wear, industrial practicality, and general garment comfort rather than FR-specific or single-use requirements.',
      },
    ],
  },
  'safety-harness': {
    metaTitle: 'Safety Harness for Construction and Elevated Work',
    metaDescription:
      'Find safety harness options for roofing, scaffolding, steel work, tower access, and other elevated tasks where a secure body-worn fall protection setup is required.',
    eyebrow: 'Body-worn fall protection',
    leadTitle: 'How buyers compare safety harnesses for work at height',
    intro: [
      'Teams looking here usually need a body-worn fall protection product for elevated work, shutdown access, scaffold movement, or roof-edge exposure.',
      'The main questions are usually straightforward: how the harness adjusts, where it connects, how comfortable it stays during movement, and whether it works with the rest of the setup already used on site.',
    ],
    guideTitle: 'How to choose a safety harness',
    guideSteps: [
      'Start with the task at height, worker movement pattern, and how often the harness will be worn during the shift.',
      'Check adjustment points, dorsal or chest connection layout, and overall fit so the harness can be worn correctly by the actual crew.',
      'Review compatibility with lanyards, anchor arrangements, helmets, and other PPE used in the same elevated-work system.',
      'Plan inspection, replacement, and training routines before standardizing one harness style across the team.',
    ],
    applicationsTitle: 'Typical safety harness applications',
    applications: [
      'Roofing and edge work',
      'Scaffolding access',
      'Steel erection',
      'Tower and utility maintenance',
      'Plant shutdown work at height',
    ],
    differentiatorsTitle: 'What buyers compare in safety harnesses',
    differentiators: [
      'Adjustment and body fit',
      'Connection-point layout',
      'Comfort during climbing and movement',
      'Compatibility with the existing fall-arrest setup',
    ],
    faqTitle: 'Safety harness FAQ',
    faqs: [
      {
        question: 'Why should safety harnesses have their own category page?',
        answer:
          'Because buyers searching for harnesses are usually solving an elevated-work control problem and want to compare body-worn fall protection directly.',
      },
      {
        question: 'What should buyers compare on a safety harness page?',
        answer:
          'Buyers usually compare fit, connection layout, movement comfort, and how the harness works with the wider fall-protection system.',
      },
      {
        question: 'Should a safety harness page mention inspection and training?',
        answer:
          'Yes. Harness decisions are closely tied to inspection routines, worker fit, and how consistently crews can use the equipment correctly on site.',
      },
    ],
  },
  'safety-vests': {
    metaTitle: 'Safety Vests for High Visibility Work',
    metaDescription:
      'Find safety vests for construction, logistics, roadside work, and high-visibility applications where lightweight reflective coverage is needed.',
    eyebrow: 'Lightweight visibility gear',
    leadTitle: 'How buyers compare safety vests for quick visibility coverage',
    intro: [
      'Safety vest queries are usually visibility-driven. Buyers are often looking for a simpler reflective garment than a full hi-vis workwear set, especially for traffic, logistics, and contractor visibility needs.',
      'That usually makes the choice simpler than heavier jackets, pants, or full workwear combinations.',
    ],
    guideTitle: 'How to choose safety vests',
    guideSteps: [
      'Start with how much visibility coverage the task needs.',
      'Check whether a lightweight vest is sufficient or if a fuller workwear set is more appropriate.',
      'Compare comfort and ease of wear for quick daily use.',
      'Keep safety vests separate from broader hi-vis apparel so the lighter option stays easy to find.',
    ],
    applicationsTitle: 'Typical safety vest applications',
    applications: ['Roadside work', 'Logistics visibility', 'Construction sites', 'Contractor identification'],
    differentiatorsTitle: 'What buyers compare in safety vests',
    differentiators: ['Visibility focus', 'Lightweight wear', 'Ease of use', 'Reflective coverage'],
    faqTitle: 'Safety vests FAQ',
    faqs: [
      {
        question: 'Why should safety vests have their own category page?',
        answer:
          'Because buyers searching for vests usually want a lighter visibility garment and do not always intend to browse full hi-vis workwear sets.',
      },
      {
        question: 'How are safety vests different from hi-vis workwear?',
        answer:
          'Safety vests generally represent a lighter, simpler visibility product compared with jackets, pants, or multi-piece reflective garments.',
      },
      {
        question: 'What should buyers compare on a safety vest page?',
        answer:
          'Visibility, lightweight wear, and task-specific use cases usually matter most when comparing safety vests.',
      },
    ],
  },
  'hi-vis-workwear': {
    metaTitle: 'Hi-Vis Workwear for Industrial and Roadside Teams',
    metaDescription:
      'Shop hi-vis workwear including reflective jackets, pants, and coordinated apparel sets for industrial, logistics, and roadside visibility.',
    eyebrow: 'Full reflective apparel systems',
    leadTitle: 'How buyers compare hi-vis workwear for fuller body coverage',
    intro: [
      'Hi-vis workwear buyers are usually looking for more than a single reflective vest. They often need jackets, pants, and coordinated garment sets suitable for regular field use.',
      'That usually puts the decision closer to full-body visibility coverage than to a simple vest-only choice.',
    ],
    guideTitle: 'How to choose hi-vis workwear',
    guideSteps: [
      'Start with the visibility requirement and the amount of body coverage needed.',
      'Compare garment sets versus lighter single-piece options.',
      'Review comfort, weather suitability, and movement for field teams.',
      'Keep hi-vis workwear separate from safety vests so broader apparel-set searches remain easy to browse.',
    ],
    applicationsTitle: 'Typical hi-vis workwear applications',
    applications: ['Roadside crews', 'Logistics yards', 'Construction teams', 'Outdoor industrial work'],
    differentiatorsTitle: 'What buyers compare in hi-vis workwear',
    differentiators: ['Coverage level', 'Garment-set format', 'Weather suitability', 'Field practicality'],
    faqTitle: 'Hi-vis workwear FAQ',
    faqs: [
      {
        question: 'Why should hi-vis workwear have its own page instead of sharing with safety vests?',
        answer:
          'Because many buyers are searching for fuller reflective apparel systems, not just a lightweight vest option.',
      },
      {
        question: 'What should hi-vis workwear content emphasize?',
        answer:
          'It should focus on coordinated garments, broader body coverage, and regular field use across industrial or roadside teams.',
      },
      {
        question: 'How is hi-vis workwear different from safety vests?',
        answer:
          'Hi-vis workwear usually covers fuller apparel sets and broader body coverage, which is different from the lighter vest-focused buying path.',
      },
    ],
  },
  'rainwear': {
    metaTitle: 'Industrial Rainwear for Outdoor Work and Weather Protection',
    metaDescription:
      'Browse industrial rainwear for outdoor work, waterproof protection, and harsh-weather job sites where durable outerwear matters.',
    eyebrow: 'Weather-driven protective apparel',
    leadTitle: 'Rainwear traffic is shaped by waterproof outdoor job conditions',
    intro: [
      'Rainwear buyers are usually thinking first about weather exposure rather than general protective clothing. They want waterproof outerwear that supports outdoor work, site mobility, and durable use in wet conditions.',
      'That puts rainwear in a different decision set from reflective apparel, FR garments, or disposable coveralls.',
    ],
    guideTitle: 'How to choose rainwear',
    guideSteps: [
      'Start with the weather exposure and site conditions involved.',
      'Compare waterproofing and garment practicality for the expected shift.',
      'Check whether the rainwear needs to support other protective clothing layers.',
      'Keep rainwear separate so weather-driven apparel needs are easy to find.',
    ],
    applicationsTitle: 'Typical rainwear applications',
    applications: ['Outdoor construction', 'Wet-site maintenance', 'Industrial yards', 'Weather-exposed teams'],
    differentiatorsTitle: 'What buyers compare in rainwear',
    differentiators: ['Waterproofing', 'Outerwear practicality', 'Layering compatibility', 'Outdoor durability'],
    faqTitle: 'Rainwear FAQ',
    faqs: [
      {
        question: 'Why should rainwear have a distinct category page?',
        answer:
          'Because buyers are usually searching by outdoor weather need, which is a different decision path than reflective or hazard-specific apparel.',
      },
      {
        question: 'Is rainwear mainly for construction customers?',
        answer:
          'Construction is a strong use case, but rainwear is also relevant anywhere outdoor industrial teams need reliable waterproof coverage.',
      },
      {
        question: 'What helps rainwear content avoid duplication?',
        answer:
          'Focusing on waterproofing, weather exposure, and outdoor wear logic separates the page from other workwear categories.',
      },
    ],
  },
  'safety-goggles': {
    metaTitle: 'Safety Goggles for Dust and Splash Protection',
    metaDescription:
      'Explore safety goggles for dustproof, anti-fog, and splash-prone work where sealed eye coverage is more important than open-frame eyewear.',
    eyebrow: 'Sealed eye coverage',
    leadTitle: 'How buyers compare safety goggles for enclosed eye coverage',
    intro: [
      'Safety goggles typically attract buyers who need more enclosed eye coverage than standard safety glasses can provide, especially in dusty, splash-prone, or higher-exposure work environments.',
      'The strongest comparison points are enclosed coverage, anti-fog behavior, and how the goggles sit with nearby PPE.',
    ],
    guideTitle: 'How to choose safety goggles',
    guideSteps: [
      'Start with whether the task needs a sealed or more enclosed eye-protection format.',
      'Check anti-fog behavior for active work environments.',
      'Review fit and comfort if the goggles will be worn with helmets or respirators.',
      'Keep goggles separated from safety glasses so buyers can narrow down the right format quickly.',
    ],
    applicationsTitle: 'Typical safety goggle applications',
    applications: ['Dusty worksites', 'Splash-prone tasks', 'Construction work', 'Industrial repair'],
    differentiatorsTitle: 'What buyers compare in safety goggles',
    differentiators: ['Coverage seal', 'Anti-fog behavior', 'Compatibility with PPE', 'All-day comfort'],
    faqTitle: 'Safety goggles FAQ',
    faqs: [
      {
        question: 'Why do safety goggles need a page separate from safety glasses?',
        answer:
          'Because buyers usually search for goggles when they need more enclosed coverage, which is different from open-frame eyewear.',
      },
      {
        question: 'What should safety goggle content talk about?',
        answer:
          'It should emphasize sealed coverage, anti-fog performance, and suitability for dust or splash-heavy environments.',
      },
      {
        question: 'How does this help with duplicate-content risk?',
        answer:
          'The page uses goggle-specific language and use cases instead of recycling broad eye protection copy across every child category.',
      },
    ],
  },
  'safety-glasses': {
    metaTitle: 'Safety Glasses for Everyday Industrial Eye Protection',
    metaDescription:
      'Browse safety glasses for everyday industrial eye protection, impact resistance, and lighter-weight eyewear across construction and workshop tasks.',
    eyebrow: 'Open-frame eye protection',
    leadTitle: 'How buyers compare safety glasses for everyday eye protection',
    intro: [
      'Safety glasses usually appeal to buyers who want lighter, everyday eyewear rather than a fully enclosed goggle format.',
      'They are common across workshops, inspections, and general site work where comfort and visibility matter alongside protection.',
    ],
    guideTitle: 'How to choose safety glasses',
    guideSteps: [
      'Decide whether open-frame eyewear is sufficient for the hazard environment.',
      'Compare comfort, visibility, and anti-fog or anti-scratch features.',
      'Check how the glasses fit into the rest of the PPE kit.',
      'Keep safety glasses separate so open-frame eyewear does not get lost inside broader eye protection content.',
    ],
    applicationsTitle: 'Typical safety glasses applications',
    applications: ['General site work', 'Workshops', 'Inspection tasks', 'Light industrial jobs'],
    differentiatorsTitle: 'What buyers compare in safety glasses',
    differentiators: ['Lightweight wear', 'Visibility', 'Everyday practicality', 'PPE compatibility'],
    faqTitle: 'Safety glasses FAQ',
    faqs: [
      {
        question: 'Why should safety glasses be separate from goggles in site architecture?',
        answer:
          'Because buyers searching for glasses usually want lighter everyday eyewear, while goggle buyers often need more enclosed coverage.',
      },
      {
        question: 'What should buyers compare on a safety glasses page?',
        answer:
          'Everyday industrial wear, open-frame protection, lighter eyewear comfort, and fit with nearby PPE are usually the most helpful things to compare.',
      },
      {
        question: 'Can safety glasses pages still mention adjacent PPE?',
        answer:
          'Yes. Fit with helmets, respirators, and other PPE still matters, but the page should stay focused on safety-glasses use.',
      },
    ],
  },
  'half-face-respirators': {
    metaTitle: 'Half Face Respirators for Dust and Chemical Work',
    metaDescription:
      'Shop half face respirators for dust, spray, fumes, and chemical tasks where reusable industrial respiratory protection is required.',
    eyebrow: 'Reusable respirator format',
    leadTitle: 'Half face respirators suit reusable daily protection',
    intro: [
      'Half face respirators are often chosen when buyers already know they want a reusable respirator format rather than a broader respiratory protection overview.',
      'Most buyers compare them by facepiece comfort, filter setup, and how well the respirator fits into a regular daily PPE routine.',
    ],
    guideTitle: 'How to choose half face respirators',
    guideSteps: [
      'Start with the airborne hazard and the need for a reusable respirator format.',
      'Check seal comfort and practical fit for real-world wear time.',
      'Compare filter or cartridge workflows before standardizing the product.',
      'Keep half face respirators distinct from the parent category so reusable respirator options stay easy to compare.',
    ],
    applicationsTitle: 'Typical half face respirator applications',
    applications: ['Dust control', 'Chemical handling', 'Paint and spray work', 'Industrial maintenance'],
    differentiatorsTitle: 'What buyers compare in half face respirators',
    differentiators: ['Reusable design', 'Seal comfort', 'Filter workflow', 'PPE compatibility'],
    faqTitle: 'Half face respirators FAQ',
    faqs: [
      {
        question: 'Why should half face respirators have their own child page?',
        answer:
          'Because buyers often search directly for reusable half face respirators, which is more specific than the broader respiratory protection category.',
      },
      {
        question: 'What should buyers compare on a half face respirator page?',
        answer:
          'Reusable respirator workflow, fit, filter setup, and real airborne-exposure use cases are usually the most useful things to compare.',
      },
      {
        question: 'How do half face respirators fit into the broader respiratory range?',
        answer:
          'They cover reusable daily respirator needs, while the broader respiratory category remains the place to compare adjacent product families.',
      },
    ],
  },
}

const signalMatchers = [
  { label: 'cut-resistant handling', patterns: ['cut resistant', 'anti-cut', 'hppe', 'a5'] },
  { label: 'nitrile palm grip', patterns: ['nitrile'] },
  { label: 'latex grip coating', patterns: ['latex'] },
  { label: 'welding-ready construction', patterns: ['welding', 'welder'] },
  { label: 'leather glove build', patterns: ['cowhide', 'leather'] },
  { label: 'safety helmet coverage', patterns: ['helmet', 'hard hat'] },
  { label: 'bump-cap format', patterns: ['bump cap'] },
  { label: 'face shield coverage', patterns: ['face shield'] },
  { label: 'hearing protection', patterns: ['ear muff', 'earmuff', 'hearing protection', 'noise'] },
  { label: 'steel toe protection', patterns: ['steel toe'] },
  { label: 'waterproof footwear', patterns: ['waterproof', 'rain boot', 'wellington', 'pvc'] },
  { label: 'reflective workwear', patterns: ['reflective', 'hi-vis', 'high visibility'] },
  { label: 'coverall construction', patterns: ['coverall'] },
  { label: 'flame-resistant apparel', patterns: ['flame', 'fr ', 'anti-static', 'nfpa'] },
  { label: 'disposable garment use', patterns: ['disposable', 'nonwoven'] },
  { label: 'anti-fog eyewear', patterns: ['anti-fog'] },
  { label: 'safety goggles', patterns: ['goggle'] },
  { label: 'safety glasses', patterns: ['glasses'] },
  { label: 'reusable respirator setup', patterns: ['respirator', 'half face', 'filter'] },
]

function buildGenericMetaTitle(category: CategoryLike, parent?: CategoryLike | null) {
  if (parent) {
    return `${category.name} for ${parent.name}`
  }

  return `${category.name} Products`
}

function buildGenericMetaDescription(category: CategoryLike, parent?: CategoryLike | null) {
  if (parent) {
    return `Browse ${category.name} in our ${parent.name} range with category-specific buying guidance, internal links, and product themes drawn from the live catalog.`
  }

  return `Browse ${category.name} with stronger buying guidance, category-specific FAQ content, and live product signals from our industrial PPE catalog.`
}

function buildGenericContent(
  category: CategoryLike,
  parent?: CategoryLike | null,
): CategorySeoContent {
  const parentName = parent?.name ?? 'industrial PPE'

  return {
    metaTitle: buildGenericMetaTitle(category, parent),
    metaDescription: buildGenericMetaDescription(category, parent),
    eyebrow: parent ? `${parent.name} range` : 'Industrial PPE category',
    leadTitle: `How ${category.name} fits inside the catalog`,
    intro: [
      `${category.name} is part of our ${parentName} range and is grouped here to make product comparison easier than a broad parent category alone can provide.`,
      'The category includes buying guidance, FAQ content, internal links, and product-driven signals from the current catalog so buyers can narrow down options faster.',
    ],
    guideTitle: `How to evaluate ${category.name}`,
    guideSteps: [
      `Start with the task, work environment, and protection requirement driving demand for ${category.name.toLowerCase()}.`,
      'Compare comfort, durability, and PPE compatibility rather than choosing on product image alone.',
      'Use related category paths and visible subcategory links to narrow the shortlist faster.',
      'Keep replenishment and cross-team standardization in mind when comparing product families.',
    ],
    applicationsTitle: `Where ${category.name} is commonly used`,
    applications: [
      'Construction and contracting',
      'Industrial maintenance',
      'Manufacturing operations',
      'Warehouse and logistics',
      'General workplace safety programs',
    ],
    differentiatorsTitle: `What buyers compare in ${category.name}`,
    differentiators: [
      'Protection level for the target hazard',
      'Comfort and shift-length wearability',
      'Compatibility with surrounding PPE',
      'Consistency for repeat purchasing',
    ],
    faqTitle: `${category.name} FAQ`,
    faqs: [
      {
        question: `How should buyers compare products in ${category.name}?`,
        answer:
          'Start with the real task and hazard, then compare fit, protection level, comfort, and catalog consistency across repeat purchasing cycles.',
      },
      {
        question: `Why include buying guidance on a ${category.name} category page?`,
        answer:
          'Because buyers often need help understanding what belongs in the range before they move from browsing into a final product shortlist.',
      },
      {
        question: `Should ${category.name} pages link to related PPE categories?`,
        answer:
          'Yes. Related links help buyers continue their journey and reinforce how the page fits into the broader site architecture.',
      },
    ],
  }
}

export function extractCatalogSignals(productNames: string[]): string[] {
  const normalized = productNames.map((name) => name.toLowerCase())

  return signalMatchers
    .filter((matcher) =>
      normalized.some((name) =>
        matcher.patterns.some((pattern) => name.includes(pattern)),
      ),
    )
    .map((matcher) => matcher.label)
    .slice(0, 6)
}

export function getCategorySeoContent(
  category: CategoryLike,
  parent?: CategoryLike | null,
): CategorySeoContent {
  if (subcategoryContent[category.slug]) {
    return subcategoryContent[category.slug]
  }

  if (topLevelCategoryContent[category.slug]) {
    return topLevelCategoryContent[category.slug]
  }

  return buildGenericContent(category, parent)
}

export type { CategoryFaq, CategorySeoContent }
