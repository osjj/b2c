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
  { value: "20+", label: "Years Experience" },
  { value: "10,000+", label: "Enterprise Clients" },
  { value: "1,000+", label: "Product Types" },
  { value: "98%", label: "Customer Satisfaction" },
]

// Company history
const history = [
  {
    year: "2003",
    title: "Company Founded",
    description: "Established in Foshan, Guangdong, China, began serving enterprise clients with safety equipment",
  },
  {
    year: "2008",
    title: "Business Expansion",
    description: "Product line expanded to cover comprehensive PPE categories, client base exceeded 1,000",
  },
  {
    year: "2015",
    title: "Platform Upgrade",
    description: "Launched online ordering platform, achieved full-process digitalization",
  },
  {
    year: "2020",
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
            We are a professional <strong className="text-foreground">B2B</strong> <strong className="text-foreground">labor protection and PPE products supplier</strong> headquartered in <strong className="text-foreground">Foshan, Guangdong, China</strong>, <strong className="text-foreground">established in 2003</strong>. With over 20 years of industry experience, we focus on the manufacturing and supply of industrial safety products, supported by an integrated system covering product development, production, quality control, and global distribution.
          </p>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Our product range includes <strong className="text-foreground">1,000+ PPE and safety items</strong>, such as head, hand, and foot protection, protective clothing, and various industrial safety accessories. We have <strong className="text-foreground">served more than 10,000 customers</strong> worldwide, including distributors, contractors, manufacturers, and engineering companies, delivering consistent quality and reliable supply.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            With proven experience in <strong className="text-foreground">large-scale engineering and infrastructure projects</strong> and <strong className="text-foreground">partnerships with well-known enterprises</strong>, we provide <strong className="text-foreground">one-stop procurement solutions</strong> for engineering projects to simplify sourcing and ensure efficient delivery. We also offer flexible <strong className="text-foreground">OEM and ODM services</strong>, including product customization, branding, and packaging, helping partners meet specific project and market requirements.
          </p>
        </div>

        {/* Company Images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-6xl mx-auto">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
            <Image
              src="/company/f1.webp"
              alt="Company facility 1"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
            <Image
              src="/company/f2.webp"
              alt="Company facility 2"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
            <Image
              src="/company/f3.webp"
              alt="Company facility 3"
              fill
              className="object-cover"
            />
          </div>
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
