import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"
import { isQuotationWorkbenchEnabled } from "@/lib/quotation/feature"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login?callbackUrl=/admin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <Sidebar quotationEnabled={isQuotationWorkbenchEnabled()} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader user={session.user} />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
