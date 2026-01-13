import { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "About Us | MAISON",
  description: "Professional B2B Safety Equipment Supplier - Learn about our company, mission, and commitment to quality.",
}

// Core values data
const values = [
  {
    icon: "🎯",
    title: "Professional Focus",
    description: "Specialized in safety equipment, providing professional products and services",
  },
  {
    icon: "🏆",
    title: "Quality Assurance",
    description: "Strict quality management system ensuring product excellence",
  },
  {
    icon: "👥",
    title: "Customer First",
    description: "Customer-oriented approach delivering premium service",
  },
  {
    icon: "🌍",
    title: "Innovation Driven",
    description: "Continuous innovation leading industry development",
  },
]

// Statistics data
const stats = [
  { value: "10+", label: "Years Experience" },
  { value: "10,000+", label: "Enterprise Clients" },
  { value: "50,000+", label: "Product Types" },
  { value: "98%", label: "Customer Satisfaction" },
]

// Company history
const history = [
  {
    year: "2015",
    title: "Company Founded",
    description: "Established safety equipment supply platform, began serving enterprise clients",
  },
  {
    year: "2017",
    title: "Business Expansion",
    description: "Product line expanded to 6 major categories, client base exceeded 1,000",
  },
  {
    year: "2019",
    title: "Platform Upgrade",
    description: "Launched online ordering platform, achieved full-process digitalization",
  },
  {
    year: "2022",
    title: "Industry Leader",
    description: "Client base exceeded 10,000, became industry-leading B2B safety equipment supplier",
  },
  {
    year: "2024",
    title: "Continuous Innovation",
    description: "Launched intelligent procurement system, continuing to lead industry development",
  },
]


export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[300px] bg-neutral-900">
        <Image
          src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600"
          alt="About Us"
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
              About Us
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto px-4">
              Professional B2B Safety Equipment Supplier
            </p>
          </div>
        </div>
      </section>

      {/* Company Introduction */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Company Profile
          </h2>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            We are a professional platform focused on B2B safety equipment supply, established in 2015.
            After years of development, we have become a leading safety equipment supplier in the industry,
            providing quality products and services to over 10,000 enterprise clients.
          </p>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Our products cover safety helmets, face shields, welding helmets, bump caps, protective hoods
            and many other categories. We have a complete supply chain system and quality management system,
            committed to providing customers with high-quality products, competitive prices and professional
            technical support.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Adhering to the service philosophy of &quot;Quality First, Customer Supreme&quot;, we continuously
            optimize procurement processes, improve service quality, and create greater value for customers.
          </p>
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Core Values
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((item, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Stats */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-card rounded-lg p-8 text-center shadow-sm border">
              <div className="text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Company History */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Our Journey
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {history.map((item, index) => (
                <div key={index} className="flex gap-6">
                  <div className="w-24 flex-shrink-0 text-right">
                    <div className="inline-block bg-primary text-primary-foreground px-3 py-1 rounded font-semibold">
                      {item.year}
                    </div>
                  </div>
                  <div className={`flex-1 ${index < history.length - 1 ? 'pb-8 border-l-2 border-primary/30' : ''} pl-6 relative`}>
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-semibold mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-neutral-900 py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join Us, Create the Future Together
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            We look forward to partnering with you, providing quality products and services
          </p>
          <a
            href="mailto:sales@example.com"
            className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-full transition-colors"
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  )
}
