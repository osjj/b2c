'use client'

import { useEffect, useState } from 'react'
import { useQuoteStore, type QuoteItem } from '@/stores/quote'

// Hook to avoid hydration mismatch
export function useQuote() {
  const store = useQuoteStore()
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
    clearQuote: store.clearQuote,
    setQuote: store.setQuote,
    openQuote: store.openQuote,
    closeQuote: store.closeQuote,
    toggleQuote: store.toggleQuote,
    totalItems: isHydrated ? store.getTotalItems() : 0,
    isHydrated,
  }
}

export type { QuoteItem }
