import { Sidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO: Add auth check after b2c-auth skill is applied
  // const session = await getServerSession()
  // if (!session?.user || session.user.role !== 'ADMIN') {
  //   redirect('/login')
  // }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
