'use client'

import { useEffect } from 'react'
import { useGuestOrdersStore, type GuestOrder } from '@/stores/guest-orders'

interface SaveGuestOrderProps {
  order: GuestOrder
}

export function SaveGuestOrder({ order }: SaveGuestOrderProps) {
  const addOrder = useGuestOrdersStore((state) => state.addOrder)

  useEffect(() => {
    addOrder(order)
  }, [order, addOrder])

  return null
}
