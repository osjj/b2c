import { Header } from "@/components/store/header"
import { Footer } from "@/components/store/footer"
import { DeferredChatWidget } from "@/components/store/deferred-chat-widget"
import { OrganizationJsonLd } from "@/components/seo"
import { getSiteUrl } from "@/lib/site-url"

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

      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <DeferredChatWidget />
      </div>
    </>
  )
}
