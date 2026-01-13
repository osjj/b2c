"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Award, Factory } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&h=1080&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
      </div>

      <div className="container mx-auto px-6 lg:px-8 relative z-10">
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

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Professional PPE
            <br />
            <span className="text-primary">Manufacturing Solutions</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mb-8">
            Leading manufacturer of personal protective equipment for extreme environments.
            Safety gloves, footwear, workwear and more with global certifications.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="h-14 px-8 text-base" asChild>
              <Link href="/products">
                View Products
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-14 px-8 text-base" asChild>
              <Link href="/contact">Request Quote</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-border/50">
            <div>
              <div className="text-3xl font-bold text-primary">15+</div>
              <div className="text-sm text-muted-foreground">Years Experience</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground">Countries Served</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">1M+</div>
              <div className="text-sm text-muted-foreground">Products Annually</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
