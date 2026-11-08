import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  Globe2,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { FactoryTourDialog } from "@/modules/home-new/components/FactoryTourDialog"
import { QuoteDrawer, QuoteRequestForm } from "@/modules/home-new/components/QuoteRequestForm"
import { COMPANY_NAME } from "@/lib/company"
import {
  auditPills,
  aboutImageUrls,
  buyerProof,
  businessScope,
  companyHighlights,
  companyIntroImages,
  companyIntroParagraphs,
  certifications,
  deliverySteps,
  factorySteps,
  heroStats,
  oemCapabilities,
  presencePhotos,
  supplierFacts,
} from "./data"
import styles from "./about-new.module.css"

const trustCards: Array<{
  icon: LucideIcon
  title: string
  description: string
}> = [
  {
    icon: Building2,
    title: "Visible supplier identity",
    description: "Real Foshan operation, public contact channels, and showroom-ready product categories.",
  },
  {
    icon: Factory,
    title: "Inspectable production",
    description: "Factory floor, packing area, warehouse, and QC process can be reviewed before bulk ordering.",
  },
  {
    icon: ShieldCheck,
    title: "Standards-led sourcing",
    description: "CE, EN, ANSI, ISO, and product-specific certificate documents can be supplied for review.",
  },
  {
    icon: Truck,
    title: "Export execution",
    description: "Packing photos, carton details, logistics routing, and shipment options are coordinated in one workflow.",
  },
]

const supplierSections = [
  { id: "factory", label: "Factory & QC" },
  { id: "certifications", label: "Certifications", detail: "Quality checks" },
  { id: "oem-odm", label: "OEM / ODM", detail: "Sample approval" },
  { id: "delivery", label: "Packing & Export" },
] as const

export function AboutNewPage() {
  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">About</span>
        </nav>
        <HeroSection />
        <SupplierProfile />
        <nav className={styles.sectionNav} aria-label="Supplier information">
          <p className={styles.kicker} id="supplier-workflow-title">From sample to shipment</p>
          <ol>
            {supplierSections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <div>
                    {section.label}
                    {"detail" in section && <small>{section.detail}</small>}
                  </div>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <AuditStrip />
        <CompanyIntroductionSection />
        <FactorySection />
        <QualitySection />
        <OemSection />
        <DeliverySection />
        <BuyerProofSection />
        <QuoteSection />
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby="about-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>
          <span>
            Foshan, China / Est. 2003
            <small>PPE supplier profile for global buyers</small>
          </span>
        </p>
        <h1 id="about-title">
          About <span>Laifappe</span>
        </h1>
        <p className={styles.heroSubtitle}>PPE manufacturing in Foshan</p>
        <p className={styles.description}>
          <strong>Inspect the factory behind your PPE program.</strong>{" "}
          Laifappe helps distributors, contractors, and procurement teams source certified PPE with visible factory
          capacity, document support, OEM packaging, and export-ready order handling.
        </p>
        <div className={styles.heroActions}>
          <QuoteDrawer
            source="About hero supplier inquiry"
            trigger={
              <button className={styles.button} type="button">
                Request Supplier Info
                <ArrowRight aria-hidden="true" size={17} />
              </button>
            }
          />
          <a
            className={`${styles.button} ${styles.buttonGhost}`}
            href="https://shop.laifappe.com/LAIFA_PPE_catalog.pdf"
            rel="noopener noreferrer"
            target="_blank"
          >
            Download Catalog
          </a>
        </div>
      </div>

      <figure className={styles.heroFigure}>
        <div className={styles.heroPhoto}>
          <div>
            <Image
              src={aboutImageUrls.productionFloor}
              alt="Laifappe PPE production floor in Foshan"
              fill
              priority
              sizes="(min-width: 1440px) 870px, (min-width: 861px) 61vw, 100vw"
            />
          </div>
        </div>
        <figcaption>Production floor at our Foshan facility, Guangdong, China.</figcaption>
      </figure>
    </section>
  )
}

function SupplierProfile() {
  return (
    <section className={styles.supplierProfile} aria-labelledby="supplier-profile-title">
      <div className={styles.supplierIdentity}>
        <p className={styles.kicker}>Supplier Profile</p>
        <h2 id="supplier-profile-title">{COMPANY_NAME}</h2>
      </div>
      <dl className={styles.supplierStats}>
        {heroStats.map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <dl className={styles.supplierFacts}>
        {supplierFacts.filter(({ label }) => label !== "Business" && label !== "Founded").map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function AuditStrip() {
  return (
    <section className={styles.auditStrip} aria-label="Supplier trust checks">
      {auditPills.map((item) => (
        <span key={item}>
          <CheckCircle2 aria-hidden="true" size={16} strokeWidth={1.8} />
          {item}
        </span>
      ))}
    </section>
  )
}

function CompanyIntroductionSection() {
  return (
    <section className={styles.section}>
      <p className={styles.sectionLabel}>Company Introduction</p>
      <div className={styles.companyIntroGrid}>
        <div>
          <p className={styles.kicker}>About Yuelaifa / Laifappe</p>
          <h2>
            Founded in 2003, built from broad labor-protection supply into <em>factory-backed PPE.</em>
          </h2>
          <div className={styles.companyIntroText}>
            {companyIntroParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className={styles.companyScope}>
            {businessScope.map((item) => (
              <span key={item}>
                <CheckCircle2 aria-hidden="true" size={18} strokeWidth={1.8} />
                {item}
              </span>
            ))}
          </div>
          <div className={styles.companyHighlights}>
            {companyHighlights.map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.companyIntroMedia}>
          {companyIntroImages.map((image, index) => (
            <figure
              className={`${styles.companyIntroImage} ${
                index === 0 ? styles.companyIntroImageWide : ""
              }`}
              key={image.title}
            >
              <div className={styles.companyIntroPhoto}>
                <Image src={image.image} alt={image.title} fill sizes="(max-width: 900px) 100vw, 54vw" />
              </div>
              <figcaption className={styles.companyIntroCaption}>
                <span>{image.title}</span>
                <small>{image.description}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <div className={styles.presenceSection}>
        <div className={styles.presenceHeader}>
          <div className={styles.sectionIntro}>
            <p className={styles.kicker}>Real local presence</p>
            <h2>
              A clear view of our factory, showroom, office, and <em>buyer support.</em>
            </h2>
          </div>
          <p>
            Review the spaces behind the sourcing process: production plant, showroom display, sales office, and
            customer communication points used for product review and order coordination.
          </p>
        </div>
        <div className={styles.presenceGrid}>
          {presencePhotos.map((photo) => (
            <article key={photo.title}>
              <div>
                <Image src={photo.image} alt={photo.title} fill sizes="(max-width: 900px) 100vw, 25vw" />
                <span>{photo.label}</span>
              </div>
              <h3>{photo.title}</h3>
              <p>{photo.description}</p>
            </article>
          ))}
        </div>
      </div>
      <div className={styles.profileTrustGrid}>
        {trustCards.map(({ icon: Icon, title, description }) => (
          <article key={title}>
            <Icon aria-hidden="true" size={22} strokeWidth={1.7} />
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function FactorySection() {
  return (
    <section className={styles.factory} id="factory" aria-labelledby="factory-title">
      <figure className={styles.factoryPhoto}>
        <Image
          src={aboutImageUrls.hero02}
          alt="Laifappe bright PPE production workshop"
          fill
          sizes="(min-width: 1440px) 800px, (min-width: 861px) 57vw, 100vw"
        />
      </figure>
      <div className={styles.factoryCopy}>
        <p className={styles.kicker}>Inside the factory</p>
        <h2 className={`${styles.heading} ${styles.markedHeading}`} id="factory-title">Factory &amp; Quality Control</h2>
        <p className={styles.description}>
          <strong>A practical production process from specification to shipment.</strong>{" "}
          From inquiry to shipping, materials are checked, samples are approved, production is monitored, and packing
          details are documented before the order leaves the factory.
        </p>
        <ol className={styles.process}>
          {factorySteps.map(({ number, title, description }) => (
            <li key={number}>
              <span className={styles.stepNumber} aria-hidden="true">{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className={styles.factoryTour}>
          <FactoryTourDialog />
        </div>
      </div>
    </section>
  )
}

function QualitySection() {
  return (
    <section className={styles.section} id="certifications">
      <div className={styles.qualityDossier}>
        <div className={styles.qualityNarrative}>
          <p className={styles.kicker}>Quality and documents</p>
          <h2>
            Compliance documents prepared for <em>buyer review.</em>
          </h2>
          <p>
            For PPE sourcing projects, our team can prepare business documents, product certificates, test reports,
            sample photos, and packing records before sample approval or bulk production. Share the product model and
            target standard so we can confirm the scope of the available documents.
          </p>

          <div className={styles.documentPanel}>
            {["Business license", "Certificate files", "Test reports", "Packing records", "Sample photos"].map(
              (item) => (
                <span key={item}>
                  <CheckCircle2 aria-hidden="true" size={17} strokeWidth={1.8} />
                  {item}
                </span>
              ),
            )}
          </div>

          <div className={styles.certGrid}>
            {certifications.map((cert) => (
              <span key={cert.mark}>
                <strong>{cert.mark}</strong>
                <small>{cert.label}</small>
              </span>
            ))}
          </div>
        </div>

        <figure className={styles.qualityCertificate}>
          <div className={styles.qualityCertificateFrame}>
            <Image
              src={aboutImageUrls.zhengshu}
              alt="Laifappe business license and PPE certificate documents"
              fill
              sizes="(max-width: 900px) 100vw, 58vw"
            />
          </div>
          <figcaption>
            <ClipboardCheck aria-hidden="true" size={18} strokeWidth={1.8} />
            Certificate and report examples shown for buyer review
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function OemSection() {
  return (
    <section className={styles.section} id="oem-odm">
      <div className={styles.oemHeader}>
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>OEM / ODM capability</p>
          <h2>
            Custom PPE programs built around your <em>market.</em>
          </h2>
        </div>
        <p>
          Customization starts with material choices, product specifications, proof samples, packaging requirements,
          and approval points before mass production starts.
        </p>
      </div>
      <div className={styles.oemMedia}>
        <Image
          src={aboutImageUrls.oemOdmCapabilities}
          alt="Custom workwear program: material options, product specification, private label packaging, and sample approval"
          fill
          quality={90}
          sizes="100vw"
        />
      </div>
      <div className={styles.oemCards}>
        {oemCapabilities.map((item, index) => (
          <article key={item.title}>
            <small>{String(index + 1).padStart(2, "0")}</small>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function DeliverySection() {
  return (
    <section className={styles.section} id="delivery">
      <div className={styles.deliveryGrid}>
        <div>
          <div className={styles.sectionIntro}>
            <p className={styles.kicker}>Warehouse and delivery</p>
            <h2>
              Clear order stages from quote to <em>delivery.</em>
            </h2>
            <p>
              For B2B PPE, trust is built through clear order stages: quote, sample confirmation, production, packing,
              shipping documents, and delivery method.
            </p>
          </div>
          <div className={styles.deliverySteps}>
            {deliverySteps.map((step, index) => (
              <article key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className={styles.deliveryMedia}>
          <figure className={styles.deliveryImageWide}>
            <Image
              src={aboutImageUrls.baozhuang}
              alt="Laifappe PPE packing and quality inspection area"
              fill
              sizes="(max-width: 900px) 100vw, 44vw"
            />
          </figure>
          <figure>
            <Image
              src={aboutImageUrls.canku02}
              alt="Laifappe PPE warehouse inventory"
              fill
              sizes="(max-width: 900px) 50vw, 22vw"
            />
          </figure>
          <figure>
            <Image
              src={aboutImageUrls.wuliu}
              alt="Global logistics map for PPE export"
              fill
              sizes="(max-width: 900px) 50vw, 22vw"
            />
          </figure>
        </div>
      </div>
    </section>
  )
}

function BuyerProofSection() {
  return (
    <section className={styles.section}>
      <div className={styles.buyerHeader}>
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>Buyer touchpoints</p>
          <h2>
            Buyer meetings and sample reviews from real <em>trade touchpoints.</em>
          </h2>
        </div>
        <p>
          Trade show and sample review photos show how buyers compare materials, product categories, packaging
          options, and documentation with our team before placing bulk orders.
        </p>
      </div>
      <div className={styles.buyerGrid}>
        {buyerProof.map((item) => (
          <article key={item.title}>
            <div>
              <Image src={item.image} alt={item.title} fill sizes="(max-width: 900px) 100vw, 50vw" />
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function QuoteSection() {
  return (
    <section className={styles.section} id="supplier-documents" aria-labelledby="supplier-documents-title">
      <div className={styles.quote}>
        <h2 id="supplier-documents-title">Request supplier documents</h2>
        <p>Get catalogs, test reports, and factory information for your evaluation.</p>
        <a className={styles.button} href="#supplier-inquiry-form">
          Contact Our Team
          <ArrowRight aria-hidden="true" size={17} />
        </a>
      </div>
      <div className={styles.quoteSection} id="supplier-inquiry-form" tabIndex={-1}>
        <div className={styles.quoteImage}>
          <Image
            src={aboutImageUrls.email}
            alt="Request Laifappe supplier documents and quote"
            fill
            sizes="(max-width: 860px) 100vw, 48vw"
          />
          <div>
            <p className={styles.kicker}>Request supplier information</p>
            <h3>Ask for catalog, certificates, samples, or a bulk quote.</h3>
            <p>
              Send product type, quantity, target standard, packaging needs, and destination. Our team can reply with a
              practical sourcing plan and document list.
            </p>
            <div className={styles.quoteMiniStats}>
              <span><Award aria-hidden="true" size={18} strokeWidth={1.8} /> Certificate support</span>
              <span><PackageCheck aria-hidden="true" size={18} strokeWidth={1.8} /> Packing photos</span>
              <span><Globe2 aria-hidden="true" size={18} strokeWidth={1.8} /> Export logistics</span>
            </div>
          </div>
        </div>
        <QuoteRequestForm
          className={styles.quoteFormPanel}
          eyebrow="- SUPPLIER INQUIRY"
          source="About new supplier inquiry form"
        />
      </div>
    </section>
  )
}
