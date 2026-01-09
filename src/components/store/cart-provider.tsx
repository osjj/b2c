'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useCartStore } from '@/stores/cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const setCart = useCartStore((state) => state.setCart)

  // Sync cart from server when user logs in
  useEffect(() => {
    if (session?.user) {
      fetch('/api/cart')
        .then((res) => res.json())
        .then((data) => {
          if (data.items) {
            setCart(data.items)
          }
        })
        .catch(console.error)
    }
  }, [session?.user, setCart])

  return <>{children}</>
}
