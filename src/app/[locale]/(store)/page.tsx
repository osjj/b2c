import HeroSection from "@/modules/home/components/hero-section"
import TrustBar from "@/modules/home/components/trust-bar"
import CategoryGrid from "@/modules/home/components/category-grid"
import IndustrySolutions from "@/modules/home/components/industry-solutions"
import FeaturedProductsB2B from "@/modules/home/components/featured-products-b2b"
import FactoryShowcase from "@/modules/home/components/factory-showcase"
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

      {/* Section 2: Trust Bar */}
      <TrustBar />

      {/* Section 3: Category Grid */}
      <CategoryGrid />

      {/* Section 4: Industry Solutions */}
      <IndustrySolutions />

      {/* Section 5: Featured Products */}
      <FeaturedProductsB2B />

      {/* Section 6: Factory Showcase */}
      <FactoryShowcase />

      {/* Section 7: Testimonials / Case Studies */}
      <Testimonials />

      {/* Section 8: Footer CTA */}
      <FooterCTA />
    </div>
  )
}
