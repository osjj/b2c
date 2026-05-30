export const ASSET_BASE = "/newpage/xuanchuan"

const factoryTourAssetUrls = {
  canku03: "https://shop.laifappe.com/homepage/canku03-0c1e6a89a0.webp",
  chhuangfan2: "https://shop.laifappe.com/homepage/chhuangfan2-3cbf471e74.webp",
  chuangfang: "https://shop.laifappe.com/homepage/chuangfang-8d0a76be41.webp",
  chuangfang3: "https://shop.laifappe.com/homepage/chuangfang3-5f1535734d.webp",
  officeTeam02: "https://shop.laifappe.com/homepage/office-team02-7d7151ec94.webp",
} as const

export type CategoryCard = {
  href: string
  image: string
  skuCount: string
  index: string
  name: string
  description: string
}

export const categories: CategoryCard[] = [
  {
    href: "/categories/hand-protection",
    image: "https://shop.laifappe.com/homepage/hand-protection-a1a00d94a6.webp",
    skuCount: "14 SKUs",
    index: "Category 01",
    name: "Hand protection",
    description:
      "Cut, impact, chemical, and heat-resistant gloves engineered for industrial handling and welding.",
  },
  {
    href: "/categories/foot-protection",
    image: "https://shop.laifappe.com/homepage/foot-protection-1a14384a6c.webp",
    skuCount: "11 SKUs",
    index: "Category 02",
    name: "Foot protection",
    description:
      "Steel-toe boots, anti-slip safety shoes, and waterproof footwear for construction and wet-site work.",
  },
  {
    href: "/categories/head-protection",
    image: "https://shop.laifappe.com/homepage/head-protection-4c67729361.webp",
    skuCount: "12 SKUs",
    index: "Category 03",
    name: "Head protection",
    description:
      "CE EN397-certified safety helmets with adjustable suspension and switchable ventilation.",
  },
  {
    href: "/categories/body-protection",
    image: "https://shop.laifappe.com/homepage/body-protection-c0b5f82358.webp",
    skuCount: "6 SKUs",
    index: "Category 04",
    name: "Body protection",
    description:
      "Workwear, coveralls, hi-vis apparel, and chemical-resistant rainwear for every industrial setting.",
  },
  {
    href: "/categories/eye-protection",
    image: "https://shop.laifappe.com/homepage/eye-protection-4a69b1993a.webp",
    skuCount: "3 SKUs",
    index: "Category 05",
    name: "Eye protection",
    description: "Anti-fog safety glasses and impact-rated goggles for dust, splash, and projectile protection.",
  },
  {
    href: "/categories/respiratory-protection",
    image: "https://shop.laifappe.com/homepage/respiratory-aa3d1e42ee.webp",
    skuCount: "2 SKUs",
    index: "Category 06",
    name: "Respiratory",
    description: "N95, FFP2, and reusable half-mask respirators with replaceable filter cartridges.",
  },
  {
    href: "/categories/fall-protection",
    image: "https://shop.laifappe.com/homepage/fall-protection-20877fb5c3.webp",
    skuCount: "2 SKUs",
    index: "Category 07",
    name: "Fall protection",
    description: "Full-body harnesses and lanyard systems for elevated work, roof access, and scaffolding.",
  },
]

export type ProductCard = {
  tag: string
  image: string
  alt: string
  standard: string
  name: string
  price: string
}

export const featuredProducts: ProductCard[] = [
  {
    tag: "N518",
    image: "https://shop.laifappe.com/products/1768788267415-92ot6n.webp",
    alt: "Nitrile-coated safety work gloves",
    standard: "EN388 4121X",
    name: "Blue nitrile-coated safety work gloves",
    price: "From $2.00",
  },
  {
    tag: "WG-08",
    image: "https://shop.laifappe.com/products/1769917430784-uk0l1k.webp",
    alt: "Cowhide split leather welding gloves",
    standard: "EN388 4X43D",
    name: "Heavy-duty cowhide split leather welding gloves",
    price: "From $1.80",
  },
  {
    tag: "FRP-01",
    image: "https://shop.laifappe.com/products/1768835454170-5gbnjn.webp",
    alt: "Industrial FRP safety helmet",
    standard: "CE EN397",
    name: "Industrial FRP safety helmet, white",
    price: "From $24.99",
  },
  {
    tag: "EP-01",
    image: "https://shop.laifappe.com/products/1775991463161-0-mb86vn.webp",
    alt: "Anti-fog safety glasses",
    standard: "EN166",
    name: "Anti-fog dustproof safety glasses",
    price: "Ask Quote",
  },
  {
    tag: "SF-22",
    image: "https://shop.laifappe.com/products/1769958520632-qoa0ws.webp",
    alt: "Steel-toe breathable safety shoes",
    standard: "CE EN ISO 20345",
    name: "Steel-toe low-cut breathable safety shoes",
    price: "From $15.00",
  },
]

export type CatalogProofProduct = {
  image: string
  certification: string
  name: string
}

export const catalogProofProducts: CatalogProofProduct[] = [
  {
    image: "https://shop.laifappe.com/products/1768788267415-92ot6n.webp",
    certification: "EN 388",
    name: "Nitrile coated work gloves",
  },
  {
    image: "https://shop.laifappe.com/products/1775980746266-0-5jol54.webp",
    certification: "CE EN397",
    name: "Vented ABS safety helmet",
  },
  {
    image: "https://shop.laifappe.com/products/1769958520632-qoa0ws.webp",
    certification: "EN ISO 20345",
    name: "Steel-toe safety shoes",
  },
  {
    image: "https://shop.laifappe.com/products/1775991463161-0-mb86vn.webp",
    certification: "EN 166",
    name: "Anti-fog safety glasses",
  },
  {
    image: "https://shop.laifappe.com/products/1769917430784-uk0l1k.webp",
    certification: "EN 407",
    name: "Leather welding gloves",
  },
  {
    image: "https://shop.laifappe.com/products/1768835454170-5gbnjn.webp",
    certification: "ANSI / ISEA",
    name: "Industrial FRP helmet",
  },
]

export const industries = [
  {
    href: "/solutions/construction-site-ppe-solution",
    name: "Construction",
    image: "/company/f1.webp",
    tags: ["HARD HATS", "SAFETY BOOTS", "HI-VIS"],
  },
  {
    href: "/solutions/ppe-for-oil-and-gas-field-operations",
    name: "Oil & Gas",
    image: "/company/f2.webp",
  },
  {
    href: "/solutions/ppe-required-in-manufacturing-plants",
    name: "Manufacturing",
    image: "/company/f3.webp",
  },
  {
    href: "/solutions/ppe-for-warehouse-and-logistics-workers",
    name: "Logistics",
    image: "https://shop.laifappe.com/products/1768642403918-6mu9pc.webp",
  },
  {
    href: "/solutions/ppe-for-electrical-maintenance-and-installation",
    name: "Electrical",
    image: "/company/hero-manufacturing.webp",
  },
]

export const facilityImages = [
  {
    image: "https://shop.laifappe.com/homepage/hero01-e2ec99111d.webp",
    alt: "Laifappe production line",
    tag: "PRODUCTION LINE",
    caption: "Seven active lines - Foshan, 2025",
    tall: true,
  },
  {
    image: "https://shop.laifappe.com/homepage/hero02-2a99dcb0f1.webp",
    alt: "Quality control station",
    tag: "QC LAB",
    caption: "Batch testing before shipment",
  },
  {
    image: "https://shop.laifappe.com/homepage/hero03-f50b7e747b.webp",
    alt: "Manufacturing equipment",
    tag: "EQUIPMENT",
    caption: "Precision manufacturing",
  },
  {
    image: "https://shop.laifappe.com/homepage/canku02-5cbd18a7cb.webp",
    alt: "Warehouse inventory",
    tag: "WAREHOUSE",
    caption: "Ready-to-ship inventory",
  },
]

export const factoryTourImages = [
  {
    src: factoryTourAssetUrls.chuangfang,
    alt: "Laifappe factory building exterior",
    title: "Factory building",
  },
  {
    src: factoryTourAssetUrls.chhuangfan2,
    alt: "Laifappe factory entrance with company signage",
    title: "Factory entrance",
  },
  {
    src: factoryTourAssetUrls.chuangfang3,
    alt: "Laifappe factory exterior and loading area",
    title: "Factory exterior",
  },
  {
    src: factoryTourAssetUrls.officeTeam02,
    alt: "Laifappe office team workspace",
    title: "Office team",
  },
  {
    src: factoryTourAssetUrls.canku03,
    alt: "Laifappe warehouse storage area",
    title: "Warehouse",
  },
]

export const testimonials = [
  {
    quote:
      "We've been sourcing PPE from Laifappe for 5 years. Their quality consistency and on-time delivery have been exceptional. The custom branding service is a great bonus.",
    name: "Michael Chen",
    role: "Procurement Director",
    logo: "BUILDCORP",
  },
  {
    quote:
      "We've worked with Laifappe for many years. They understand our requirements very well. Their OEM service is outstanding, fast and precise.",
    name: "Sarah Williams",
    role: "CEO",
    logo: "SAFETYFIRST",
  },
  {
    quote:
      "The flame-resistant workwear meets all our strict safety requirements. Their technical support team helped us choose the right products for offshore operations.",
    name: "Ahmed Hassan",
    role: "HSE Manager",
    logo: "PETROGLOBAL",
  },
]
