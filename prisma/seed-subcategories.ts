import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type ParentCategorySlug =
  | 'hand-protection'
  | 'head-protection'
  | 'foot-protection'
  | 'body-protection'
  | 'fall-protection'
  | 'eye-protection'
  | 'respiratory-protection'

type CategorySlug =
  | 'welding-gloves'
  | 'cut-resistant-gloves'
  | 'nitrile-coated-gloves'
  | 'latex-coated-gloves'
  | 'leather-work-gloves'
  | 'knit-gloves'
  | 'safety-helmets'
  | 'bump-caps'
  | 'face-shields'
  | 'protective-hoods'
  | 'hearing-protection'
  | 'safety-shoes'
  | 'safety-boots'
  | 'safety-rain-boots'
  | 'flame-resistant-coveralls'
  | 'disposable-coveralls'
  | 'work-coveralls'
  | 'safety-harness'
  | 'safety-vests'
  | 'hi-vis-workwear'
  | 'rainwear'
  | 'safety-goggles'
  | 'safety-glasses'
  | 'half-face-respirators'

interface ParentCategorySeed {
  name: string
  slug: ParentCategorySlug
  sortOrder: number
  description: string
}

interface SubcategorySeed {
  name: string
  slug: CategorySlug
  parentSlug: ParentCategorySlug
  sortOrder: number
  description: string
}

interface ProductCategoryAssignment {
  productSlug: string
  categorySlug: CategorySlug
}

const parentCategories: ParentCategorySeed[] = [
  {
    name: 'Hand Protection',
    slug: 'hand-protection',
    sortOrder: 0,
    description: 'Protective gloves for industrial handling, welding, and cut-risk tasks',
  },
  {
    name: 'Foot Protection',
    slug: 'foot-protection',
    sortOrder: 0,
    description: 'Safety footwear for construction, industrial work, and wet-site conditions',
  },
  {
    name: 'Body Protection',
    slug: 'body-protection',
    sortOrder: 0,
    description: 'Protective workwear, coveralls, rainwear, and visibility apparel',
  },
  {
    name: 'Fall Protection',
    slug: 'fall-protection',
    sortOrder: 0,
    description: 'Fall protection equipment for elevated work, roof access, and scaffold tasks',
  },
  {
    name: 'Eye Protection',
    slug: 'eye-protection',
    sortOrder: 0,
    description: 'Safety glasses and goggles for dust, impact, and splash protection',
  },
  {
    name: 'Respiratory Protection',
    slug: 'respiratory-protection',
    sortOrder: 0,
    description: 'Respirators and airborne hazard control for dust, fumes, and chemical exposure',
  },
  {
    name: 'Head Protection',
    slug: 'head-protection',
    sortOrder: 1,
    description: 'Head protection for impact, face coverage, and noisy industrial environments',
  },
]

const subcategories: SubcategorySeed[] = [
  {
    name: 'Welding Gloves',
    slug: 'welding-gloves',
    parentSlug: 'hand-protection',
    sortOrder: 1,
    description: 'Leather welding gloves with heat and spark protection',
  },
  {
    name: 'Cut Resistant Gloves',
    slug: 'cut-resistant-gloves',
    parentSlug: 'hand-protection',
    sortOrder: 2,
    description: 'Cut resistant gloves for handling sharp tools and materials',
  },
  {
    name: 'Nitrile Coated Gloves',
    slug: 'nitrile-coated-gloves',
    parentSlug: 'hand-protection',
    sortOrder: 3,
    description: 'Nitrile coated work gloves with strong grip and abrasion resistance',
  },
  {
    name: 'Latex Coated Gloves',
    slug: 'latex-coated-gloves',
    parentSlug: 'hand-protection',
    sortOrder: 4,
    description: 'Latex coated safety gloves for grip, handling, and general protection',
  },
  {
    name: 'Leather Work Gloves',
    slug: 'leather-work-gloves',
    parentSlug: 'hand-protection',
    sortOrder: 5,
    description: 'Cowhide and split leather gloves for heavy duty general work',
  },
  {
    name: 'Knit Gloves',
    slug: 'knit-gloves',
    parentSlug: 'hand-protection',
    sortOrder: 6,
    description: 'General purpose knit gloves for light industrial and site work',
  },
  {
    name: 'Safety Helmets',
    slug: 'safety-helmets',
    parentSlug: 'head-protection',
    sortOrder: 1,
    description: 'Hard hats and industrial safety helmets for impact protection',
  },
  {
    name: 'Bump Caps',
    slug: 'bump-caps',
    parentSlug: 'head-protection',
    sortOrder: 2,
    description: 'Lightweight bump caps for low-clearance head protection',
  },
  {
    name: 'Face Shields',
    slug: 'face-shields',
    parentSlug: 'head-protection',
    sortOrder: 3,
    description: 'Full face shields for splash and impact protection',
  },
  {
    name: 'Protective Hoods',
    slug: 'protective-hoods',
    parentSlug: 'head-protection',
    sortOrder: 4,
    description: 'Chemical and industrial protective hoods',
  },
  {
    name: 'Hearing Protection',
    slug: 'hearing-protection',
    parentSlug: 'head-protection',
    sortOrder: 5,
    description: 'Earmuffs and hearing protection for high-noise environments',
  },
  {
    name: 'Safety Shoes',
    slug: 'safety-shoes',
    parentSlug: 'foot-protection',
    sortOrder: 1,
    description: 'Low-cut safety shoes with toe and puncture protection',
  },
  {
    name: 'Safety Boots',
    slug: 'safety-boots',
    parentSlug: 'foot-protection',
    sortOrder: 2,
    description: 'Ankle and mid-calf safety boots for industrial job sites',
  },
  {
    name: 'Safety Rain Boots',
    slug: 'safety-rain-boots',
    parentSlug: 'foot-protection',
    sortOrder: 3,
    description: 'Waterproof PVC safety rain boots and Wellington boots',
  },
  {
    name: 'Flame Resistant Coveralls',
    slug: 'flame-resistant-coveralls',
    parentSlug: 'body-protection',
    sortOrder: 1,
    description: 'FR and anti-static coveralls for welding, mining, and industrial work',
  },
  {
    name: 'Disposable Coveralls',
    slug: 'disposable-coveralls',
    parentSlug: 'body-protection',
    sortOrder: 2,
    description: 'Disposable coveralls for hygiene, food processing, and contamination control',
  },
  {
    name: 'Work Coveralls',
    slug: 'work-coveralls',
    parentSlug: 'body-protection',
    sortOrder: 3,
    description: 'General work coveralls for daily industrial protection',
  },
  {
    name: 'Safety Harness',
    slug: 'safety-harness',
    parentSlug: 'fall-protection',
    sortOrder: 1,
    description: 'Body-worn fall protection harnesses for roofing, scaffolding, and elevated work',
  },
  {
    name: 'Safety Vests',
    slug: 'safety-vests',
    parentSlug: 'body-protection',
    sortOrder: 4,
    description: 'Reflective safety vests for visibility on site',
  },
  {
    name: 'Hi-Vis Workwear',
    slug: 'hi-vis-workwear',
    parentSlug: 'body-protection',
    sortOrder: 5,
    description: 'Reflective jackets, pants, and hi-vis workwear sets',
  },
  {
    name: 'Rainwear',
    slug: 'rainwear',
    parentSlug: 'body-protection',
    sortOrder: 6,
    description: 'Waterproof rainwear with chemical and weather protection',
  },
  {
    name: 'Safety Goggles',
    slug: 'safety-goggles',
    parentSlug: 'eye-protection',
    sortOrder: 1,
    description: 'Protective goggles for anti-fog, dustproof, and splash resistance',
  },
  {
    name: 'Safety Glasses',
    slug: 'safety-glasses',
    parentSlug: 'eye-protection',
    sortOrder: 2,
    description: 'Protective safety glasses for impact and dust resistance',
  },
  {
    name: 'Half Face Respirators',
    slug: 'half-face-respirators',
    parentSlug: 'respiratory-protection',
    sortOrder: 1,
    description: 'Reusable half face respirators for dust, gas, and chemical exposure',
  },
]

const productAssignments: ProductCategoryAssignment[] = [
  {
    productSlug:
      'heavy-duty-cowhide-split-leather-welding-gloves-long-gauntlet-cuff',
    categorySlug: 'welding-gloves',
  },
  {
    productSlug: 'blue-nitrile-coated-safety-work-gloves-n518',
    categorySlug: 'nitrile-coated-gloves',
  },
  {
    productSlug: 'chuang-xin-n518-blue-nitrile-coated-safety-work-gloves',
    categorySlug: 'nitrile-coated-gloves',
  },
  {
    productSlug:
      'cow-split-leather-welding-safety-work-gloves-heavy-duty-hand-protection',
    categorySlug: 'welding-gloves',
  },
  {
    productSlug: 'heavy-duty-cowhide-leather-back-cotton-blend-work-gloves',
    categorySlug: 'leather-work-gloves',
  },
  {
    productSlug:
      'heavy-duty-industrial-gloves-anti-impact-a5-cut-resistant-nitrile-sandy-coated-a-mnv6zq8z',
    categorySlug: 'cut-resistant-gloves',
  },
  {
    productSlug: 'anti-cut-protection-safety-gloves-nitrile',
    categorySlug: 'cut-resistant-gloves',
  },
  {
    productSlug:
      '14-inch-yellow-cow-split-leather-welding-gloves-custom-logo-one-piece-cowhide-le',
    categorySlug: 'welding-gloves',
  },
  {
    productSlug:
      'ce-en388-blue-polyester-liner-black-latex-coated-gloves-custom-logo-oil-chemical',
    categorySlug: 'latex-coated-gloves',
  },
  {
    productSlug:
      'ce-en-388-oil-chemical-resistant-crinkle-finish-anti-slip-custom-logo-10-gauge-n',
    categorySlug: 'latex-coated-gloves',
  },
  {
    productSlug:
      'ce-en388-custom-logo-crinkle-finish-13-gauge-polyester-cotton-liner-anti-slip-la',
    categorySlug: 'latex-coated-gloves',
  },
  {
    productSlug:
      'custom-logo-ab-grade-anti-slip-hand-protection-10-5-inch-cow-split-leather-combi',
    categorySlug: 'leather-work-gloves',
  },
  {
    productSlug:
      '10-5-inch-custom-logo-anti-slip-cow-split-leather-construction-work-combination-',
    categorySlug: 'leather-work-gloves',
  },
  {
    productSlug:
      'stock-70g-thickened-hand-protective-safety-general-gloves-construction-sites-str',
    categorySlug: 'knit-gloves',
  },
  {
    productSlug:
      'ce-certification-industrial-cut-resistant-wear-resistant-dust-resistant-nitrile-',
    categorySlug: 'cut-resistant-gloves',
  },
  {
    productSlug:
      'ce-certification-industrial-cut-resistant-wear-resistant-dust-resistant-nitrile--mnrmxdf4',
    categorySlug: 'cut-resistant-gloves',
  },
  {
    productSlug:
      'ce-certification-industrial-cut-resistant-wear-resistant-dust-resistant-nitrile--mnro519x',
    categorySlug: 'cut-resistant-gloves',
  },

  {
    productSlug: 'proguard-industrial-safety-helmet-white',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug: 'eliteguard-premium-safety-helmet-visor',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug: 'weldmaster-pro-variable-shade-helmet',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug: 'industrialpro-bump-cap-led-light',
    categorySlug: 'bump-caps',
  },
  {
    productSlug: 'chempro-chemical-resistant-hood',
    categorySlug: 'protective-hoods',
  },
  {
    productSlug: 'coolmax-summer-safety-helmet',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug: 'hivis-reflective-safety-helmet',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug: 'industrial-white-fiberglass-frp-safety-helmet',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug:
      'abs-material-thick-and-breathable-construction-work-safety-helmet',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug:
      'abs-material-thick-and-breathable-construction-work-safety-helmet-mmrwcc70',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug:
      'work-safety-helmets-industrial-yellow-construction-safety-helmet',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug:
      'ce-en397-yellow-abs-shell-ventilation-hles-switch-design-anti-impact-hard-hat-sa',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug:
      'ce-en397-yellow-abs-shell-6-points-webbing-suspension-knob-custom-logo-ppe-prote',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug:
      'ce-en397-and-ansi-verified-green-abs-shell-ventilation-holes-electrical-power',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug:
      'red-hdpe-plastic-lining-slider-adjustable-cheap-construction-site-hard-hat-safet',
    categorySlug: 'safety-helmets',
  },
  {
    productSlug:
      'sanjian-safety-clear-shield-for-face-protection-anti-splash-full-face-safety-shi',
    categorySlug: 'face-shields',
  },
  {
    productSlug:
      'noise-reduction-ear-muffs-hearing-protection-cheap-red-pp-noise-proof-constructi',
    categorySlug: 'hearing-protection',
  },

  {
    productSlug: 'breathable-low-cut-safety-shoes-steel-toe',
    categorySlug: 'safety-shoes',
  },
  {
    productSlug:
      'mens-breathable-suede-leather-work-shoes-anti-crash-puncture-resistant',
    categorySlug: 'safety-shoes',
  },
  {
    productSlug:
      '1088-4-s3-good-quality-anti-static-anti-smash-waterproof-safety-shoes-industrial-mnujnjtt',
    categorySlug: 'safety-boots',
  },
  {
    productSlug:
      'construction-site-wear-resistant-building-work-boots-waterproof-anti-slip-warm-m',
    categorySlug: 'safety-boots',
  },
  {
    productSlug:
      'factory-hot-sale-safty-shoes-ladies-steel-toe-safety-shoes-for-women-sport-light',
    categorySlug: 'safety-shoes',
  },
  {
    productSlug:
      'factory-price-pvc-safety-rain-boot-with-steel-toe-for-mining-industry-worker-gum',
    categorySlug: 'safety-rain-boots',
  },
  {
    productSlug:
      'ce-certified-steel-toe-work-boots-for-men-waterproof-outdoor-safety-shoes-for-hu',
    categorySlug: 'safety-rain-boots',
  },

  {
    productSlug: 'pure-cotton-anti-static-nfpa-2112-fr-coveralls',
    categorySlug: 'flame-resistant-coveralls',
  },
  {
    productSlug:
      'factory-wholesale-mechanic-worker-one-piece-work-clothes-for-mining-cotton-adult',
    categorySlug: 'flame-resistant-coveralls',
  },
  {
    productSlug:
      'protective-clothing-ss-disposable-coverall-for-food-processing',
    categorySlug: 'disposable-coveralls',
  },
  {
    productSlug:
      'workwear-work-shirts-safety-jackets-reflective-work-clothes-reflective-safety-ve-mnvcgzgz',
    categorySlug: 'safety-vests',
  },
  {
    productSlug:
      'protective-clothing-ss-disposable-coverall-for-food-processing-mnve6ze4',
    categorySlug: 'disposable-coveralls',
  },
  {
    productSlug:
      'personal-protective-equipment-very-cheap-light-blue-130-grams-polyester-middle-e',
    categorySlug: 'work-coveralls',
  },
  {
    productSlug:
      'two-pieces-custom-logo-250-grams-100-cotton-blue-high-visibility-reflective-jack',
    categorySlug: 'hi-vis-workwear',
  },
  {
    productSlug:
      'yellow-100-water-proof-oil-chemical-resistant-rainwear-custom-logo-one-piece-lon',
    categorySlug: 'rainwear',
  },

  {
    productSlug:
      'en166-certified-anti-fog-scratch-resistant-transparent-safety-goggles-fashion-in',
    categorySlug: 'safety-goggles',
  },
  {
    productSlug:
      'outdoor-cycling-sports-goggles-for-construction-sites-anti-fog-dustproof-high-te',
    categorySlug: 'safety-goggles',
  },
  {
    productSlug:
      'ce-en-166f-anti-scratch-anti-fog-dust-proof-safety-glasses-pc-lens-transparent-l',
    categorySlug: 'safety-glasses',
  },

  {
    productSlug:
      'best-sellers-industrial-full-face-chemical-respirator-filter-respirator-silicone',
    categorySlug: 'half-face-respirators',
  },
  {
    productSlug:
      'half-face-gas-mask-respirator-double-filter-cartridges-anti-haze-anti-toxic-spra',
    categorySlug: 'half-face-respirators',
  },
]

function getMissingSlugs(
  expectedSlugs: string[],
  actualSlugs: string[],
): string[] {
  const actualSet = new Set(actualSlugs)
  return expectedSlugs.filter((slug) => !actualSet.has(slug))
}

async function main() {
  console.log('Seeding PPE subcategories and product assignments...')

  await prisma.$transaction(
    parentCategories.map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description,
          parentId: null,
          sortOrder: category.sortOrder,
          isActive: true,
        },
        create: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          parentId: null,
          sortOrder: category.sortOrder,
          isActive: true,
        },
      }),
    ),
  )

  const parentSlugs = [...new Set(subcategories.map((item) => item.parentSlug))]
  const parentCategoriesFromDb = await prisma.category.findMany({
    where: {
      slug: {
        in: parentSlugs,
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  })

  const parentIdBySlug = new Map(
    parentCategoriesFromDb.map((category) => [category.slug, category.id]),
  )

  await prisma.$transaction(
    subcategories.map((item) =>
      prisma.category.upsert({
        where: { slug: item.slug },
        update: {
          name: item.name,
          description: item.description,
          parentId: parentIdBySlug.get(item.parentSlug),
          sortOrder: item.sortOrder,
          isActive: true,
        },
        create: {
          name: item.name,
          slug: item.slug,
          description: item.description,
          parentId: parentIdBySlug.get(item.parentSlug),
          sortOrder: item.sortOrder,
          isActive: true,
        },
      }),
    ),
  )

  const assignmentCategorySlugs = [
    ...new Set(productAssignments.map((item) => item.categorySlug)),
  ]
  const assignmentCategories = await prisma.category.findMany({
    where: {
      slug: {
        in: assignmentCategorySlugs,
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  })

  const missingAssignmentCategories = getMissingSlugs(
    assignmentCategorySlugs,
    assignmentCategories.map((category) => category.slug),
  )

  if (missingAssignmentCategories.length > 0) {
    throw new Error(
      `Missing assignment categories: ${missingAssignmentCategories.join(', ')}`,
    )
  }

  const categoryIdBySlug = new Map(
    assignmentCategories.map((category) => [category.slug, category.id]),
  )

  const targetProductSlugs = productAssignments.map((item) => item.productSlug)
  const existingProducts = await prisma.product.findMany({
    where: {
      slug: {
        in: targetProductSlugs,
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  })
  const missingDirectSlugs = getMissingSlugs(
    targetProductSlugs,
    existingProducts.map((product) => product.slug),
  )
  const legacyRedirects =
    missingDirectSlugs.length > 0
      ? await prisma.productSlugRedirect.findMany({
          where: {
            slug: {
              in: missingDirectSlugs,
            },
          },
          select: {
            slug: true,
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
        })
      : []
  const resolvedProducts = [
    ...existingProducts,
    ...legacyRedirects.map((redirect) => redirect.product),
  ]

  const missingProducts = getMissingSlugs(
    targetProductSlugs,
    [
      ...existingProducts.map((product) => product.slug),
      ...legacyRedirects.map((redirect) => redirect.slug),
    ],
  )

  if (missingProducts.length > 0) {
    console.warn(
      `Skipping missing products: ${missingProducts.join(', ')}`,
    )
  }

  const existingProductSlugSet = new Set(
    targetProductSlugs.filter((slug) =>
      resolvedProducts.some((product) => product.slug === slug) ||
      legacyRedirects.some((redirect) => redirect.slug === slug),
    ),
  )
  const resolvedProductIdByRequestedSlug = new Map([
    ...existingProducts.map((product) => [product.slug, product.id] as const),
    ...legacyRedirects.map((redirect) => [redirect.slug, redirect.product.id] as const),
  ])
  const assignmentsToApply = productAssignments.filter((item) =>
    existingProductSlugSet.has(item.productSlug),
  )

  await prisma.$transaction(
    assignmentsToApply.map((item) =>
      prisma.product.update({
        where: {
          id: resolvedProductIdByRequestedSlug.get(item.productSlug),
        },
        data: {
          categoryId: categoryIdBySlug.get(item.categorySlug),
        },
      }),
    ),
  )

  console.log(`Upserted ${subcategories.length} subcategories.`)
  console.log(`Updated ${assignmentsToApply.length} products.`)

  if (missingProducts.length > 0) {
    console.log(
      `${missingProducts.length} products were not found and were left untouched.`,
    )
  }

  console.log('Done.')
}

main()
  .catch((error) => {
    console.error('Subcategory seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
