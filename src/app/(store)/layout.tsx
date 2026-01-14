import { auth } from "@/lib/auth"
import { Header } from "@/components/store/header"
import { Footer } from "@/components/store/footer"
import { ChatWidget } from "@/components/store/chat"

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session?.user} />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
