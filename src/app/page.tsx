import type { Metadata } from "next"
import { OrganizationJsonLd } from "@/components/seo"
import { getSiteUrl } from "@/lib/site-url"
import { buildPageTitle } from "@/lib/seo-title"
import { NewHomePage } from "@/modules/home-new"

const title = buildPageTitle("Professional PPE Manufacturer & OEM Supplier")
const description =
  "Laifappe manufactures professional PPE for bulk buyers, including safety gloves, footwear, workwear, helmets, and respiratory protection with OEM/ODM service."

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: getSiteUrl(),
    title,
    description,
    images: [
      {
        url: "/og-image-main.webp",
        width: 1200,
        height: 630,
        alt: "Laifappe PPE Factory Production Line",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image-main.webp"],
  },
}

export default function HomePage() {
  const baseUrl = getSiteUrl()

  return (
    <>
      <OrganizationJsonLd baseUrl={baseUrl} />
      <NewHomePage />
    </>
  )
}
