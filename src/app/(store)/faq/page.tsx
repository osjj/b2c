import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQ | MAISON',
  description: 'Frequently asked questions about products, quotes, shipping, and after-sales support.',
}

const faqs = [
  {
    question: 'How do I request a quotation?',
    answer:
      'You can add products to the quote list and submit the Request Quote form. You can also contact us directly on the contact page for bulk or custom requirements.',
  },
  {
    question: 'What is the minimum order quantity?',
    answer:
      'MOQ depends on product type and customization level. Standard products usually support lower MOQ, while OEM/ODM orders require higher quantities.',
  },
  {
    question: 'Do you support international shipping?',
    answer:
      'Yes. We support international shipments and provide shipping options based on destination, volume, and delivery timeline.',
  },
  {
    question: 'How long does production and delivery take?',
    answer:
      'Lead time varies by product and order size. In-stock items ship faster, while customized products require additional production time.',
  },
  {
    question: 'Can I customize logo and packaging?',
    answer:
      'Yes. We provide OEM/ODM services including logo printing, packaging, and product specification adjustments.',
  },
  {
    question: 'How can I track my order?',
    answer:
      'Use the Order Lookup page or sign in to your account and view My Orders for status updates.',
  },
]

export default function FAQPage() {
  return (
    <div className="container mx-auto px-6 lg:px-8 py-12 md:py-16 max-w-4xl">
      <h1 className="text-3xl md:text-4xl font-bold mb-3">Frequently Asked Questions</h1>
      <p className="text-muted-foreground mb-10">
        Common questions from wholesale and project procurement customers.
      </p>

      <div className="space-y-4">
        {faqs.map((item) => (
          <details key={item.question} className="group rounded-xl border bg-card p-5">
            <summary className="cursor-pointer list-none font-semibold">
              {item.question}
            </summary>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t text-sm">
        <p className="text-muted-foreground">
          Still need help?{' '}
          <Link href="/contact" className="text-primary hover:underline">
            Contact our team
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
