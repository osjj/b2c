import { COMPANY_NAME } from '@/lib/company'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-static'

export function GET() {
  const siteUrl = getSiteUrl()
  const content = `# LAIFAPPE

> LAIFAPPE is the PPE website of ${COMPANY_NAME}, based in Foshan, Guangdong, China. The company supplies personal protective equipment for business buyers, including distributors, contractors and industrial procurement teams.

Laifappe and YUELAIFA PPE are brand names used on this website. The legal company name is ${COMPANY_NAME}.

The site covers PPE products, OEM/ODM sourcing, industry buying guides and procurement tools. Construction and mining/quarrying are key content areas. Sales contact: sales@laifappe.com.

Certifications, test reports and protection levels apply to the specific product model and supporting documents; a guide discussing a standard does not certify every product. Selection depends on the task, workplace risk assessment and applicable requirements. Prices, minimum order quantities, availability, customization and lead times require confirmation in a current quotation.

## Company and sourcing

- [About LAIFAPPE](${siteUrl}/about): Company identity, factory information, OEM/ODM process and buyer document review.
- [Product catalog](${siteUrl}/products): Public PPE product listings and individual product specifications.

## Product categories

- [Head protection](${siteUrl}/categories/head-protection): Safety helmets and related head protection products.
- [Hand protection](${siteUrl}/categories/hand-protection): Work gloves for different materials, tasks and handling conditions.
- [Foot protection](${siteUrl}/categories/foot-protection): Safety shoes, boots and protective footwear.
- [Body protection](${siteUrl}/categories/body-protection): Workwear, coveralls, high-visibility clothing and rainwear.
- [Eye protection](${siteUrl}/categories/eye-protection): Safety glasses and goggles.
- [Respiratory protection](${siteUrl}/categories/respiratory-protection): Respiratory protective equipment listings.
- [Fall protection](${siteUrl}/categories/fall-protection): Harnesses and related fall protection equipment.

## Industry buying guides

- [Construction PPE hub](${siteUrl}/solutions/construction-site-ppe-solution): Construction tasks, PPE categories, standards context and bulk sourcing.
- [Mining and quarrying PPE hub](${siteUrl}/solutions/ppe-safety-equipment-for-mining-quarrying): Task-based selection for mine and quarry work.
- [Industry solutions](${siteUrl}/solutions): Additional guides for welding, logistics, scaffolding and other work environments.

## Selected selection and procurement guides

- [Construction safety footwear](${siteUrl}/blog/construction-safety-footwear-guide): Footwear specifications, fit and purchasing considerations.
- [Construction gloves](${siteUrl}/blog/construction-gloves-selection-guide): Glove selection by task and handling conditions.
- [Construction respiratory protection](${siteUrl}/blog/construction-respiratory-protection): Respiratory hazards and selection considerations.
- [Bulk construction PPE procurement](${siteUrl}/blog/bulk-construction-ppe-procurement): Specifications, samples and bulk ordering workflow.
- [Mining safety helmets](${siteUrl}/blog/mining-safety-helmet-buyer-guide): Fit, cap-lamp mounts and compatibility with other PPE.
- [Mining and quarry safety boots](${siteUrl}/blog/mining-quarry-safety-boots-guide): Footwear considerations for mine and quarry tasks.

## Procurement tools and templates

- [Construction PPE RFQ template](${siteUrl}/downloads/construction-ppe-rfq-template): Prepare itemized requirements for a bulk quotation.
- [Safety boot size guide](${siteUrl}/tools/size-guide): Sizing reference to use with the selected model's size chart and sample fitting.
- [Hard hat class decoder](${siteUrl}/tools/hard-hat-class-decoder): Reference for Type I/II and Class G/E/C terminology.
- [PPE quantity calculator](${siteUrl}/tools/ppe-calculator): Estimate procurement quantities from workforce and usage assumptions.

## Optional

- [All buying guides](${siteUrl}/blog): Further PPE selection and procurement articles.
- [Sitemap](${siteUrl}/sitemap.xml): Broader public URL discovery.
`

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
