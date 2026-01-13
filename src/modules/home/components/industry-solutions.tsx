"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HardHat, Flame, Zap, Droplets, Factory, Truck } from "lucide-react"

const industries = [
  {
    icon: HardHat,
    name: "Construction",
    description: "Complete PPE solutions for construction sites and heavy machinery operation",
    products: ["Hard Hats", "Safety Boots", "Hi-Vis Vests", "Gloves"],
  },
  {
    icon: Flame,
    name: "Oil & Gas",
    description: "Flame-resistant and chemical-resistant equipment for hazardous environments",
    products: ["FR Coveralls", "Chemical Gloves", "Safety Glasses", "Respirators"],
  },
  {
    icon: Zap,
    name: "Electrical",
    description: "Insulated and arc-flash protection for electrical workers",
    products: ["Insulated Gloves", "Arc Flash Suits", "Dielectric Boots", "Face Shields"],
  },
  {
    icon: Droplets,
    name: "Chemical",
    description: "Chemical-resistant PPE for laboratories and processing plants",
    products: ["Chemical Suits", "Goggles", "Respirators", "Nitrile Gloves"],
  },
  {
    icon: Factory,
    name: "Manufacturing",
    description: "Durable protection for assembly lines and production facilities",
    products: ["Cut Gloves", "Safety Shoes", "Ear Protection", "Arm Guards"],
  },
  {
    icon: Truck,
    name: "Logistics",
    description: "Comfortable and visible PPE for warehouse and delivery operations",
    products: ["Hi-Vis Jackets", "Safety Trainers", "Bump Caps", "Grip Gloves"],
  },
]

export default function IndustrySolutions() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Industry Solutions</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tailored PPE packages designed for specific industry requirements and safety standards
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((industry) => (
            <div
              key={industry.name}
              className="bg-card rounded-lg p-6 border hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <industry.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">{industry.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{industry.description}</p>
              <div className="flex flex-wrap gap-2">
                {industry.products.map((product) => (
                  <span
                    key={product}
                    className="text-xs bg-secondary px-2 py-1 rounded"
                  >
                    {product}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button size="lg" asChild>
            <Link href="/contact">Get Custom Solution</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
