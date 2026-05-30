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
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google"
import { QuoteDrawer, QuoteRequestForm } from "@/modules/home-new/components"
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

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--about-new-fs",
  display: "swap",
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--about-new-fd",
  display: "swap",
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--about-new-fm",
  display: "swap",
})

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

export function AboutNewPage() {
  return (
    <div className={`${styles.page} ${interTight.variable} ${instrumentSerif.variable} ${jetBrainsMono.variable}`}>
      <main>
        <HeroSection />
        <AuditStrip />
        <CompanyIntroductionSection />
        <FactorySection />
        <QualitySection />
        <OemSection />
        <DeliverySection />
        <BuyerProofSection />
        <QuoteSection />
      </main>
    </div>
  )
}

function HeroSection() {
  return (
    <section className={styles.hero}>
      <Image
        src={aboutImageUrls.productionFloor}
        alt="Laifappe PPE production floor in Foshan"
        fill
        priority
        sizes="100vw"
        className={styles.heroImage}
      />
      <div className={styles.heroOverlay} />
      <div className={styles.heroWash} />
      <div className={`${styles.wrap} ${styles.heroInner}`}>
        <div className={styles.heroCopy}>
          <div className={styles.heroEyebrow}>
            <span className={styles.liveDot} />
            Supplier audit page for PPE buyers
          </div>
          <h1>
            Inspect the factory behind your <em>PPE program.</em>
          </h1>
          <p>
            Laifappe helps distributors, contractors, and procurement teams source certified PPE with visible factory
            capacity, document support, OEM packaging, and export-ready order handling.
          </p>
          <div className={styles.heroActions}>
            <QuoteDrawer
              source="About hero supplier inquiry"
              trigger={
                <button className={`${styles.button} ${styles.buttonAccent}`} type="button">
                  Request Supplier Info
                  <ArrowRight size={16} strokeWidth={1.8} />
                </button>
              }
            />
            <Link
              className={`${styles.button} ${styles.buttonGhost}`}
              href="https://shop.laifappe.com/LAIFA_PPE_catalog.pdf"
              rel="noopener noreferrer"
              target="_blank"
            >
              Download Catalog
            </Link>
          </div>
        </div>

        <aside className={styles.heroPanel} aria-label="Laifappe supplier summary">
          <span>Supplier Profile</span>
          <h2>Foshan Yuelaifa Labor Protection Products Co., Ltd.</h2>
          <dl>
            {supplierFacts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
      <div className={styles.heroStats}>
        <div className={styles.wrap}>
          {heroStats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AuditStrip() {
  return (
    <section className={styles.auditStrip} aria-label="Supplier trust checks">
      <div className={styles.wrap}>
        {auditPills.map((item) => (
          <span key={item}>
            <CheckCircle2 size={16} strokeWidth={1.8} />
            {item}
          </span>
        ))}
      </div>
    </section>
  )
}

function CompanyIntroductionSection() {
  return (
    <section className={`${styles.section} ${styles.profileSection}`}>
      <div className={styles.wrap}>
        <div className={styles.companyIntroHeader}>
          <span>Company Introduction</span>
          <strong />
        </div>
        <div className={styles.companyIntroGrid}>
          <div className={styles.companyIntroCopy}>
            <span>- About Yuelaifa / Laifappe</span>
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
                  <CheckCircle2 size={18} strokeWidth={1.8} />
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
                  index === 0 ? styles.companyIntroImageWide : styles.companyIntroImageTall
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
              <span>- Real local presence</span>
              <h2>
                Factory, showroom, office, and buyer conversations shown <em>together.</em>
              </h2>
            </div>
            <p>
              These photos make the company feel concrete: production space, product display, office support, and
              customer-facing communication. Replace any card with newer factory building, storefront, office, or
              meeting photos when available.
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
              <Icon size={22} strokeWidth={1.7} />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FactorySection() {
  return (
    <section className={styles.factorySection} id="factory">
      <div className={styles.factoryImage}>
        <Image
          src={aboutImageUrls.hero02}
          alt="Laifappe bright PPE production workshop"
          fill
          sizes="(max-width: 980px) 100vw, 48vw"
        />
      </div>
      <div className={styles.factoryContent}>
        <div className={styles.sectionIntro}>
          <span>- Inside the factory</span>
          <h2>
            Production is presented as a process, not a <em>slogan.</em>
          </h2>
          <p>
            Buyers should see what happens between inquiry and shipping: materials are checked, samples are approved,
            production is monitored, and packing is documented before the order leaves the factory.
          </p>
        </div>
        <div className={styles.processList}>
          {factorySteps.map((step) => (
            <article key={step.number}>
              <small>{step.number}</small>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function QualitySection() {
  return (
    <section className={`${styles.section} ${styles.qualitySection}`} id="certifications">
      <div className={styles.wrap}>
        <div className={styles.qualityDossier}>
          <div className={styles.qualityNarrative}>
            <span>- Quality and documents</span>
            <h2>
              Review-ready compliance files, not just <em>claims.</em>
            </h2>
            <p>
              The certificate image gives buyers a quick first check. For serious PPE sourcing, we also prepare the
              supporting files buyers normally ask for before sample approval or bulk production.
            </p>

            <div className={styles.documentPanel}>
              {["Business license", "Certificate files", "Test reports", "Packing records", "Sample photos"].map(
                (item) => (
                  <span key={item}>
                    <CheckCircle2 size={17} strokeWidth={1.8} />
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
              <ClipboardCheck size={18} strokeWidth={1.8} />
              Certificate and report examples shown for buyer review
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}

function OemSection() {
  return (
    <section className={styles.oemSection} id="oem-odm">
      <div className={styles.wrap}>
        <div className={styles.oemHeader}>
          <div className={styles.sectionIntro}>
            <span>- OEM / ODM capability</span>
            <h2>
              Custom PPE programs built around your <em>market.</em>
            </h2>
          </div>
          <p>
            This section makes customization feel operational: choices, proof samples, packaging, and approval points
            are visible before mass production starts.
          </p>
        </div>
        <div className={styles.oemMedia}>
          <Image
            src={aboutImageUrls.oemOdmCapabilities}
            alt="OEM and ODM PPE sample development workflow"
            fill
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
      </div>
    </section>
  )
}

function DeliverySection() {
  return (
    <section className={`${styles.section} ${styles.deliverySection}`}>
      <div className={`${styles.wrap} ${styles.deliveryGrid}`}>
        <div>
          <div className={styles.sectionIntro}>
            <span>- Warehouse and delivery</span>
            <h2>
              Make the buyer feel the order is <em>trackable.</em>
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
    <section className={styles.buyerSection}>
      <div className={styles.wrap}>
        <div className={styles.buyerHeader}>
          <div className={styles.sectionIntro}>
            <span>- Buyer touchpoints</span>
            <h2>
              Show real conversations, not invented <em>logos.</em>
            </h2>
          </div>
          <p>
            Trade show and sample review images give social proof without relying on unverifiable customer claims.
            Replace these later with real case studies when you have permission.
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
      </div>
    </section>
  )
}

function QuoteSection() {
  return (
    <section className={styles.quoteSection}>
      <div className={styles.quoteImage}>
        <Image src={aboutImageUrls.email} alt="Request Laifappe supplier documents and quote" fill sizes="50vw" />
        <div>
          <span>- Request supplier information</span>
          <h2>
            Ask for catalog, certificates, samples, or a <em>bulk quote.</em>
          </h2>
          <p>
            Send product type, quantity, target standard, packaging needs, and destination. Our team can reply with a
            practical sourcing plan and document list.
          </p>
          <div className={styles.quoteMiniStats}>
            <span>
              <Award size={18} strokeWidth={1.8} />
              Certificate support
            </span>
            <span>
              <PackageCheck size={18} strokeWidth={1.8} />
              Packing photos
            </span>
            <span>
              <Globe2 size={18} strokeWidth={1.8} />
              Export logistics
            </span>
          </div>
        </div>
      </div>
      <QuoteRequestForm
        className={styles.quoteFormPanel}
        eyebrow="- SUPPLIER INQUIRY"
        source="About new supplier inquiry form"
      />
    </section>
  )
}
