'use client'

import { useEffect, useState } from 'react'
import { useCartStore, type CartItem } from '@/stores/cart'

// Hook to avoid hydration mismatch
export function useCart() {
  const store = useCartStore()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return {
    items: isHydrated ? store.items : [],
    isOpen: store.isOpen,
    addItem: store.addItem,
    removeItem: store.removeItem,
    updateQuantity: store.updateQuantity,
    clearCart: store.clearCart,
    setCart: store.setCart,
    openCart: store.openCart,
    closeCart: store.closeCart,
    toggleCart: store.toggleCart,
    totalItems: isHydrated ? store.getTotalItems() : 0,
    totalPrice: isHydrated ? store.getTotalPrice() : 0,
    isHydrated,
  }
}

export type { CartItem }
