"use client"

import { Star, Quote, MapPin, Building2 } from "lucide-react"

const testimonials = [
  {
    company: "BuildCorp International",
    country: "United States",
    industry: "Construction",
    name: "Michael Chen",
    role: "Procurement Director",
    content:
      "We've been sourcing PPE from PPE Pro for 5 years. Their quality consistency and on-time delivery have been exceptional. The custom branding service is a great bonus. Our workers trust the equipment completely.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    orderVolume: "50,000+ units/year",
  },
  {
    company: "SafetyFirst Distribution",
    country: "Germany",
    industry: "Distribution",
    name: "Sarah Williams",
    role: "CEO",
    content:
      "As a distributor, we need reliable suppliers. PPE Pro's OEM service allows us to offer branded products to our customers. Their R&D team even helped us develop a custom glove line that became our bestseller.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    orderVolume: "100,000+ units/year",
  },
  {
    company: "PetroGlobal Energy",
    country: "UAE",
    industry: "Oil & Gas",
    name: "Ahmed Hassan",
    role: "HSE Manager",
    content:
      "The flame-resistant workwear meets all our strict safety requirements. Their technical support team helped us choose the right products for our offshore operations. Zero incidents since switching to PPE Pro.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    orderVolume: "30,000+ units/year",
  },
  {
    company: "ElectroPower Solutions",
    country: "Australia",
    industry: "Electrical",
    name: "James Thompson",
    role: "Safety Coordinator",
    content:
      "The insulated gloves and arc flash protection gear have exceeded our expectations. Testing certificates are always provided promptly, and the quality control is outstanding. Highly recommend for electrical contractors.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    orderVolume: "20,000+ units/year",
  },
  {
    company: "Nordic Mining Corp",
    country: "Sweden",
    industry: "Mining",
    name: "Erik Lindqvist",
    role: "Operations Manager",
    content:
      "Extreme durability is crucial in mining operations. PPE Pro's safety boots and gloves withstand the harshest conditions. Their team visited our site to understand our specific needs - that dedication is rare.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
    orderVolume: "40,000+ units/year",
  },
  {
    company: "ChemTech Industries",
    country: "Japan",
    industry: "Chemical",
    name: "Yuki Tanaka",
    role: "Plant Manager",
    content:
      "Chemical resistance and comfort are both essential in our facilities. PPE Pro delivered on both fronts. The customized chemical suits they developed for us have become the gold standard in our industry.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    orderVolume: "25,000+ units/year",
  },
  {
    company: "TransGlobal Logistics",
    country: "Netherlands",
    industry: "Logistics",
    name: "Hans de Vries",
    role: "Warehouse Director",
    content:
      "With 5,000+ warehouse workers, we need affordable yet reliable PPE. PPE Pro offers the perfect balance. Their hi-vis vests and safety shoes are comfortable for all-day wear with no complaints from staff.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop",
    orderVolume: "80,000+ units/year",
  },
  {
    company: "AutoMotive Excellence",
    country: "Mexico",
    industry: "Automotive",
    name: "Carlos Rodriguez",
    role: "EHS Director",
    content:
      "Assembly line workers need protection without sacrificing dexterity. The cut-resistant gloves from PPE Pro are thin yet incredibly strong. Production efficiency improved after switching to their products.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    orderVolume: "60,000+ units/year",
  },
]

function TestimonialCard({ testimonial }: { testimonial: (typeof testimonials)[0] }) {
  return (
    <div className="flex-shrink-0 w-[400px] bg-card rounded-xl p-6 border shadow-sm mx-3">
      <Quote className="h-8 w-8 text-primary/20 mb-4" />

      {/* Rating */}
      <div className="flex gap-1 mb-3">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
      </div>

      {/* Content */}
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed line-clamp-4">
        "{testimonial.content}"
      </p>

      {/* Meta Info */}
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span>{testimonial.country}</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          <span>{testimonial.industry}</span>
        </div>
        <span>•</span>
        <span className="text-primary font-medium">{testimonial.orderVolume}</span>
      </div>

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <img
          src={testimonial.image}
          alt={testimonial.name}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/10"
        />
        <div>
          <p className="font-semibold text-sm">{testimonial.name}</p>
          <p className="text-xs text-muted-foreground">{testimonial.role}</p>
          <p className="text-xs text-primary font-medium">{testimonial.company}</p>
        </div>
      </div>
    </div>
  )
}

export default function Testimonials() {
  // 复制一份用于无缝循环
  const duplicatedTestimonials = [...testimonials, ...testimonials]

  return (
    <section className="py-20 overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm tracking-wide uppercase text-primary mb-2 font-medium">
            Testimonials
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Industry Leaders</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join 500+ companies worldwide who trust PPE Pro for their safety equipment needs
          </p>
        </div>
      </div>

      {/* 第一行 - 向左滚动 */}
      <div className="relative mb-6">
        <div className="flex animate-scroll-left">
          {duplicatedTestimonials.map((testimonial, index) => (
            <TestimonialCard key={`row1-${index}`} testimonial={testimonial} />
          ))}
        </div>
      </div>

      {/* 第二行 - 向右滚动 */}
      <div className="relative">
        <div className="flex animate-scroll-right">
          {duplicatedTestimonials.reverse().map((testimonial, index) => (
            <TestimonialCard key={`row2-${index}`} testimonial={testimonial} />
          ))}
        </div>
      </div>

      {/* 统计数据 */}
      <div className="container mx-auto px-6 lg:px-8 mt-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-primary mb-1">500+</div>
            <div className="text-sm text-muted-foreground">Global Clients</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-1">98%</div>
            <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-1">4.9/5</div>
            <div className="text-sm text-muted-foreground">Average Rating</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-1">85%</div>
            <div className="text-sm text-muted-foreground">Repeat Orders</div>
          </div>
        </div>
      </div>

      {/* CSS 动画样式 */}
      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .animate-scroll-left {
          animation: scroll-left 40s linear infinite;
        }

        .animate-scroll-right {
          animation: scroll-right 40s linear infinite;
        }

        .animate-scroll-left:hover,
        .animate-scroll-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
