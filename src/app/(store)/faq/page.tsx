import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../information.module.css'

export const metadata: Metadata = {
  title: 'FAQ | Laifappe',
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
    <div className={styles.page}>
      <div className={styles.reading}>
        <header className={styles.heading}>
          <h1>Frequently Asked Questions</h1>
          <p>Common questions from wholesale and project procurement customers.</p>
        </header>

        <div className={styles.questions}>
          {faqs.map((item) => (
            <details key={item.question}>
              <summary>
                {item.question}
                <span className={styles.questionMark} aria-hidden="true" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>

        <div className={styles.footer}>
          <p>
            Still need help?{' '}
            <Link href="/contact">Contact our team</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
