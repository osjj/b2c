'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GuestOrder {
  orderId: string
  orderNumber: string
  email: string
  total: number
  createdAt: string
}

interface GuestOrdersStore {
  orders: GuestOrder[]
  addOrder: (order: GuestOrder) => void
  removeOrder: (orderId: string) => void
  clearOrders: () => void
  getOrders: () => GuestOrder[]
}

export const useGuestOrdersStore = create<GuestOrdersStore>()(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (order) => {
        set((state) => {
          // Avoid duplicates
          const exists = state.orders.some((o) => o.orderId === order.orderId)
          if (exists) return state
          return { orders: [order, ...state.orders] }
        })
      },

      removeOrder: (orderId) => {
        set((state) => ({
          orders: state.orders.filter((o) => o.orderId !== orderId),
        }))
      },

      clearOrders: () => set({ orders: [] }),

      getOrders: () => get().orders,
    }),
    {
      name: 'guest-orders',
    }
  )
)
