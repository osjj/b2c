import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import styles from '../../customer-pages.module.css'

export const metadata: Metadata = {
  title: 'Profile',
}

export default async function AccountPage() {
  const session = await auth()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <div className={`p-6 ${styles.panel}`}>
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
