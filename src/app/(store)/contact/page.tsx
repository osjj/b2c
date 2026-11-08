import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MessageCircle, Clock, MapPin, ArrowRight, FileText } from 'lucide-react'
import { RequestQuoteButton } from '@/components/store/request-quote-button'
import styles from './contact-page.module.css'

export const metadata: Metadata = {
  title: 'Contact Us | Laifappe',
  description: 'Email Laifappe sales for PPE product inquiries, quotations, catalogs, and OEM/ODM cooperation.',
}

const contacts = [
  {
    title: 'Email Sales',
    value: 'sales@laifappe.com',
    href: 'mailto:sales@laifappe.com',
    icon: Mail,
    note: 'Preferred channel for quotations, catalogs, OEM/ODM projects, and purchase lists.',
    featured: true,
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
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <header className={styles.intro}>
            <p className={styles.kicker}>Contact</p>
            <h1>Talk To Our PPE Team</h1>
            <p className={styles.summary}>
              Email your product requirements, target quantity, and delivery timeline. Our sales team will reply with a clear quotation plan.
            </p>
            <div className={styles.actions}>
              <a className={`${styles.action} ${styles.primary}`} href="mailto:sales@laifappe.com">
                <Mail size={18} aria-hidden="true" />
                Email Sales
              </a>
              <RequestQuoteButton className={styles.action} variant="outline">
                <FileText size={18} aria-hidden="true" />
                Request Quote
              </RequestQuoteButton>
              <Link className={styles.action} href="/products">
                Browse Products
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </header>
          <aside className={styles.office} aria-labelledby="contact-office-title">
            <MapPin size={24} aria-hidden="true" />
            <h2 id="contact-office-title">Office &amp; Factory</h2>
            <p className={styles.officeLocation}>Foshan, Guangdong, China</p>
            <p>OEM/ODM projects and bulk procurement are supported.</p>
          </aside>
        </div>

        <ul className={styles.contacts}>
          {contacts.map((item) => {
            const Icon = item.icon
            const content = (
              <>
                <div className={styles.methodTop}>
                  <Icon size={22} aria-hidden="true" />
                  {item.featured && <span className={styles.preferred}>Preferred</span>}
                </div>
                <h2>{item.title}</h2>
                <p className={styles.value}>{item.value}</p>
                <p className={styles.note}>{item.note}</p>
              </>
            )

            return (
              <li key={item.title} className={item.featured ? styles.featured : undefined}>
                {item.href ? (
                  <a
                    className={styles.method}
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {content}
                  </a>
                ) : (
                  <div className={styles.method}>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
