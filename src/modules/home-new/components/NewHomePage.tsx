import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { CheckCircle2, Clock3, Mail, MapPin, Monitor, MoveRight, Phone, Shield } from "lucide-react"
import { getCollectionProducts } from "@/actions/collections"
import { getSolutions } from "@/actions/solutions"
import { formatUsageSceneLabel, USAGE_SCENES, type UsageScene } from "@/types/solution"
import { ASSET_BASE, catalogProofProducts, categories, facilityImages, testimonials } from "./data"
import { FactoryTourDialog } from "./FactoryTourDialog"
import { HeroBackground } from "./HeroBackground"
import { NewHomeNav } from "./NewHomeNav"
import { QuoteDrawer, QuoteRequestForm } from "./QuoteRequestForm"
import { SectionHeader } from "./SectionHeader"
import styles from "./home-new.module.css"

const HOME_DATA_TIMEOUT_MS = 1200

type FeaturedProductsData = NonNullable<Awaited<ReturnType<typeof getCollectionProducts>>>
type FeaturedProduct = FeaturedProductsData["products"][number]
type HomeSolutionsData = NonNullable<Awaited<ReturnType<typeof getSolutions>>>
type HomeSolution = HomeSolutionsData["solutions"][number]

async function loadFeaturedProducts(): Promise<FeaturedProductsData | null> {
  return Promise.race([
    getCollectionProducts("best-sellers", 5),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), HOME_DATA_TIMEOUT_MS)),
  ]).catch((error) => {
    console.error("Failed to load new homepage featured products", error)
    return null
  })
}

async function loadHomeSolutions(): Promise<HomeSolutionsData | null> {
  return Promise.race([
    getSolutions({ activeOnly: true, limit: 5 }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), HOME_DATA_TIMEOUT_MS)),
  ]).catch((error) => {
    console.error("Failed to load new homepage solutions", error)
    return null
  })
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

export async function NewHomePage() {
  const [featuredProductsData, solutionsData] = await Promise.all([loadFeaturedProducts(), loadHomeSolutions()])

  return (
    <NewHomeShell>
      <NewHomeTopBar />
      <NewHomeNav />
      <HeroSection />
      <TrustStrip />
      <CategorySection />
      <WhyUsSection />
      <OemOdmSection />
      <FeaturedProductsSection data={featuredProductsData} />
      <FactoryFullSection />
      <HowToOrderSection />
      <IndustriesSection data={solutionsData} />
      <CertificationsSection />
      <FacilitySection />
      <TestimonialsSection />
      <QuoteSection />
      <NewHomeFooter />
    </NewHomeShell>
  )
}

export function NewHomeShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>{children}</div>
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

  return (
    <section className={styles.hero}>
      <HeroBackground images={heroImages} />
      <div className={`${styles.wrap} ${styles.heroContent}`}>
        <div className={styles.heroGrid}>
          <div>
            <div className={styles.heroEyebrow}>
              <span className={styles.liveDot} />
              Trusted by 500+ buyers across 50+ countries
            </div>
            <h1>
              Professional PPE{" "}
              <br />
              <em>Manufacturing Solutions</em>
            </h1>
            <p className={styles.heroSub}>
              Leading manufacturer of personal protective equipment for extreme environments. Safety gloves, footwear,
              workwear and more with global certifications.
            </p>
            <div className={styles.heroCta}>
              <QuoteDrawer
                source="Hero Get Instant Quote"
                trigger={
                  <button className={`${styles.btn} ${styles.btnAccent}`} type="button">
                    Get Instant Quote <span className={styles.arr}>&rarr;</span>
                  </button>
                }
              />
              <Link
                className={`${styles.btn} ${styles.btnGhostHero}`}
                href="https://shop.laifappe.com/LAIFA_PPE_catalog.pdf"
                rel="noopener noreferrer"
                target="_blank"
              >
                <span aria-hidden="true">&darr;</span>
                Download Catalog
              </Link>
            </div>
            <div className={styles.heroCerts}>
              <span>Certified</span>
              {["CE EN", "ISO 9001:2015", "ANSI/ISEA", "EN 388", "BSCI"].map((cert) => (
                <strong key={cert}>{cert}</strong>
              ))}
            </div>
            <div className={styles.productProofStrip} aria-label="Current catalog product examples">
              {catalogProofProducts.map((product) => (
                <article className={styles.proofItem} key={`${product.certification}-${product.name}`}>
                  <span className={styles.proofThumb}>
                    <Image src={product.image} alt="" fill sizes="58px" aria-hidden="true" />
                  </span>
                  <span>
                    <small className={styles.proofKicker}>{product.certification}</small>
                    <span className={styles.proofName}>{product.name}</span>
                  </span>
                </article>
              ))}
            </div>
          </div>

          <QuoteRequestForm compact source="Hero FAST RFQ" />
        </div>
      </div>
      <div className={styles.heroStats}>
        <div className={styles.wrap}>
          {[
            { value: "20+", unit: "yr", label: "Years Experience" },
            { value: "50+", label: "Export Countries" },
            { value: "1M+", label: "Units / Year" },
            { value: "100+", label: "Skilled Workers" },
            { value: "24", unit: "h", label: "Quote Response" },
          ].map(({ value, unit, label }) => (
            <div className={styles.heroStat} key={label}>
              <div>
                <strong>
                  {value}
                  {unit ? <span>{unit}</span> : null}
                </strong>
                <small>{label}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
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
    <section className={styles.trustStrip} aria-label="Laifappe trust highlights">
      <div className={styles.wrap}>
        {items.map(({ icon: Icon, label }) => (
          <div className={styles.trustPill} key={label}>
            <Icon aria-hidden="true" size={16} strokeWidth={1.5} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function CategorySection() {
  return (
    <section className={`${styles.section} ${styles.categoriesSection}`}>
      <div className={styles.wrap}>
        <SectionHeader
          eyebrow="PRODUCT CATEGORIES"
          title={
            <>
              Full-range protection, <em>built in-house.</em>
            </>
          }
          description="From precision-engineered cut-resistant gloves to ANSI-certified safety footwear - produced under one roof, governed by one quality standard."
        />
        <div className={styles.categoryGrid}>
          {categories.map((category) => (
            <Link className={styles.categoryCard} href={category.href} key={category.href}>
              <div className={styles.categoryImage}>
                <Image src={category.image} alt={category.name} fill sizes="(max-width: 768px) 100vw, 25vw" />
                <span>{category.skuCount}</span>
              </div>
              <div className={styles.categoryBody}>
                <small>{category.index}</small>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
                <b aria-hidden="true">^</b>
              </div>
            </Link>
          ))}
          <Link className={`${styles.categoryCard} ${styles.categoryDark}`} href="/about#oem-odm">
            <div className={styles.categoryImage}>
              <Image
                src="https://shop.laifappe.com/homepage/zhanshiting-157199625c.webp"
                alt="Laifappe OEM and ODM development"
                fill
                sizes="25vw"
              />
            </div>
            <div className={styles.categoryBody}>
              <small>Custom build</small>
              <h3>OEM / ODM development</h3>
              <p>Design custom PPE under your brand. From sketch to shipment in 8-12 weeks.</p>
              <b aria-hidden="true">^</b>
            </div>
          </Link>
        </div>
      </div>
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
    <section className={styles.whySection}>
      <div className={styles.whyImage}>
        <Image
          src="https://shop.laifappe.com/homepage/baozhuang-a7e56df140.webp"
          alt="Laifappe packaging area"
          fill
          sizes="50vw"
        />
        <div className={styles.whyImageOverlay} />
        <div className={styles.whyImageLabel}>
          <span>{"\u2014"} OUR ADVANTAGE</span>
          <h3>
            Why global buyers
            <br />
            choose <em>Laifappe.</em>
          </h3>
        </div>
      </div>
      <div className={styles.whyContent}>
        <SectionHeader
          eyebrow={`${"\u2014"} Why global buyers work with us`}
          title={
            <>
              Direct from factory.
              <br />
              <em>Built for procurement.</em>
            </>
          }
        />
        <div className={styles.whyList}>
          {reasons.map(([title, description], index) => (
            <div className={styles.whyItem} key={title}>
              <span>{"\u2014"} {String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedProductsSection({ data }: { data: FeaturedProductsData | null }) {
  if (!data || data.products.length === 0) {
    return null
  }

  return (
    <section className={`${styles.section} ${styles.productsSection}`}>
      <div className={styles.wrap}>
        <SectionHeader
          eyebrow={`${"\u2014"} ${data.collection.name}`}
          title={
            <>
              Best-selling SKUs <em>shipping</em> this quarter.
            </>
          }
          action={
            <Link className={`${styles.btn} ${styles.btnGhostDark}`} href="/products">
              View All Products
              <span className={styles.arr} aria-hidden="true">
                &rarr;
              </span>
            </Link>
          }
        />
        <div className={styles.productGrid}>
          {data.products.map((product, index) => (
            <Link className={styles.productCard} href={`/products/${product.slug}`} key={product.id}>
              <div className={styles.productImage}>
                <span>{getProductTag(product, index)}</span>
                {product.image ? (
                  <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 50vw, 16vw" />
                ) : (
                  <div className={styles.productNoImage}>No Image</div>
                )}
              </div>
              <div className={styles.productBody}>
                <small>{product.sku ?? data.collection.name}</small>
                <h3>{product.name}</h3>
                {product.description ? <p className={styles.productDescription}>{product.description}</p> : null}
                <div>
                  <span className={styles.productPrice}>{formatProductPrice(product)}</span>
                  <span className={styles.productAsk}>Ask Price</span>
                </div>
              </div>
            </Link>
          ))}
          <Link className={`${styles.productCard} ${styles.catalogCard}`} href="/products">
            <div className={styles.catalogTop}>
              <strong>ALL</strong>
              <span>PRODUCTS</span>
            </div>
            <div className={styles.productBody}>
              <small>{"\u2014"} FULL CATALOG</small>
              <h3>Browse all products across 7 categories.</h3>
              <div>
                <span />
                <b>
                  View All <span aria-hidden="true">&rarr;</span>
                </b>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}

function FactoryFullSection() {
  return (
    <section className={styles.factoryFull}>
      <Image
        src="https://shop.laifappe.com/homepage/productionfloor-6e9249f950.webp"
        alt="Laifappe production floor"
        fill
        sizes="100vw"
      />
      <div className={styles.factoryOverlay} />
      <div className={styles.wrap}>
        <div className={styles.factoryContent}>
          <span>Our factory - Foshan, China</span>
          <h2>
            Factory-backed PPE supply, <em>organized for repeat orders.</em>
          </h2>
          <p>
            Walk through our production, packing, and inspection workflow before placing bulk PPE orders.
          </p>
          <div className={styles.heroCta}>
            <FactoryTourDialog />
          </div>
          <div className={styles.factoryStats}>
            {[
              ["7", "Production Lines"],
              ["500+", "OEM MOQ"],
              ["100+", "Technicians"],
              ["22 yr", "In Operation"],
            ].map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
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
    <section className={`${styles.section} ${styles.orderSection}`}>
      <div className={styles.wrap}>
        <SectionHeader
          eyebrow="- How to order"
          title={
            <>
              From inquiry to delivery,
              <br />
              <em>three clear steps.</em>
            </>
          }
          action={
            <Link className={`${styles.btn} ${styles.btnGhostDark}`} href="/contact">
              Contact Us
              <span className={styles.arr} aria-hidden="true">
                &rarr;
              </span>
            </Link>
          }
        />
        <div className={styles.orderMapPanel}>
          <div className={styles.orderMapStage}>
            <OrderWorldMap />
            <div className={styles.mapStatRow}>
              {[
                ["Export Routes", "50+ Countries"],
                ["Response", "Within 24 Hours"],
                ["QC Standard", "Before Shipment"],
                ["Delivery", "Sea / Air / Express"],
              ].map(([key, value]) => (
                <div className={styles.mapStat} key={key}>
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.orderFlow}>
            {steps.map(({ step, title, description }) => (
              <article key={step}>
                <small>{step}</small>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function OrderWorldMap() {
  return (
    <span className={styles.orderWorldMap} aria-hidden="true">
      <Image src={`${ASSET_BASE}/order-world-map.svg`} alt="" fill sizes="100vw" unoptimized />
    </span>
  )
}

function IndustriesSection({ data }: { data: HomeSolutionsData | null }) {
  const [featuredSolution, ...regularSolutions] = data?.solutions ?? []

  return (
    <section className={`${styles.section} ${styles.industriesSection}`}>
      <div className={styles.wrap}>
        <SectionHeader
          dark
          eyebrow={`${"\u2014"} Industry solutions`}
          title={
            <>
              Find your <em>industry</em> solution.
            </>
          }
          description="Each solution includes hazard analysis, recommended equipment, and compliance guidance."
          action={
            <Link className={`${styles.btn} ${styles.btnGhostLight}`} href="/solutions">
              View All Solutions
              <span className={styles.arr} aria-hidden="true">
                &rarr;
              </span>
            </Link>
          }
        />
        <PriorityHubSpotlights />
        {featuredSolution ? (
          <div className={styles.industryShowcase}>
            <Link className={styles.industryFeaturedCard} href={`/solutions/${featuredSolution.slug}`}>
              <div className={styles.industryFeaturedImage}>
                {featuredSolution.coverImage ? (
                  <Image
                    src={featuredSolution.coverImage}
                    alt={featuredSolution.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <div className={styles.industryImageFallback}>
                    <Shield aria-hidden="true" />
                  </div>
                )}
                <span>{getSolutionSceneLabel(featuredSolution)}</span>
              </div>
              <div className={styles.industryFeaturedContent}>
                <small>{"\u2014"} Featured Solution</small>
                <h3>{featuredSolution.title}</h3>
                {featuredSolution.excerpt ? <p>{featuredSolution.excerpt}</p> : null}
                <ul className={styles.industryChecks}>
                  {["Hazard Analysis", "Equipment Guide", "Standards Info", "Product Links"].map((item) => (
                    <li key={item}>
                      <CheckCircle2 aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <span className={styles.industryAction}>
                  Explore Solution
                  <MoveRight aria-hidden="true" />
                </span>
              </div>
            </Link>
            {regularSolutions.length > 0 ? (
              <div className={styles.industryRegularGrid}>
                {regularSolutions.map((solution, index) => (
                  <Link className={styles.industrySolutionCard} href={`/solutions/${solution.slug}`} key={solution.id}>
                    <div className={styles.industryCardImage}>
                      {solution.coverImage ? (
                        <Image
                          src={solution.coverImage}
                          alt={solution.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 25vw"
                        />
                      ) : (
                        <div className={styles.industryImageFallback}>
                          <Shield aria-hidden="true" />
                        </div>
                      )}
                      <span className={styles.industryScene}>{getSolutionSceneLabel(solution)}</span>
                      <span className={styles.industryIndex}>#{String(index + 2).padStart(2, "0")}</span>
                    </div>
                    <div className={styles.industryCardContent}>
                      <h3>{solution.title}</h3>
                      {solution.excerpt ? <p>{solution.excerpt}</p> : null}
                      <div>
                        <span>
                          <CheckCircle2 aria-hidden="true" />
                          Certified
                        </span>
                        <strong>
                          Details
                          <MoveRight aria-hidden="true" />
                        </strong>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className={styles.industryEmpty}>
            <Shield aria-hidden="true" />
            <h3>Solutions are being prepared</h3>
            <p>Visit the full solutions page to browse active PPE programs and industry guidance.</p>
            <Link className={`${styles.btn} ${styles.btnOrange}`} href="/solutions">
              Browse Solutions
              <span className={styles.arr} aria-hidden="true">
                &rarr;
              </span>
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
    <>
      {hubs.map((hub) => (
        <Link
          className={styles.constructionHubSpotlight}
          href={hub.href}
          aria-label={`Open the ${hub.title}`}
          key={hub.href}
        >
          <span className={styles.constructionHubMedia}>
            <Image src={hub.image} alt={hub.imageAlt} fill sizes="(max-width: 1100px) 100vw, 34vw" />
          </span>
          <span className={styles.constructionHubBody}>
            <small>{"\u2014"} Priority hub</small>
            <span className={styles.constructionHubTitle}>{hub.title}</span>
            <span className={styles.constructionHubText}>{hub.description}</span>
            <span className={styles.constructionHubChecks}>
              {hub.highlights.map((item) => (
                <span key={item}>
                  <CheckCircle2 aria-hidden="true" />
                  {item}
                </span>
              ))}
            </span>
            <span className={styles.constructionHubAction}>
              Open hub
              <MoveRight aria-hidden="true" />
            </span>
          </span>
        </Link>
      ))}
    </>
  )
}

function CertificationsSection() {
  return (
    <section className={styles.certSection}>
      <div className={styles.certImage}>
        <Image
          src="https://shop.laifappe.com/homepage/renzheng-b99b1ab149.webp"
          alt="Laifappe certification documents"
          fill
          sizes="50vw"
        />
        <div className={styles.certOverlay} />
        <div className={styles.certImageLabel}>
          <span>{"\u2014"} TESTED & VERIFIED</span>
          <h3>
            Certifications your
            <br />
            buyers can <em>rely on.</em>
          </h3>
        </div>
      </div>
      <div className={styles.certContent}>
        <SectionHeader
          eyebrow={`${"\u2014"} Certifications`}
          title={
            <>
              Our products meet <em>international</em> standards.
            </>
          }
        />
        <div className={styles.certLogos}>
          {[
            ["CE", "EN STANDARDS"],
            ["ISO", "9001:2015"],
            ["ANSI", "ISEA"],
            ["EN", "388 / 397"],
            ["BSCI", "AUDITED"],
          ].map(([cert, label]) => (
            <span key={cert}>
              <strong>{cert}</strong>
              <small>{label}</small>
            </span>
          ))}
        </div>
        <div className={styles.certStats}>
          {[
            ["20+", "yr", "Experience"],
            ["50+", "", "Countries"],
            ["1M+", "", "Units / Year"],
            ["100+", "", "Technicians"],
          ].map(([value, unit, label]) => (
            <span key={label}>
              <strong>
                {value}
                {unit ? <em>{unit}</em> : null}
              </strong>
              <small>{label}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function FacilitySection() {
  return (
    <section className={`${styles.section} ${styles.facilitySection}`}>
      <div className={styles.wrap}>
        <SectionHeader
          eyebrow={`${"\u2014"} Inside our facility`}
          title={
            <>
              See the <em>production floor</em> yourself.
            </>
          }
          action={
            <Link className={`${styles.btn} ${styles.btnGhostDark}`} href="/about">
              Virtual Factory Tour
              <span className={styles.arr} aria-hidden="true">
                &rarr;
              </span>
            </Link>
          }
        />
        <div className={styles.facilityGrid}>
          {facilityImages.map((item) => (
            <figure className={`${styles.facilityImage} ${item.tall ? styles.facilityTall : ""}`} key={item.image}>
              <Image src={item.image} alt={item.alt} fill sizes="(max-width: 768px) 100vw, 40vw" />
              <figcaption>
                <small>{"\u2014"} {item.tag}</small>
                <span>{item.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
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
    <section className={styles.testimonialsSection}>
      <Image src="/company/f1.webp" alt="" fill sizes="100vw" aria-hidden="true" />
      <div className={styles.wrap}>
        <SectionHeader dark eyebrow={`${"\u2014"} Trusted by global partners`} title="Trusted by industry leaders." />
        <div className={styles.testimonialGrid}>
          {testimonials.map((testimonial) => (
            <article key={testimonial.name}>
              <p>{testimonial.quote}</p>
              <div>
                <span>
                  <strong>{testimonial.name}</strong>
                  <small>{testimonial.role}</small>
                </span>
                <b>
                  {testimonial.logo}
                  <small>{testimonial.logo === "BUILDCORP" ? "INTL" : testimonial.logo === "SAFETYFIRST" ? "DISTRIBUTION" : "ENERGY"}</small>
                </b>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.testimonialStats}>
          {testimonialStats.map(([value, label]) => (
            <span key={label}>
              <strong>{value}</strong>
              <small>{label}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function QuoteSection() {
  return (
    <section className={styles.quoteSection}>
      <div className={styles.quoteImage}>
        <Image
          src="https://shop.laifappe.com/homepage/email-99d53a9f4a.webp"
          alt="Request a PPE quotation"
          fill
          sizes="50vw"
        />
        <div>
          <span>{"\u2014"} Request a quote</span>
          <h2>
            Ready to source
            <br />
            <em>quality PPE?</em>
          </h2>
          <p>
            Email our team for product inquiries, custom orders, or a detailed quotation. We help you find the right
            protection solutions.
          </p>
          <div className={styles.quotePromises}>
            {[
              ["\u2014 01", "Itemized quotation", "Unit price, packaging, shipping and duties all line-itemed."],
              ["\u2014 02", "Free product samples", "Verified buyers receive free samples within 5 business days."],
              ["\u2014 03", "Dedicated account manager", "One point of contact from quote through to delivery."],
            ].map(([number, title, description]) => (
              <div className={styles.quotePromise} key={number}>
                <small>{number}</small>
                <span>
                  <strong>{title}</strong>
                  <em>{description}</em>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <QuoteRequestForm
        className={styles.quoteSectionRequestForm}
        eyebrow="- GET A QUOTE"
        source="Quote section form"
      />
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
    <section className={styles.oemSection}>
      <div className={styles.wrap}>
        <div className={styles.oemBody}>
          <div className={styles.oemContent}>
            <span className={styles.oemEyebrow}>{"\u2014"} OEM / ODM Capabilities</span>
            <h2>
              Custom PPE programs,
              <br />
              built around <em>your market.</em>
            </h2>
            <p>
              From product specification to branded packaging, our team supports distributors, contractors, and importers
              with practical customization options for repeat PPE programs.
            </p>
          </div>
          <div className={styles.oemMedia}>
            <Image
              src="https://shop.laifappe.com/homepage/oem-odm-capabilities02.webp"
              alt="OEM and ODM PPE sample development, measurement, packaging, and material review"
              fill
              sizes="(max-width: 1100px) 100vw, 48vw"
            />
          </div>
          <div className={styles.oemCapabilityList}>
            {capabilities.map((item) => (
              <article key={item.number}>
                <small>
                  {"\u2014"} {item.number}
                </small>
                <div>
                  <span>{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className={styles.oemProofStrip}>
          <span>Branding samples available</span>
          <span>Packaging mockups supported</span>
          <span>Pilot orders accepted</span>
          <span>Repeat programs managed</span>
        </div>
      </div>
    </section>
  )
}

export function NewHomeFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.footerGrid}>
          <div>
            <Link className={styles.footerLogo} href="/" aria-label="Laifappe homepage">
              <Image
                src="/favicon.ico"
                alt="Yuelaifa PPE icon"
                width={52}
                height={52}
                className={styles.footerLogoIcon}
              />
              <span>
                <strong>{"\u7ca4\u6765\u53d1\u52b3\u4fdd"}</strong>
                <small>YUELAIFA PPE · EST. 2003</small>
              </span>
            </Link>
            <p>Yuelaifa Industry Co., Ltd. manufactures certified personal protective equipment for global buyers since 2003.</p>
            <div className={styles.footerBadges}>
              {["CE EN", "ISO 9001", "ANSI", "BSCI"].map((badge) => (
                <span key={badge}>{badge}</span>
              ))}
            </div>
          </div>
          <nav aria-label="Footer products">
            <h3>Products</h3>
            <Link href="/categories/head-protection">Head Protection</Link>
            <Link href="/categories/hand-protection">Hand Protection</Link>
            <Link href="/categories/foot-protection">Foot Protection</Link>
            <Link href="/categories/body-protection">Workwear</Link>
            <Link href="/categories/eye-protection">Eye Protection</Link>
            <Link href="/categories/fall-protection">Fall Protection</Link>
          </nav>
          <nav aria-label="Footer solutions">
            <h3>Solutions</h3>
            <Link href="/solutions/construction-site-ppe-solution">Construction</Link>
            <Link href="/solutions/ppe-for-metal-fabrication-and-welding-workshops">Metal Fabrication</Link>
            <Link href="/solutions/fall-protection-construction">Fall Protection</Link>
            <Link href="/solutions/ppe-safety-equipment-for-warehouse-logistics">Logistics</Link>
            <Link href="/solutions/ppe-safety-equipment-for-mining-quarrying">Mining</Link>
            <Link href="/solutions/ppe-for-scaffolding-and-elevated-platforms">Scaffolding</Link>
          </nav>
          <nav aria-label="Footer company">
            <h3>Company</h3>
            <Link href="/about">About Us</Link>
            <Link href="/about#factory">Our Factory</Link>
            <Link href="/about#certifications">Certifications</Link>
            <Link href="/about#oem-odm">OEM / ODM</Link>
            <Link href="/blog">News & Blog</Link>
          </nav>
          <div>
            <h3>Contact Us</h3>
            <p><span><Phone size={12} strokeWidth={1.8} /></span>+86 180 2930 9938</p>
            <p><span><Mail size={12} strokeWidth={1.8} /></span>sales@laifappe.com</p>
            <p>
              <span>W</span>
              <a href="https://www.laifappe.com" rel="noopener noreferrer" target="_blank">
                www.laifappe.com
              </a>
            </p>
            <p><span><MapPin size={12} strokeWidth={1.8} /></span>Foshan, Guangdong, China</p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>&copy; 2026 Laifappe PPE. All Rights Reserved.</span>
          <div>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Use</Link>
            <Link href="/sitemap.xml">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
