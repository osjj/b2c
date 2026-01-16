'use client'

import { useState } from 'react'
import { FileText, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuoteStore } from '@/stores/quote'

interface AddToQuoteButtonProps extends Omit<React.ComponentProps<typeof Button>, 'onClick'> {
  productId: string
  quantity?: number
  productName?: string
  productPrice?: number
  productImage?: string
  sku?: string
  variantId?: string
  tierLabel?: string
}

export function AddToQuoteButton({
  productId,
  quantity = 1,
  productName,
  productPrice,
  productImage,
  sku,
  variantId,
  tierLabel,
  children,
  ...props
}: AddToQuoteButtonProps) {
  const [isAdded, setIsAdded] = useState(false)
  const addItem = useQuoteStore((state) => state.addItem)
  const openQuote = useQuoteStore((state) => state.openQuote)

  const handleAddToQuote = () => {
    if (productName && productPrice !== undefined) {
      addItem({
        productId,
        variantId,
        name: productName,
        price: productPrice,
        image: productImage || '',
        quantity,
        sku,
        tierLabel,
      })
      openQuote()
      setIsAdded(true)
      setTimeout(() => setIsAdded(false), 2000)
    }
  }

  return (
    <Button onClick={handleAddToQuote} {...props}>
      {isAdded ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Added
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2" />
          {children || 'Add to Quote'}
        </>
      )}
    </Button>
  )
}
