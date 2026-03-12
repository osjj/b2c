import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Quote Generator | PPE & Safety Equipment Procurement Tool',
  description:
    'Describe your workforce, job site, and hazards — our AI instantly generates a customized PPE procurement quote matched to your real product catalog. Export to PDF or Excel in seconds.',
  keywords: [
    'PPE quote generator',
    'safety equipment procurement',
    'AI quote tool',
    'personal protective equipment',
    'industrial safety',
    'workplace safety gear',
    'bulk PPE order',
    'safety equipment quote',
  ],
  openGraph: {
    title: 'AI Quote Generator | PPE & Safety Equipment Procurement',
    description:
      'Instantly generate a customized safety equipment quote from a natural language description of your workforce and job site hazards.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Quote Generator | PPE Procurement Tool',
    description:
      'Describe your workforce and job site — get a customized PPE procurement quote in seconds.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/tools/ai-quote',
  },
}

export default function AiQuoteLayout({ children }: { children: React.ReactNode }) {
  return children
}
