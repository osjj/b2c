"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, MessageCircle, FileText, Mail } from "lucide-react"

export default function FooterCTA() {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Source Quality PPE?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Get in touch with our team for product inquiries, custom orders, or to request a
            detailed quotation. We're here to help you find the right protection solutions.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button
              size="lg"
              variant="secondary"
              className="h-14 px-8"
              asChild
            >
              <Link href="/contact">
                <MessageCircle className="mr-2 h-5 w-5" />
                Contact Sales
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 bg-transparent border-white/30 text-white hover:bg-white hover:text-primary"
              asChild
            >
              <Link href="/products">
                <FileText className="mr-2 h-5 w-5" />
                View Catalog
              </Link>
            </Button>
          </div>

          {/* Quick Contact Info */}
          <div className="grid sm:grid-cols-3 gap-6 pt-8 border-t border-primary-foreground/20">
            <div>
              <Mail className="h-6 w-6 mx-auto mb-2 opacity-80" />
              <p className="text-sm opacity-80">Email</p>
              <p className="font-semibold">sales@laifappe.com</p>
            </div>
            <div>
              <MessageCircle className="h-6 w-6 mx-auto mb-2 opacity-80" />
              <p className="text-sm opacity-80">WhatsApp</p>
              <p className="font-semibold">+86 180 2930 9938</p>
            </div>
            <div>
              <ArrowRight className="h-6 w-6 mx-auto mb-2 opacity-80" />
              <p className="text-sm opacity-80">Response Time</p>
              <p className="font-semibold">Within 24 hours</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
