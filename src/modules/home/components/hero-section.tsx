import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Award, Factory } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[72vh] items-center overflow-hidden md:min-h-[82vh]">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        <Image
          src="/company/hero-manufacturing.webp"
          alt="Laifappe PPE manufacturing workshop"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/82 to-background/45" />
      </div>

      <div className="container relative z-10 mx-auto px-6 py-16 lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          {/* Trust badges */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">CE Certified</span>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">ISO 9001:2015</span>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Factory className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">OEM/ODM Available</span>
            </div>
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Professional PPE
            <br />
            <span className="text-primary">Manufacturing Solutions</span>
          </h1>

          <p className="mb-8 max-w-xl text-base text-muted-foreground sm:text-lg">
            Leading manufacturer of personal protective equipment for extreme environments.
            Safety gloves, footwear, workwear and more with global certifications.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="h-12 px-6 text-base sm:h-14 sm:px-8" asChild>
              <Link href="/products">
                View Products
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 border-border/60 bg-background/70 px-6 text-base backdrop-blur sm:h-14 sm:px-8"
              asChild
            >
              <Link href="/contact">Request Quote</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border/50 pt-6 sm:mt-12 sm:gap-8 sm:pt-8">
            <div>
              <div className="text-2xl font-bold text-primary sm:text-3xl">20+</div>
              <div className="text-sm text-muted-foreground">Years Experience</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary sm:text-3xl">50+</div>
              <div className="text-sm text-muted-foreground">Countries Served</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary sm:text-3xl">1M+</div>
              <div className="text-sm text-muted-foreground">Products Annually</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
