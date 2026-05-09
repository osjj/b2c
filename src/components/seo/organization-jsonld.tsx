interface OrganizationJsonLdProps {
  baseUrl: string
}

export function OrganizationJsonLd({ baseUrl }: OrganizationJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Laifappe',
    alternateName: 'YUELAIFA PPE',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description:
      'PPE manufacturer and supplier for safety gloves, safety footwear, workwear, head protection, eye protection, respiratory protection, and fall protection equipment.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'CN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'sales@laifappe.com',
      contactType: 'sales',
      availableLanguage: ['English'],
    },
    sameAs: [],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
