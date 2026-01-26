import HeroSection from "@/modules/home/components/hero-section"
import TrustBar from "@/modules/home/components/trust-bar"
import CategoryGrid from "@/modules/home/components/category-grid"
import IndustrySolutions from "@/modules/home/components/industry-solutions"
import FeaturedProductsB2B from "@/modules/home/components/featured-products-b2b"
import FactoryShowcase from "@/modules/home/components/factory-showcase"
import AboutCompany from "@/modules/home/components/about-company"
import Testimonials from "@/modules/home/components/testimonials"
import FooterCTA from "@/modules/home/components/footer-cta"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "PPE Pro | Professional PPE Manufacturer for Extreme Environments",
  description:
    "Leading manufacturer of personal protective equipment. Safety gloves, shoes, workwear, and more. CE, ANSI, ISO9001 certified. OEM/ODM services available.",
}

export default function HomePage() {
  return (
    <div className="bg-ppe-bg-page">
      {/* Section 1: Hero */}
      <HeroSection />

      {/* Section 2: About Company */}
      <AboutCompany />

      {/* Section 3: Trust Bar */}
      <TrustBar />

      {/* Section 4: Category Grid */}
      <CategoryGrid />

      {/* Section 5: Industry Solutions */}
      <IndustrySolutions />

      {/* Section 6: Featured Products */}
      <FeaturedProductsB2B />

      {/* Section 7: Factory Showcase */}
      <FactoryShowcase />

      {/* Section 8: Testimonials / Case Studies */}
      <Testimonials />

      {/* Section 9: Footer CTA */}
      <FooterCTA />
    </div>
  )
}
