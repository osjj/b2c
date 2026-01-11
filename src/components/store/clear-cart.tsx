'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/stores/cart'

export function ClearCart() {
  const clearCart = useCartStore((state) => state.clearCart)

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return null
}
