import { Metadata } from "next"
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
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react"

export const metadata: Metadata = {
  title: "About Us | Laifappe",
  description:
    "Professional B2B Safety Equipment Supplier in Foshan, Guangdong, China. Learn about Laifappe, our local offices, contact details, and quality commitment.",
}

const heroStats = [
  { value: "2003", label: "Established in Foshan" },
  { value: "1,000+", label: "PPE and safety SKUs" },
  { value: "10,000+", label: "Enterprise customers served" },
]

const proofPoints = [
  "Real Foshan showroom and local office points for product checks",
  "Bulk PPE sourcing across head, hand, foot, clothing, and accessories",
  "OEM and ODM support for distributors, contractors, and factories",
]

const capabilities = [
  {
    icon: ShieldCheck,
    title: "Product Selection",
    description:
      "Match PPE categories to jobsite hazards, procurement budgets, and project timelines.",
  },
  {
    icon: PackageCheck,
    title: "Bulk Fulfillment",
    description:
      "Support repeat orders, mixed-category procurement, and stable supply for engineering teams.",
  },
  {
    icon: ClipboardCheck,
    title: "Quality Control",
    description:
      "Coordinate sample checks, packaging review, and order inspection before shipment.",
  },
  {
    icon: Truck,
    title: "Export Coordination",
    description:
      "Prepare export-ready communication for distributors and overseas purchasing teams.",
  },
]

const businessDetails = [
  {
    label: "Business Name",
    value: "foshan yuelaifa labor protection products co., ltd.",
    icon: Building2,
  },
  {
    label: "Phone",
    value: "+86 180 2930 9938",
    href: "tel:+8618029309938",
    icon: Phone,
  },
  {
    label: "WhatsApp / WeChat",
    value: "+86 180 2930 9938",
    href: "https://wa.me/8618029309938",
    icon: MessageCircle,
  },
  {
    label: "Email",
    value: "sales@laifappe.com",
    href: "mailto:sales@laifappe.com",
    icon: Mail,
    preferred: true,
  },
]

const localOffices = [
  {
    title: "Foshan Chancheng Office",
    address:
      "Shop 5-8, New Shop Area, Avenue 13, Zone E, South China Hardware & Electrical Appliance Wholesale Market, Chancheng District, Foshan, Guangdong, China",
    description:
      "Local consultation point for product selection, bulk purchasing, and engineering PPE projects.",
  },
  {
    title: "Foshan Nanhai Office",
    address:
      "2AB, Road 8, Zone A, and 4AB, Road 8, Zone A, South China International Hardware Electrical & Mechanical City, Nanhai District, Foshan, Guangdong, China",
    description:
      "Sales coordination point for sample checks, order follow-up, and supplier visits.",
  },
]

const trustMetrics = [
  { icon: Award, value: "20+", label: "Years industry experience" },
  { icon: Users, value: "10k+", label: "Customers and project buyers" },
  { icon: Factory, value: "1k+", label: "Safety product types" },
  { icon: Globe2, value: "B2B", label: "Distributor and project focus" },
]

const history = [
  {
    year: "2003",
    title: "Founded in Foshan",
    description:
      "Started serving local enterprise clients with labor protection and safety equipment.",
  },
  {
    year: "2008",
    title: "Expanded PPE Categories",
    description:
      "Built a broader catalog across head, hand, foot, clothing, and site safety products.",
  },
  {
    year: "2015",
    title: "Digital Procurement Upgrade",
    description:
      "Improved order coordination, product data management, and customer communication.",
  },
  {
    year: "2024",
    title: "Project Supply Focus",
    description:
      "Continued building one-stop procurement support for contractors, distributors, and factories.",
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#101820]">
      <section className="relative isolate overflow-hidden bg-[#0b1117] text-white">
        <Image
          src="https://shop.laifappe.com/company/about-hero-showroom.webp"
          alt="Laifappe PPE showroom in Foshan"
          fill
          className="object-cover opacity-90"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,12,18,0.9)_0%,rgba(5,12,18,0.78)_34%,rgba(5,12,18,0.34)_58%,rgba(5,12,18,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(238,181,92,0.12),transparent_32%),linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.34))]" />

        <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-end px-6 pb-10 pt-24 lg:min-h-[700px] lg:px-8">
          <div className="max-w-3xl pb-12">
            <div className="mb-6 inline-flex items-center gap-3 border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur">
              <span className="h-2 w-2 bg-[#e9b85f]" />
              Foshan PPE supplier since 2003
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.03] tracking-normal text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.34)] md:text-6xl">
              PPE sourcing backed by a real showroom.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-white/86 drop-shadow-[0_1px_8px_rgba(0,0,0,0.32)] md:text-lg">
              Laifappe supplies industrial PPE for distributors, contractors,
              and procurement teams that need visible stock, reliable contacts,
              and steady order execution.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 bg-[#e9b85f] px-6 text-sm font-bold text-[#101820] transition-colors hover:bg-[#f4c978]"
              >
                Contact Sales
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/products"
                className="inline-flex min-h-[48px] items-center justify-center border border-white/28 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/12"
              >
                View Products
              </Link>
            </div>
          </div>

          <div className="grid border-y border-white/16 bg-black/24 backdrop-blur-sm sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="border-white/14 px-5 py-5 sm:border-r last:sm:border-r-0">
                <div className="text-3xl font-semibold text-white">{stat.value}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/62">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#ddd6c8] bg-[#f6f4ef] px-6 py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#b57724]">
              Supplier profile
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-normal text-[#101820] md:text-5xl">
              A practical PPE partner with local presence and export-ready service.
            </h2>
            <div className="mt-8 space-y-5 text-base leading-8 text-[#40505c]">
              <p>
                We are a professional <strong className="text-[#101820]">B2B labor protection and PPE products supplier</strong> headquartered in <strong className="text-[#101820]">Foshan, Guangdong, China</strong>, established in <strong className="text-[#101820]">2003</strong>. Our work covers product development, production coordination, quality control, and global distribution support.
              </p>
              <p>
                The product range includes head protection, hand protection, foot protection, protective clothing, respiratory and eye protection, and industrial safety accessories. The goal is simple: help buyers consolidate PPE sourcing without losing visibility into product quality and order progress.
              </p>
            </div>

            <ul className="mt-8 space-y-4">
              {proofPoints.map((point) => (
                <li key={point} className="flex gap-3 text-sm font-medium leading-6 text-[#17232d]">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#13795b]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-5">
            <div className="relative min-h-[420px] overflow-hidden bg-[#d7d0c3] sm:col-span-3">
              <Image
                src="/company/f1.webp"
                alt="Laifappe product showroom shelves"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 55vw"
              />
            </div>
            <div className="grid gap-4 sm:col-span-2">
              <div className="relative min-h-[202px] overflow-hidden bg-[#d7d0c3]">
                <Image
                  src="/company/f2.webp"
                  alt="PPE product display area"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 28vw"
                />
              </div>
              <div className="bg-[#10202b] p-6 text-white">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#e9b85f]">
                  Business name
                </div>
                <div className="mt-4 text-xl font-semibold leading-7">
                  foshan yuelaifa labor protection products co., ltd.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-4">
          {trustMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className="border border-[#e5dfd2] bg-[#fbfaf7] p-6">
                <Icon className="h-6 w-6 text-[#b57724]" />
                <div className="mt-8 text-4xl font-semibold text-[#101820]">{metric.value}</div>
                <p className="mt-3 text-sm font-medium leading-6 text-[#50616d]">{metric.label}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="bg-[#101820] px-6 py-20 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#e9b85f]">
                What buyers get
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-normal">
                PPE sourcing that feels inspectable, not anonymous.
              </h2>
              <p className="mt-6 text-base leading-8 text-white/68">
                The page uses real showroom imagery because the selling point is not abstract scale.
                It is visible inventory, local contacts, and a team that can help buyers compare,
                customize, and repeat orders with less uncertainty.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map((item) => {
                const Icon = item.icon
                return (
                  <article key={item.title} className="border border-white/12 bg-white/[0.06] p-6">
                    <div className="flex h-12 w-12 items-center justify-center bg-[#e9b85f] text-[#101820]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/66">{item.description}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f4ef] px-6 py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#b57724]">
              Verified local presence
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-normal text-[#101820]">
              Business information and Foshan office points.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#50616d]">
              Laifappe is based in Foshan, Guangdong, China, with local office points serving PPE distributors,
              project contractors, factories, and engineering procurement teams.
            </p>

            <dl className="mt-10 divide-y divide-[#d8d1c2] border-y border-[#d8d1c2]">
              {businessDetails.map((item) => {
                const Icon = item.icon
                const value = item.href ? (
                  <a
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.value}
                  </a>
                ) : (
                  <span>{item.value}</span>
                )

                return (
                  <div key={item.label} className="grid gap-3 py-5 sm:grid-cols-[190px_1fr]">
                    <dt className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.12em] text-[#6f7b83]">
                      <Icon className="h-4 w-4 text-[#b57724]" />
                      {item.label}
                    </dt>
                    <dd className={`break-words text-base font-semibold text-[#101820] ${item.preferred ? "text-[#0f6b51]" : ""}`}>
                      {value}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>

          <div className="grid gap-5">
            {localOffices.map((office, index) => (
              <article key={office.title} className="border border-[#d8d1c2] bg-white p-7">
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#101820] text-white">
                    <span className="text-sm font-bold">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#b57724]">
                      <MapPin className="h-4 w-4" />
                      Foshan office
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold text-[#101820]">{office.title}</h3>
                    <p className="mt-4 text-sm font-semibold leading-7 text-[#22313a]">{office.address}</p>
                    <p className="mt-3 text-sm leading-7 text-[#5f6d76]">{office.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#b57724]">
              Development timeline
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-normal text-[#101820]">
              Built through long-term, practical PPE work.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#50616d]">
              The company history is less about slogans and more about category depth,
              sourcing discipline, and repeat order support.
            </p>
          </div>

          <div className="space-y-0 border-l border-[#d8d1c2]">
            {history.map((item) => (
              <article key={item.year} className="relative pb-9 pl-8 last:pb-0">
                <div className="absolute -left-[7px] top-1 h-3.5 w-3.5 bg-[#e9b85f] ring-4 ring-white" />
                <div className="text-sm font-bold uppercase tracking-[0.18em] text-[#b57724]">{item.year}</div>
                <h3 className="mt-2 text-2xl font-semibold text-[#101820]">{item.title}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f6d76]">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#0b1117] px-6 py-20 text-white lg:px-8">
        <Image
          src="/company/f3.webp"
          alt="Laifappe safety product showroom"
          fill
          className="object-cover opacity-22"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#0b1117]/82" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#e9b85f]">
              Ready for procurement
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-normal md:text-5xl">
              Send your PPE list. We will help turn it into a workable supply plan.
            </h2>
          </div>
          <Link
            href="/contact"
            className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 bg-white px-7 text-sm font-bold text-[#101820] transition-colors hover:bg-[#e9b85f]"
          >
            Contact Us
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
