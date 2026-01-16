import { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Success Cases | MAISON",
  description: "Witness our professional services and share our clients' success stories",
}

// Case studies data
const cases = [
  {
    id: "1",
    title: "Supply Chain Optimization for Major Auto Manufacturer",
    company: "Leading Automotive Group",
    industry: "Automotive",
    location: "Shanghai",
    date: "2024-06",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
    description: "Provided full range of safety equipment for this automotive manufacturer, optimizing supply chain management and reducing procurement costs by 15%.",
    products: ["Safety Helmets", "Face Shields", "Protective Gloves"],
    results: ["15% cost reduction", "30% faster delivery", "99.5% quality rate"],
  },
  {
    id: "2",
    title: "Safety Equipment Upgrade for Construction Company",
    company: "Major Construction Corp.",
    industry: "Construction",
    location: "Beijing",
    date: "2024-05",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800",
    description: "Supplied high-quality head protection and safety gear, helping client meet new safety regulations and improve workplace safety.",
    products: ["Industrial Helmets", "Welding Helmets", "Bump Caps"],
    results: ["Zero incidents", "100% compliance", "98% satisfaction rate"],
  },
  {
    id: "3",
    title: "PPE Program for Food Processing Plant",
    company: "Leading Food Enterprise",
    industry: "Food Processing",
    location: "Hangzhou",
    date: "2024-04",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800",
    description: "Provided comprehensive PPE solutions for food processing environment, meeting hygiene and safety standards.",
    products: ["Face Shields", "Protective Hoods", "Safety Helmets"],
    results: ["35% efficiency increase", "Full compliance", "40% fewer incidents"],
  },
  {
    id: "4",
    title: "Welding Safety Program for Metal Fabrication",
    company: "Metal Works Enterprise",
    industry: "Manufacturing",
    location: "Shenzhen",
    date: "2024-03",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800",
    description: "Supplied professional welding helmets and protective equipment to ensure worker safety during metal fabrication.",
    products: ["Auto-Darkening Helmets", "Welding Hoods", "Face Shields"],
    results: ["50% better visibility", "Zero eye injuries", "20% faster work"],
  },
  {
    id: "5",
    title: "Warehouse Safety Upgrade for Logistics Company",
    company: "Major Logistics Group",
    industry: "Logistics",
    location: "Guangzhou",
    date: "2024-02",
    image: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800",
    description: "Implemented comprehensive head protection program for warehouse workers, reducing workplace injuries significantly.",
    products: ["Bump Caps", "Safety Helmets", "LED Bump Caps"],
    results: ["45% fewer injuries", "30% cost savings", "15% productivity increase"],
  },
  {
    id: "6",
    title: "Chemical Plant Safety Enhancement",
    company: "Chemical Industry Group",
    industry: "Chemical",
    location: "Ningbo",
    date: "2024-01",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800",
    description: "Provided chemical-resistant protective equipment to improve production safety in hazardous environments.",
    products: ["Chemical Hoods", "Face Shields", "Protective Helmets"],
    results: ["Zero safety incidents", "40% longer equipment life", "Full certification"],
  },
]

// Statistics data
const stats = [
  { value: "10,000+", label: "Enterprises Served" },
  { value: "500+", label: "Success Cases" },
  { value: "15+", label: "Industries Covered" },
  { value: "98%", label: "Customer Satisfaction" },
]

export default function CasesPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[300px] bg-neutral-900">
        <Image
          src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600"
          alt="Success Cases"
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
              Success Cases
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto px-4">
              Witness our professional services and share our clients&apos; success stories
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cases Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow border"
              >
                <div className="aspect-video overflow-hidden bg-muted relative">
                  <Image
                    src={caseItem.image}
                    alt={caseItem.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                      {caseItem.industry}
                    </span>
                    <span className="flex items-center gap-1">
                      {caseItem.date}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold mb-2">
                    {caseItem.title}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span>{caseItem.company}</span>
                    <span>{caseItem.location}</span>
                  </div>

                  <p className="text-muted-foreground mb-4">
                    {caseItem.description}
                  </p>

                  <div className="mb-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      Products Supplied:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {caseItem.products.map((product, index) => (
                        <span
                          key={index}
                          className="text-xs bg-muted px-2 py-1 rounded"
                        >
                          {product}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Project Results:
                    </div>
                    <ul className="space-y-1">
                      {caseItem.results.map((result, index) => (
                        <li
                          key={index}
                          className="text-sm text-green-600 flex items-start gap-2"
                        >
                          <span className="mt-0.5">✓</span>
                          <span>{result}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-neutral-900 py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Looking Forward to Partnering With You
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Let&apos;s create the next success story together
          </p>
          <a
            href="mailto:sales@example.com"
            className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-full transition-colors"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </div>
  )
}
