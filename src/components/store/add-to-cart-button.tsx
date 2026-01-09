'use client'

import { useState } from 'react'
import { ShoppingBag, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addToCart } from '@/actions/cart'
import { useCartStore } from '@/stores/cart'

interface AddToCartButtonProps extends Omit<React.ComponentProps<typeof Button>, 'onClick'> {
  productId: string
  quantity?: number
  productName?: string
  productPrice?: number
  productImage?: string
  stock?: number
  variantId?: string
}

export function AddToCartButton({
  productId,
  quantity = 1,
  productName,
  productPrice,
  productImage,
  stock,
  variantId,
  children,
  ...props
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const addItem = useCartStore((state) => state.addItem)
  const openCart = useCartStore((state) => state.openCart)

  const handleAddToCart = async () => {
    setIsLoading(true)
    try {
      // Update Zustand store immediately for instant UI feedback
      if (productName && productPrice !== undefined) {
        addItem({
          productId,
          variantId,
          name: productName,
          price: productPrice,
          image: productImage || '',
          quantity,
          stock,
        })
        openCart()
      }

      // Sync with server
      await addToCart(productId, quantity, variantId)
      setIsAdded(true)
      setTimeout(() => setIsAdded(false), 2000)
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleAddToCart} disabled={isLoading} {...props}>
      {isAdded ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Added
        </>
      ) : (
        <>
          <ShoppingBag className="h-4 w-4 mr-2" />
          {children || 'Add to Cart'}
        </>
      )}
    </Button>
  )
}
