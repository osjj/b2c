"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle, Play } from "lucide-react"

const factoryFeatures = [
  "30,000 sqm production facility",
  "500+ skilled workers",
  "Advanced automated production lines",
  "In-house quality testing lab",
  "ISO 9001:2015 certified",
  "Annual capacity: 10M+ units",
]

const factoryImages = [
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop",
]

export default function FactoryShowcase() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <p className="text-sm tracking-wide uppercase text-primary mb-2 font-medium">
              Our Factory
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              World-Class Manufacturing Facility
            </h2>
            <p className="text-muted-foreground mb-8">
              Our state-of-the-art manufacturing facility combines advanced technology with skilled
              craftsmanship to deliver premium quality PPE products. Every item undergoes rigorous
              quality control before shipment.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {factoryFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href="/about">Learn More About Us</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">
                  <Play className="mr-2 h-4 w-4" />
                  Watch Factory Tour
                </Link>
              </Button>
            </div>
          </div>

          {/* Images Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <img
                src={factoryImages[0]}
                alt="Factory production line"
                className="w-full h-48 object-cover rounded-lg"
              />
              <img
                src={factoryImages[1]}
                alt="Quality control"
                className="w-full h-32 object-cover rounded-lg"
              />
            </div>
            <div className="pt-8">
              <img
                src={factoryImages[2]}
                alt="Warehouse"
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
