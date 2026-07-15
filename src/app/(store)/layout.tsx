import { OrganizationJsonLd } from "@/components/seo"
import { AttributionLinkTracker } from "@/components/store/attribution-link-tracker"
import { getSiteUrl } from "@/lib/site-url"
import { NewHomeFooter, NewHomeNav, NewHomeShell, NewHomeTopBar } from "@/modules/home-new"

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
        <NewHomeNav />
        <main className="flex-1">{children}</main>
        <NewHomeFooter />
      </NewHomeShell>
    </>
  )
}
