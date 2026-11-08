import Image from "next/image"
import Link from "next/link"
import { ViewportImage } from "@/components/ui/viewport-image"
import { Suspense, type ReactNode } from "react"
import { ArrowDown, CheckCircle2, Clock3, Globe, Mail, MapPin, Monitor, MoveRight, Phone, Shield } from "lucide-react"
import { getHomeFeaturedProducts, getHomeSolutions } from "../lib/home-data"
import { formatUsageSceneLabel, USAGE_SCENES, type UsageScene } from "@/types/solution"
import { ASSET_BASE, catalogProofProducts, categories, facilityImages, testimonials } from "./data"
import { BackToTop } from "./BackToTop"
import { DeferredBackgroundSection } from "./DeferredBackgroundSection"
import { FactoryTourDialog } from "./FactoryTourDialog"
import { HeroBackground } from "./HeroBackground"
import { StorefrontNav } from "./StorefrontNav"
import { QuoteDrawer, QuoteRequestForm } from "./QuoteRequestForm"
import { SectionHeader } from "./SectionHeader"
import styles from "./home-new.module.css"
import editorial from "./home-catalog-editorial.module.css"
import industrial from "./industrial-home.module.css"
import manufacturing from "./home-manufacturing.module.css"
import footer from "./storefront-footer.module.css"
import quality from "./home-quality.module.css"

type FeaturedProductsData = NonNullable<Awaited<ReturnType<typeof getHomeFeaturedProducts>>>
type FeaturedProduct = FeaturedProductsData["products"][number]
type HomeSolutionsData = NonNullable<Awaited<ReturnType<typeof getHomeSolutions>>>
type HomeSolution = HomeSolutionsData["solutions"][number]

const CATEGORY_IMAGE_SIZES = "(max-width: 680px) calc(50vw - 32px), (max-width: 1180px) calc(25vw - 28px), 180px"
const STOREFRONT_TOP_ID = "storefront-top"

async function FeaturedProducts() {
  const data = await getHomeFeaturedProducts()
  return <FeaturedProductsSection data={data} />
}

async function HomeSolutions() {
  const data = await getHomeSolutions()
  return <IndustriesSection data={data} />
}

function HomeSectionPlaceholder({ section }: { section: "products" | "solutions" }) {
  return (
    <div
      className={section === "products" ? styles.productsPlaceholder : styles.solutionsPlaceholder}
      role="status"
      aria-label={section === "products" ? "Loading featured products" : "Loading industry solutions"}
    />
  )
}

function formatProductPrice(product: FeaturedProduct) {
  if (product.lowestTierPrice !== null) {
    return `From $${product.lowestTierPrice.toFixed(2)}`
  }

  return `$${product.price.toFixed(2)}`
}

function getProductTag(product: FeaturedProduct, index: number) {
  if (product.sku) return product.sku

  const slugToken = product.slug.split("-").at(-1)
  return slugToken ? slugToken.toUpperCase().slice(0, 10) : `SKU ${index + 1}`
}

function isUsageScene(scene: string): scene is UsageScene {
  return (USAGE_SCENES as readonly string[]).includes(scene)
}

function getSolutionSceneLabel(solution: HomeSolution) {
  const scene = solution.usageScenes[0]
  return scene && isUsageScene(scene) ? formatUsageSceneLabel(scene) : "General"
}

export function NewHomePage() {
  return (
    <NewHomeShell>
      <NewHomeTopBar />
      <StorefrontNav />
      <main className={industrial.home}>
        <HeroSection />
        <div className={industrial.container}>
          <ul className={industrial.capabilities} aria-label="PPE sourcing capabilities">
            <li>Product sourcing</li>
            <li>OEM &amp; branding</li>
            <li>Quality documentation</li>
            <li>Export coordination</li>
          </ul>
        </div>
        <CategorySection />
        <FactoryProcurementSection />
        <HomeBuyerProof />
        <TrustStrip />
        <WhyUsSection />
        <OemOdmSection />
        <Suspense fallback={<HomeSectionPlaceholder section="products" />}>
          <FeaturedProducts />
        </Suspense>
        <FactoryFullSection />
        <HowToOrderSection />
        <Suspense fallback={<HomeSectionPlaceholder section="solutions" />}>
          <HomeSolutions />
        </Suspense>
        <CertificationsSection />
        <FacilitySection />
        <TestimonialsSection />
        <QuoteBand />
        <QuoteSection />
      </main>
      <NewHomeFooter />
    </NewHomeShell>
  )
}

export function NewHomeShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page} id={STOREFRONT_TOP_ID} tabIndex={-1}>
      <noscript>
        <style>{`.${styles.deferredBackground} { --home-section-image: var(--home-section-background); }`}</style>
      </noscript>
      {children}
      <BackToTop focusTargetId={STOREFRONT_TOP_ID} />
    </div>
  )
}

export function NewHomeTopBar() {
  return (
    <div className={styles.topbar}>
      <div className={styles.wrap}>
        <div className={styles.live}>
          <span className={styles.liveDot} />
          <span>22 years PPE manufacturing - OEM/ODM - Quote in 24 hours - Global shipping</span>
        </div>
        <div className={styles.topLinks}>
          <a href="mailto:sales@laifappe.com">sales@laifappe.com</a>
          <a href="tel:+8618029309938">+86 180 2930 9938</a>
          <span className={styles.language}>EN</span>
        </div>
      </div>
    </div>
  )
}

function HeroSection() {
  const heroImages = [
    "https://shop.laifappe.com/homepage/hero/hero01-63d4a5b25b.webp",
    "https://shop.laifappe.com/homepage/hero/hero02-85c45b29a2.webp",
    "https://shop.laifappe.com/homepage/hero/hero03-348c52a45c.webp",
    "https://shop.laifappe.com/homepage/hero/hero04-e302dc0bc7.webp",
  ]
  const heroAssetBase = "https://shop.laifappe.com/homepage/hero/"
  const firstSlide = {
    src: `${heroAssetBase}hero01-1280w-5421d264eef5.webp`,
    srcSet: [
      `${heroAssetBase}hero01-640w-a976e924a971.webp 640w`,
      `${heroAssetBase}hero01-828w-43cb19a05ca3.webp 828w`,
      `${heroAssetBase}hero01-1280w-5421d264eef5.webp 1280w`,
      `${heroAssetBase}hero01-1672w-9e191427d07d.webp 1672w`,
    ].join(", "),
  }

  return (
    <section className={industrial.hero} aria-labelledby="home-title">
      <div className={industrial.heroPhoto}>
        <HeroBackground images={heroImages} firstSlide={firstSlide} />
      </div>
      <div className={`${industrial.container} ${industrial.heroInner}`}>
        <div className={industrial.heroCopy}>
          <span className={industrial.heroMark} aria-hidden="true">
            <span /><span /><span />
          </span>
          <h1 id="home-title">PPE Built{" "}<br />for Work</h1>
          <p>PPE manufacturer and OEM/ODM supplier for industrial buyers sourcing safety equipment in bulk.</p>
          <div className={industrial.heroActions}>
            <Link className={`${industrial.action} ${industrial.actionSolid}`} href="/products">
              Browse Products <MoveRight aria-hidden="true" size={18} />
            </Link>
            <QuoteDrawer
              source="Hero Get Instant Quote"
              trigger={
                <button className={industrial.action} type="button">
                  Request Quote <MoveRight aria-hidden="true" size={18} />
                </button>
              }
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function HomeBuyerProof() {
  return (
    <section className={`${industrial.container} ${manufacturing.section}`} aria-labelledby="home-buyer-proof">
      <header className={manufacturing.heading}>
        <p className={manufacturing.kicker}>Trusted by 500+ buyers across 50+ countries</p>
        <h2 id="home-buyer-proof">Professional PPE Manufacturing Solutions</h2>
      </header>
      <div className={manufacturing.buyerBody}>
        <div className={manufacturing.proofPanel}>
          <p className={manufacturing.intro}>
            <strong>Leading manufacturer of personal protective equipment for extreme environments.</strong>{" "}
            Safety gloves, footwear, workwear and more with global certifications.
          </p>
          <div className={manufacturing.certifications}>
            <span className={manufacturing.kicker}>Certified</span>
            <ul>
              {["CE EN", "ISO 9001:2015", "ANSI/ISEA", "EN 388", "BSCI"].map((cert) => (
                <li key={cert}>{cert}</li>
              ))}
            </ul>
          </div>
          <ul className={manufacturing.proofProducts} aria-label="Current catalog product examples">
            {catalogProofProducts.map((product) => (
              <li className={manufacturing.proofItem} key={`${product.certification}-${product.name}`}>
                <span className={manufacturing.proofImage}>
                  <Image src={product.image} alt="" fill sizes="54px" />
                </span>
                <span>
                  <small>{product.certification}</small>
                  <strong>{product.name}</strong>
                </span>
              </li>
            ))}
          </ul>
          <Link
            className={industrial.action}
            href="https://shop.laifappe.com/LAIFA_PPE_catalog.pdf"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span aria-hidden="true">&darr;</span>
            Download Catalog
          </Link>
        </div>
        <QuoteRequestForm className={`${industrial.buyerForm} ${manufacturing.form}`} compact source="Hero FAST RFQ" />
      </div>
      <dl className={manufacturing.metrics}>
        {[
          { value: "20+", unit: "yr", label: "Years Experience" },
          { value: "50+", label: "Export Countries" },
          { value: "1M+", label: "Units / Year" },
          { value: "100+", label: "Skilled Workers" },
          { value: "24", unit: "h", label: "Quote Response" },
        ].map(({ value, unit, label }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}{unit ? <span>{unit}</span> : null}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function TrustStrip() {
  const items = [
    { icon: Shield, label: "CE Certified · EN Standards" },
    { icon: CheckCircle2, label: "ISO 9001 · Quality Management" },
    { icon: Monitor, label: "OEM/ODM · Custom Solutions" },
    { icon: Clock3, label: "Quote in 24 Hours" },
    { icon: MoveRight, label: "Global Shipping · On-Time" },
  ]

  return (
    <section className={`${industrial.container} ${manufacturing.trustSection}`} aria-label="Laifappe trust highlights">
      <ul className={manufacturing.trustList}>
        {items.map(({ icon: Icon, label }) => (
          <li key={label}>
            <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CategorySection() {
  return (
    <DeferredBackgroundSection className={`${styles.categoriesSection} ${industrial.categories}`}>
      <div className={industrial.container}>
        <div className={industrial.categoriesHeading}>
          <h2>Shop by Protection</h2>
          <p>
            <strong>Full-range protection, built in-house.</strong> From precision-engineered cut-resistant gloves to
            ANSI-certified safety footwear, produced under one roof and governed by one quality standard.
          </p>
        </div>
        <div className={industrial.categoryGrid}>
          {categories.map((category) => (
            <Link className={industrial.category} href={category.href} key={category.href}>
              <div className={industrial.categoryImage}>
                <Image src={category.image} alt="" fill loading="lazy" sizes={CATEGORY_IMAGE_SIZES} />
              </div>
              <div className={industrial.categoryBody}>
                <h3>{category.name}</h3>
                <span className={industrial.categoryAction} aria-hidden="true">
                  View Products <MoveRight size={16} />
                </span>
              </div>
              <p className={industrial.categoryNote}>
                <small>{category.index} · {category.skuCount}</small>
                {category.description}
              </p>
            </Link>
          ))}
          <Link className={industrial.category} href="/about#oem-odm">
            <div className={industrial.categoryImage}>
              <Image
                src="https://shop.laifappe.com/homepage/zhanshiting-157199625c.webp"
                alt=""
                fill
                loading="lazy"
                sizes={CATEGORY_IMAGE_SIZES}
              />
            </div>
            <div className={industrial.categoryBody}>
              <h3>OEM / ODM development</h3>
              <span className={industrial.categoryAction} aria-hidden="true">
                Learn More <MoveRight size={16} />
              </span>
            </div>
            <p className={industrial.categoryNote}>
              <small>Custom build</small>
              Design custom PPE under your brand. From sketch to shipment in 8-12 weeks.
            </p>
          </Link>
        </div>
      </div>
    </DeferredBackgroundSection>
  )
}

const PROCUREMENT_LINKS = [
  { title: "Explore Our Foshan PPE Factory", href: "/about#factory" },
  { title: "Certifications & Test Reports", href: "/about#certifications" },
  { title: "OEM / ODM Capabilities", href: "/about#oem-odm" },
  { title: "PPE Procurement Cases", href: "/cases" },
]

function FactoryProcurementSection() {
  return (
    <section className={`${industrial.container} ${industrial.editorialSection}`} aria-labelledby="home-factory-procurement">
      <div className={industrial.procurementLead}>
        <div className={industrial.editorialHeading}>
          <p className={industrial.editorialLabel}>Supplier overview</p>
          <h2 id="home-factory-procurement">Factory &amp; Procurement</h2>
          <p className={industrial.procurementIntro}>
            Explore our production facilities, compliance documents, OEM services, and completed sourcing projects.
          </p>
        </div>
        <figure className={industrial.procurementPhoto}>
          <Image
            src="https://shop.laifappe.com/homepage/hero/hero04-e302dc0bc7.webp"
            alt="PPE production and packing line at Laifappe’s Foshan factory"
            fill
            sizes="(max-width: 760px) 100vw, (max-width: 1540px) 53vw, 795px"
          />
          <figcaption><MapPin size={14} aria-hidden="true" /> Production and packing · Foshan, China</figcaption>
        </figure>
      </div>
      <ol className={industrial.procurementLinks}>
        {PROCUREMENT_LINKS.map(({ title, href }, index) => (
          <li key={href}>
            <Link href={href}>
              <span className={industrial.linkNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span>{title}</span>
              <MoveRight size={20} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

function WhyUsSection() {
  const reasons = [
    ["Factory Direct Pricing", "No traders, no markups. Order straight from a 22-year manufacturer in Foshan with full price transparency."],
    [
      "Stable, Scalable Supply",
      "Seven production lines and 100+ technicians support repeat orders, OEM packaging, and cross-category PPE programs.",
    ],
    ["Strict Quality Inspection", "Batch inspection, documentation support, and product standards aligned to buyer requirements before shipment."],
    ["OEM / ODM from 500 units", "Custom branding, packaging, and product development. Minimum 500 pairs for OEM with in-house design support."],
    ["Fast Global Delivery", "DDP, FOB, CIF to 50+ countries. Lead time 2-4 weeks from confirmed order."],
  ]

  return (
    <section className={`${industrial.container} ${manufacturing.section}`} aria-labelledby="home-manufacturing-advantages">
      <header className={manufacturing.heading}>
        <p className={manufacturing.kicker}>{"\u2014"} Why global buyers work with us</p>
        <h2 id="home-manufacturing-advantages">Direct from factory. <em>Built for procurement.</em></h2>
      </header>
      <div className={manufacturing.advantages}>
        <figure className={manufacturing.advantageFigure}>
          <div className={manufacturing.advantageImage}>
            <Image
              src="https://shop.laifappe.com/homepage/baozhuang-a7e56df140.webp"
              alt="Laifappe packaging area"
              fill
              sizes="(max-width: 760px) 94vw, 42vw"
            />
          </div>
          <figcaption>
            <p className={manufacturing.kicker}>{"\u2014"} Our advantage</p>
            <h3>Why global buyers choose <em>Laifappe.</em></h3>
          </figcaption>
        </figure>
        <ol className={manufacturing.reasonList}>
          {reasons.map(([title, description], index) => (
            <li key={title}>
              <span className={manufacturing.index} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function FeaturedProductsSection({ data }: { data: FeaturedProductsData | null }) {
  if (!data || data.products.length === 0) {
    return null
  }

  return (
    <DeferredBackgroundSection className={`${editorial.section} ${editorial.productSection}`}>
      <div className={industrial.container}>
        <header className={editorial.header}>
          <div>
            <p className={editorial.eyebrow}>{"\u2014"} {data.collection.name}</p>
            <h2>Best-selling SKUs <em>shipping</em> this quarter.</h2>
          </div>
          <Link className={editorial.headerLink} href="/products">
            View All Products <MoveRight aria-hidden="true" size={20} />
          </Link>
        </header>
        <div className={editorial.productSheets}>
          {data.products.map((product, index) => (
            <Link className={editorial.productSheet} href={`/products/${product.slug}`} key={product.id}>
              <div className={editorial.productVisual}>
                <span className={editorial.productTag}>{getProductTag(product, index)}</span>
                <div className={editorial.productPhoto}>
                  {product.image ? (
                    <Image src={product.image} alt={product.name} fill sizes="(max-width: 620px) 33vw, 155px" />
                  ) : (
                    <span>No Image</span>
                  )}
                </div>
              </div>
              <div className={editorial.productInfo}>
                <small>{product.sku ?? data.collection.name}</small>
                <h3>{product.name}</h3>
                {product.description ? <p>{product.description}</p> : null}
                <div className={editorial.productMeta}>
                  <strong>{formatProductPrice(product)}</strong>
                  <span>Ask Price <MoveRight aria-hidden="true" size={17} /></span>
                </div>
              </div>
            </Link>
          ))}
          <Link className={editorial.productSheet} href="/products">
            <div className={editorial.catalogStamp}>
              <strong>ALL</strong>
              <span>PRODUCTS</span>
            </div>
            <div className={editorial.productInfo}>
              <small>{"\u2014"} FULL CATALOG</small>
              <h3>Browse all products across 7 categories.</h3>
              <div className={editorial.productMeta}>
                <span>View All <MoveRight aria-hidden="true" size={17} /></span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DeferredBackgroundSection>
  )
}

function FactoryFullSection() {
  return (
    <section className={`${industrial.container} ${manufacturing.section}`} aria-labelledby="home-factory-tour">
      <div className={manufacturing.factoryPanel}>
        <div className={manufacturing.factoryBody}>
          <div className={manufacturing.factoryImage}>
            <Image
              src="https://shop.laifappe.com/homepage/productionfloor-6e9249f950.webp"
              alt="Laifappe production floor"
              fill
              sizes="(max-width: 760px) 94vw, 49vw"
            />
          </div>
          <div className={manufacturing.factoryContent}>
            <p className={manufacturing.kicker}>Our factory - Foshan, China</p>
            <h2 id="home-factory-tour">
              Factory-backed PPE supply, <em>organized for repeat orders.</em>
            </h2>
            <p className={manufacturing.intro}>
              Walk through our production, packing, and inspection workflow before placing bulk PPE orders.
            </p>
            <div className={manufacturing.factoryAction}>
              <FactoryTourDialog />
            </div>
          </div>
        </div>
        <dl className={manufacturing.metrics}>
          {[
            ["7", "Production Lines"],
            ["500+", "OEM MOQ"],
            ["100+", "Technicians"],
            ["22 yr", "In Operation"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function HowToOrderSection() {
  const steps = [
    {
      step: "Step 01",
      title: (
        <>
          Inquiry <em>Received</em>
        </>
      ),
      description: "Share product type, certification, quantity, packaging needs, and destination.",
    },
    {
      step: "Step 02",
      title: (
        <>
          Specs & Quote <em>Confirmed</em>
        </>
      ),
      description: "We confirm MOQ, lead time, compliance documents, and shipping method.",
    },
    {
      step: "Step 03",
      title: (
        <>
          Production & Global <em>Delivery</em>
        </>
      ),
      description: "QC checked orders ship from China to your destination by sea, air, or express.",
    },
  ]

  return (
    <DeferredBackgroundSection className={`${editorial.section} ${editorial.orderSection}`}>
      <div className={industrial.container}>
        <header className={editorial.header}>
          <div>
            <p className={editorial.eyebrow}>- How to order</p>
            <h2>From inquiry to delivery, <em>three clear steps.</em></h2>
          </div>
          <Link className={editorial.headerLink} href="/contact">
            Contact Us <MoveRight aria-hidden="true" size={20} />
          </Link>
        </header>
        <ol className={editorial.orderStations}>
          {steps.map(({ step, title, description }) => (
            <li key={step}>
              <small>{step}</small>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
        <div className={editorial.shippingPanel}>
          <div className={editorial.mapFrame}>
            <OrderWorldMap />
          </div>
          <dl className={editorial.mapFacts}>
            {[
              ["Export Routes", "50+ Countries"],
              ["Response", "Within 24 Hours"],
              ["QC Standard", "Before Shipment"],
              ["Delivery", "Sea / Air / Express"],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </DeferredBackgroundSection>
  )
}

function OrderWorldMap() {
  return (
    <picture className={editorial.worldMap}>
      <source media="(prefers-reduced-motion: reduce)" srcSet={`${ASSET_BASE}/order-world-map-static.svg`} />
      <Image src={`${ASSET_BASE}/order-world-map.svg`} alt="" fill sizes="(max-width: 720px) 100vw, 68vw" unoptimized />
    </picture>
  )
}

function IndustriesSection({ data }: { data: HomeSolutionsData | null }) {
  const [featuredSolution, ...regularSolutions] = data?.solutions ?? []

  return (
    <section className={`${editorial.section} ${editorial.directory}`}>
      <div className={industrial.container}>
        <header className={editorial.header}>
          <div>
            <p className={editorial.eyebrow}>{"\u2014"} Industry solutions</p>
            <h2>Find your <em>industry</em> solution.</h2>
            <p>Each solution includes hazard analysis, recommended equipment, and compliance guidance.</p>
          </div>
          <Link className={editorial.headerLink} href="/blog#industry-solutions">
            View All Solutions <MoveRight aria-hidden="true" size={20} />
          </Link>
        </header>
        <PriorityHubSpotlights />
        {featuredSolution ? (
          <>
            <Link className={editorial.featuredSolution} href={`/solutions/${featuredSolution.slug}`}>
              <div className={editorial.featuredPhoto}>
                {featuredSolution.coverImage ? (
                  <Image
                    src={featuredSolution.coverImage}
                    alt={featuredSolution.title}
                    fill
                    sizes="(max-width: 720px) 100vw, 53vw"
                  />
                ) : (
                  <div className={editorial.photoFallback}>
                    <Shield aria-hidden="true" />
                  </div>
                )}
                <span>{getSolutionSceneLabel(featuredSolution)}</span>
              </div>
              <div className={editorial.featuredCopy}>
                <small>{"\u2014"} Featured Solution</small>
                <h3>{featuredSolution.title}</h3>
                {featuredSolution.excerpt ? <p>{featuredSolution.excerpt}</p> : null}
                <ul className={editorial.solutionChecks}>
                  {["Hazard Analysis", "Equipment Guide", "Standards Info", "Product Links"].map((item) => (
                    <li key={item}>
                      <CheckCircle2 aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <span className={editorial.solutionAction}>
                  Explore Solution <MoveRight aria-hidden="true" size={18} />
                </span>
              </div>
            </Link>
            {regularSolutions.length > 0 ? (
              <ol className={editorial.solutionRows} start={2}>
                {regularSolutions.map((solution, index) => (
                  <li key={solution.id}>
                    <Link className={editorial.solutionRow} href={`/solutions/${solution.slug}`}>
                      <span className={editorial.solutionNumber}>#{String(index + 2).padStart(2, "0")}</span>
                      <div className={editorial.rowPhoto}>
                        {solution.coverImage ? (
                          <Image
                            src={solution.coverImage}
                            alt={solution.title}
                            fill
                            sizes="(max-width: 520px) 84px, 168px"
                          />
                        ) : (
                          <div className={editorial.photoFallback}>
                            <Shield aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className={editorial.rowCopy}>
                        <small>{getSolutionSceneLabel(solution)}</small>
                        <h3>{solution.title}</h3>
                        {solution.excerpt ? <p>{solution.excerpt}</p> : null}
                      </div>
                      <div className={editorial.rowActions}>
                        <span><CheckCircle2 aria-hidden="true" size={16} /> Certified</span>
                        <strong className={editorial.solutionAction}>
                          Details <MoveRight aria-hidden="true" size={18} />
                        </strong>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        ) : (
          <div className={editorial.directoryEmpty}>
            <Shield aria-hidden="true" />
            <h3>Solutions are being prepared</h3>
            <p>Browse industry PPE plans and procurement guides in the blog.</p>
            <Link className={editorial.headerLink} href="/blog#industry-solutions">
              Browse Solutions <MoveRight aria-hidden="true" size={20} />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

function PriorityHubSpotlights() {
  const hubs = [
    {
      href: "/solutions/construction-site-ppe-solution",
      title: "Construction PPE hub",
      description:
        "A single entry for construction hazards, equipment categories, downloadable planning files, and quote-ready procurement paths.",
      image: "https://shop.laifappe.com/products/1770285316377-hz4oib.webp",
      imageAlt: "Construction PPE kit with helmet, eyewear, gloves, footwear, and high visibility protection",
      highlights: ["Site-wide PPE map", "Task checklists", "Product paths", "Quote planning"],
    },
    {
      href: "/solutions/ppe-safety-equipment-for-mining-quarrying",
      title: "Mining & Quarrying PPE hub",
      description:
        "A task-based entry for mine and quarry hazards, exposure controls, PPE category paths, documentation, and bulk RFQ planning.",
      image: "https://shop.laifappe.com/solutions/ppe-safety-equipment-for-mining-quarrying-cover-1772443454027.webp",
      imageAlt: "Mining and quarry PPE for drilling, crushing, haul roads, and processing work",
      highlights: ["Task hazard map", "Exposure controls", "Product paths", "Bulk RFQ planning"],
    },
  ]

  return (
    <div className={editorial.priorityHubs}>
      {hubs.map((hub) => (
        <Link
          className={editorial.priorityHub}
          href={hub.href}
          aria-label={`Open the ${hub.title}`}
          key={hub.href}
        >
          <div className={editorial.hubPhoto}>
            <Image src={hub.image} alt={hub.imageAlt} fill sizes="(max-width: 520px) 100vw, 210px" />
          </div>
          <div className={editorial.hubCopy}>
            <small>{"\u2014"} Priority hub</small>
            <h3>{hub.title}</h3>
            <p>{hub.description}</p>
            <ul className={editorial.solutionChecks}>
              {hub.highlights.map((item) => (
                <li key={item}>
                  <CheckCircle2 aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <span className={editorial.solutionAction}>
              Open hub <MoveRight aria-hidden="true" size={18} />
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function CertificationsSection() {
  return (
    <section className={quality.certifications} aria-labelledby="home-certifications-title">
      <div className={industrial.container}>
        <header className={quality.heading}>
          <p className={quality.kicker}>{"\u2014"} Certifications</p>
          <h2 id="home-certifications-title">
            Our products meet <em>international</em> standards.
          </h2>
        </header>
        <div className={quality.certificationDossier}>
          <figure className={quality.certificate}>
            <div className={quality.certificatePhoto}>
              <Image
                src="https://shop.laifappe.com/homepage/renzheng-b99b1ab149.webp"
                alt="Laifappe certification documents"
                fill
                sizes="(max-width: 760px) 100vw, (max-width: 1540px) 48vw, 720px"
              />
            </div>
            <figcaption>
              <p className={quality.kicker}>{"\u2014"} TESTED &amp; VERIFIED</p>
              <h3>Certifications your buyers can <em>rely on.</em></h3>
            </figcaption>
          </figure>
          <dl className={quality.standardsLedger} aria-label="Certification and standards summary">
            {[
              ["CE", "EN STANDARDS"],
              ["ISO", "9001:2015"],
              ["ANSI", "ISEA"],
              ["EN", "388 / 397"],
              ["BSCI", "AUDITED"],
            ].map(([cert, label], index) => (
              <div key={cert}>
                <dt>
                  <span className={quality.index} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  {cert}
                </dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <dl className={quality.metrics}>
          {[
            ["20+", "yr", "Experience"],
            ["50+", "", "Countries"],
            ["1M+", "", "Units / Year"],
            ["100+", "", "Technicians"],
          ].map(([value, unit, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {value}
                {unit ? <em>{unit}</em> : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function FacilitySection() {
  return (
    <DeferredBackgroundSection className={`${styles.facilitySection} ${quality.facility}`}>
      <div className={industrial.container}>
        <header className={quality.heading}>
          <p className={quality.kicker}>{"\u2014"} Inside our facility</p>
          <div className={quality.headingRow}>
            <h2>See the <em>production floor</em> yourself.</h2>
            <Link className={quality.tourLink} href="/about">
              Virtual Factory Tour <MoveRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </header>
        <div className={quality.contactSheet}>
          {facilityImages.map((item, index) => (
            <figure className={quality.frame} key={item.image}>
              <div className={quality.framePhoto}>
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 560px) 100vw, (max-width: 1000px) 50vw, 26vw"
                />
              </div>
              <figcaption>
                <span className={quality.frameNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <small>{"\u2014"} {item.tag}</small>
                  <strong>{item.caption}</strong>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </DeferredBackgroundSection>
  )
}

function TestimonialsSection() {
  const testimonialStats = [
    ["500+", "Global Clients"],
    ["98%", "Satisfaction Rate"],
    ["4.9/5", "Average Rating"],
    ["85%", "Repeat Orders"],
  ]

  return (
    <section className={`${industrial.container} ${industrial.partners}`}>
      <div className={industrial.partnersHeader}>
        <div className={industrial.partnersTitle}>
          <SectionHeader dark eyebrow={`${"\u2014"} Trusted by global partners`} title="Trusted by industry leaders." />
        </div>
        <div className={industrial.partnersPhoto}>
          <Image src="/company/f1.webp" alt="" fill sizes="(max-width: 760px) 100vw, 38vw" aria-hidden="true" />
        </div>
      </div>
      <div className={industrial.partnerGrid}>
        {testimonials.map((testimonial) => (
          <article key={testimonial.name}>
            <blockquote><p>{testimonial.quote}</p></blockquote>
            <footer>
              <span>
                <strong>{testimonial.name}</strong>
                <small>{testimonial.role}</small>
              </span>
              <b>
                {testimonial.logo}
                <small>{testimonial.logo === "BUILDCORP" ? "INTL" : testimonial.logo === "SAFETYFIRST" ? "DISTRIBUTION" : "ENERGY"}</small>
              </b>
            </footer>
          </article>
        ))}
      </div>
      <div className={industrial.partnerStats}>
        {testimonialStats.map(([value, label]) => (
          <span key={label}>
            <strong>{value}</strong>
            <small>{label}</small>
          </span>
        ))}
      </div>
    </section>
  )
}

function QuoteBand() {
  return (
    <section className={industrial.quoteBand} aria-labelledby="home-quote-title">
      <div className={`${industrial.container} ${industrial.quoteBandInner}`}>
        <h2 id="home-quote-title">Bulk orders &amp; OEM inquiries</h2>
        <div className={industrial.quoteBandActions}>
          <a className={`${industrial.action} ${industrial.quoteBandPrimary}`} href="#home-quote-form">
            Request a Quote <MoveRight aria-hidden="true" size={18} />
          </a>
          <Link
            className={`${industrial.action} ${industrial.quoteBandSecondary}`}
            href="https://shop.laifappe.com/LAIFA_PPE_catalog.pdf"
            rel="noopener noreferrer"
            target="_blank"
          >
            <ArrowDown aria-hidden="true" size={18} /> Download Catalog
          </Link>
        </div>
      </div>
    </section>
  )
}

function QuoteSection() {
  return (
    <section className={`${industrial.container} ${industrial.quoteDossier}`} aria-labelledby="home-quote-details">
      <div className={industrial.quoteDetails}>
        <div className={industrial.quoteDetailsCopy}>
          <p className={industrial.editorialLabel}>{"\u2014"} Request a quote</p>
          <h2 id="home-quote-details">Ready to source <em>quality PPE?</em></h2>
          <p>
            Email our team for product inquiries, custom orders, or a detailed quotation. We help you find the right
            protection solutions.
          </p>
          <div className={industrial.quotePromises}>
            {[
              ["\u2014 01", "Itemized quotation", "Unit price, packaging, shipping and duties all line-itemed."],
              ["\u2014 02", "Free product samples", "Verified buyers receive free samples within 5 business days."],
              ["\u2014 03", "Dedicated account manager", "One point of contact from quote through to delivery."],
            ].map(([number, title, description]) => (
              <div key={number}>
                <small>{number}</small>
                <span>
                  <strong>{title}</strong>
                  <em>{description}</em>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className={industrial.quotePhoto}>
          <Image
            src="https://shop.laifappe.com/homepage/email-99d53a9f4a.webp"
            alt="Request a PPE quotation"
            fill
            sizes="(max-width: 850px) 100vw, 46vw"
          />
        </div>
      </div>
      <div id="home-quote-form" className={industrial.quoteFormTarget} tabIndex={-1}>
        <QuoteRequestForm
          className={industrial.footerQuoteForm}
          eyebrow="- GET A QUOTE"
          source="Quote section form"
        />
      </div>
    </section>
  )
}

function OemOdmSection() {
  const capabilities = [
    {
      number: "01",
      label: "MATERIAL OPTIONS",
      title: "Material & performance selection",
      description: "Choose fabric weight, coating, leather, outsole, shell, lens, and reflective tape around your target market.",
    },
    {
      number: "02",
      label: "PRODUCT SPEC",
      title: "Fit, function, and standard matching",
      description: "Refine size grading, grip, protection level, color, comfort, and compliance requirements before mass production.",
    },
    {
      number: "03",
      label: "PRIVATE LABEL",
      title: "Branding & packaging development",
      description: "Support logo application, hang tags, barcode labels, color boxes, polybags, instructions, and export cartons.",
    },
    {
      number: "04",
      label: "SAMPLE APPROVAL",
      title: "Prototype review before bulk order",
      description: "Confirm samples for material, workmanship, color, packaging, and documentation before scaling production.",
    },
  ]

  return (
    <section className={`${industrial.container} ${manufacturing.section}`} aria-labelledby="home-oem-capabilities">
      <header className={manufacturing.heading}>
        <p className={manufacturing.kicker}>{"\u2014"} OEM / ODM Capabilities</p>
        <h2 id="home-oem-capabilities">Custom PPE programs, built around <em>your market.</em></h2>
        <p className={manufacturing.intro}>
          From product specification to branded packaging, our team supports distributors, contractors, and importers
          with practical customization options for repeat PPE programs.
        </p>
      </header>
      <div className={manufacturing.oemPanel}>
        <div className={manufacturing.oemImage}>
          <ViewportImage
            src="/homepage/custom-ppe-workwear-workflow-hd.webp"
            alt="Custom workwear program: material options, product specification, private label packaging, and sample approval"
            fill
            quality={90}
            sizes="(max-width: 760px) 94vw, 55vw"
          />
        </div>
        <ol className={manufacturing.oemStages}>
          {capabilities.map((item) => (
            <li key={item.number}>
              <span className={manufacturing.index} aria-hidden="true">{item.number}</span>
              <div>
                <span className={manufacturing.kicker}>{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <ul className={manufacturing.oemProof}>
        <li>Branding samples available</li>
        <li>Packaging mockups supported</li>
        <li>Pilot orders accepted</li>
        <li>Repeat programs managed</li>
      </ul>
    </section>
  )
}

const FOOTER_BRAND_NAME = "粤来发劳保"

export function NewHomeFooter() {
  return (
    <footer className={footer.root}>
      <div className={footer.wrap}>
        <div className={footer.masthead}>
          <div className={footer.brand}>
            <Link className={footer.brandLink} href="/" aria-label={`LAIFAPPE · ${FOOTER_BRAND_NAME}首页`}>
              <Image src="/favicon.ico" alt="" width={52} height={52} className={footer.logo} />
              <span>
                <strong>LAIFAPPE</strong>
                <small><span lang="zh-CN">{FOOTER_BRAND_NAME}</span> · EST. 2003</small>
              </span>
            </Link>
            <p>Since 2003, <span lang="zh-CN">{FOOTER_BRAND_NAME}</span> has manufactured certified personal protective equipment for global buyers.</p>
            <ul className={footer.badges}>
              {["CE EN", "ISO 9001", "ANSI", "BSCI"].map((badge) => (
                <li key={badge}>{badge}</li>
              ))}
            </ul>
          </div>
          <div className={footer.inquiry}>
            <p className={footer.eyebrow}>Bulk orders &amp; OEM / ODM</p>
            <h2>Sourcing PPE in bulk?</h2>
            <Link className={footer.quote} href="/quote">
              Request a Quote <MoveRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className={footer.directory}>
          <nav className={footer.group} aria-label="Footer products">
            <h3>Products</h3>
            <Link href="/categories/head-protection">Head Protection</Link>
            <Link href="/categories/hand-protection">Hand Protection</Link>
            <Link href="/categories/foot-protection">Foot Protection</Link>
            <Link href="/categories/body-protection">Workwear</Link>
            <Link href="/categories/eye-protection">Eye Protection</Link>
            <Link href="/categories/fall-protection">Fall Protection</Link>
          </nav>
          <nav className={footer.group} aria-label="Footer industry guides">
            <h3>Industry Guides</h3>
            <Link href="/blog#industry-solutions">All Industry Guides</Link>
            <Link href="/solutions/construction-site-ppe-solution">Construction</Link>
            <Link href="/solutions/ppe-for-metal-fabrication-and-welding-workshops">Metal Fabrication</Link>
            <Link href="/solutions/fall-protection-construction">Fall Protection</Link>
            <Link href="/solutions/ppe-safety-equipment-for-warehouse-logistics">Logistics</Link>
            <Link href="/solutions/ppe-safety-equipment-for-mining-quarrying">Mining</Link>
            <Link href="/solutions/ppe-for-scaffolding-and-elevated-platforms">Scaffolding</Link>
          </nav>
          <nav className={footer.group} aria-label="Footer company">
            <h3>Company</h3>
            <Link href="/about">About Us</Link>
            <Link href="/about#factory">Our Factory</Link>
            <Link href="/about#certifications">Certifications</Link>
            <Link href="/about#oem-odm">OEM / ODM</Link>
            <Link href="/cases">Procurement Cases</Link>
            <Link href="/blog">News & Blog</Link>
          </nav>
          <div className={footer.group}>
            <h3>Contact Us</h3>
            <ul className={footer.contact}>
              <li>
                <a href="tel:+8618029309938">
                  <Phone size={15} aria-hidden="true" /> +86 180 2930 9938
                </a>
              </li>
              <li>
                <a href="mailto:sales@laifappe.com">
                  <Mail size={15} aria-hidden="true" /> sales@laifappe.com
                </a>
              </li>
              <li>
                <a href="https://www.laifappe.com" rel="noopener noreferrer" target="_blank">
                  <Globe size={15} aria-hidden="true" /> www.laifappe.com
                </a>
              </li>
              <li><MapPin size={15} aria-hidden="true" /> Foshan, Guangdong, China</li>
            </ul>
          </div>
        </div>
        <div className={footer.bottom}>
          <span>&copy; 2026 <span lang="zh-CN">{FOOTER_BRAND_NAME}</span>. All Rights Reserved.</span>
          <nav aria-label="Footer legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Use</Link>
            <Link href="/sitemap.xml">Sitemap</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
