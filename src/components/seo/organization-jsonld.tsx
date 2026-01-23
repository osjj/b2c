interface OrganizationJsonLdProps {
  baseUrl: string;
}

export function OrganizationJsonLd({ baseUrl }: OrganizationJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PPE Pro",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description:
      "Leading manufacturer of personal protective equipment. Safety gloves, shoes, workwear, and more.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "US",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+1-555-123-4567",
      contactType: "customer service",
      availableLanguage: ["English"],
    },
    sameAs: [
      // 社交媒体链接（根据实际情况配置）
      // "https://facebook.com/ppepro",
      // "https://twitter.com/ppepro",
      // "https://linkedin.com/company/ppepro",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
