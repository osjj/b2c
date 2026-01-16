import { auth } from '@/lib/auth'

export default async function AccountPage() {
  const session = await auth()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <div className="bg-muted p-6 rounded-lg">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{session?.user?.name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{session?.user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
