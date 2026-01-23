import { auth } from "@/lib/auth"
import { Header } from "@/components/store/header"
import { Footer } from "@/components/store/footer"
import { ChatWidget } from "@/components/store/chat"
import { OrganizationJsonLd } from "@/components/seo"

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  return (
    <>
      {/* SEO: Organization Structured Data */}
      <OrganizationJsonLd baseUrl={baseUrl} />

      <div className="flex min-h-screen flex-col">
        <Header user={session?.user} />
        <main className="flex-1">{children}</main>
        <Footer />
        <ChatWidget />
      </div>
    </>
  )
}
