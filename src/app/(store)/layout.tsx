import { OrganizationJsonLd } from "@/components/seo"
import { AttributionLinkTracker } from "@/components/store/attribution-link-tracker"
import { getSiteUrl } from "@/lib/site-url"
import { NewHomeFooter, NewHomeShell, NewHomeTopBar } from "@/modules/home-new"
import { StorefrontNav } from "@/modules/home-new/components/StorefrontNav"

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const baseUrl = getSiteUrl()

  return (
    <>
      {/* SEO: Organization Structured Data */}
      <OrganizationJsonLd baseUrl={baseUrl} />
      <AttributionLinkTracker />

      <NewHomeShell>
        <NewHomeTopBar />
        <StorefrontNav />
        <main className="flex-1">{children}</main>
        <NewHomeFooter />
      </NewHomeShell>
    </>
  )
}
