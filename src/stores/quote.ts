import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface QuoteItem {
  productId: string
  variantId?: string
  name: string
  price: number
  image: string
  quantity: number
  sku?: string
}

interface QuoteStore {
  items: QuoteItem[]
  isOpen: boolean

  // Actions
  addItem: (item: QuoteItem) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearQuote: () => void
  setQuote: (items: QuoteItem[]) => void
  openQuote: () => void
  closeQuote: () => void
  toggleQuote: () => void

  // Computed
  getTotalItems: () => number
}

export const useQuoteStore = create<QuoteStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          )

          if (existingIndex > -1) {
            const newItems = [...state.items]
            newItems[existingIndex].quantity += item.quantity
            return { items: newItems }
          }

          return { items: [...state.items, item] }
        })
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.productId === productId && item.variantId === variantId)
          ),
        }))
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity }
              : item
          ),
        }))
      },

      clearQuote: () => set({ items: [] }),

      setQuote: (items) => set({ items }),

      openQuote: () => set({ isOpen: true }),

      closeQuote: () => set({ isOpen: false }),

      toggleQuote: () => set((state) => ({ isOpen: !state.isOpen })),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
    }),
    {
      name: 'quote-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
)
