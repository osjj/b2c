"use client"

import {
  Truck,
  Clock,
  Headphones,
  Palette,
} from "lucide-react"

const services = [
  { icon: Truck, title: "Global Logistics", desc: "DDP/FOB/CIF to 50+ countries" },
  { icon: Clock, title: "Fast Production", desc: "2-4 weeks standard lead time" },
  { icon: Headphones, title: "24/7 Support", desc: "Dedicated account manager" },
  { icon: Palette, title: "OEM/ODM", desc: "Custom design & branding" },
]

export default function TrustBar() {
  return (
    <section className="bg-gradient-to-b from-secondary/60 to-secondary/20 py-6">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((service) => (
            <div
              key={service.title}
              className="flex items-center gap-3 bg-card/80 rounded-lg px-4 py-3 border border-border/50 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <service.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{service.title}</p>
                <p className="text-xs text-muted-foreground truncate">{service.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
