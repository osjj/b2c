import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MessageCircle, Clock, MapPin, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RequestQuoteButton } from '@/components/store/request-quote-button'

export const metadata: Metadata = {
  title: 'Contact Us | MAISON',
  description: 'Contact our sales team for PPE product inquiries, quotations, and OEM/ODM cooperation.',
}

const contacts = [
  {
    title: 'Email',
    value: 'info@laifappe.com',
    href: 'mailto:info@laifappe.com',
    icon: Mail,
    note: 'For quotations and product catalogs',
  },
  {
    title: 'WhatsApp / WeChat',
    value: '+86 180 2930 9938',
    href: 'https://wa.me/8618029309938',
    icon: MessageCircle,
    note: 'Fast response for urgent requests',
  },
  {
    title: 'Service Hours',
    value: 'Mon-Sat, 09:00-18:00 (UTC+8)',
    href: '',
    icon: Clock,
    note: 'Typical response within 24 hours',
  },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="border-b bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90">
        <div className="container mx-auto px-6 lg:px-8 py-14 md:py-20">
          <p className="text-sm text-primary-foreground/70 mb-3">Contact</p>
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-5">
            Talk To Our PPE Team
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl">
            Tell us your product requirements, target quantity, and delivery timeline. We will provide a clear and practical quotation plan.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <RequestQuoteButton size="lg" className="h-12 px-6">
              Request Quote
            </RequestQuoteButton>
            <Button size="lg" variant="outline" className="h-12 px-6 bg-transparent border-white/30 text-white hover:bg-white hover:text-foreground" asChild>
              <Link href="/products">
                Browse Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 lg:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-5">
          {contacts.map((item) => {
            const Icon = item.icon
            const body = (
              <div className="h-full rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">{item.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{item.note}</p>
                <p className="mt-4 font-medium break-all">{item.value}</p>
              </div>
            )

            if (!item.href) {
              return <div key={item.title}>{body}</div>
            }

            return (
              <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer">
                {body}
              </a>
            )
          })}
        </div>

        <div className="mt-8 rounded-xl border bg-secondary/30 p-6">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Office & Factory</h3>
              <p className="text-muted-foreground mt-1">
                Foshan, Guangdong, China
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                OEM/ODM projects and bulk procurement are supported.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
