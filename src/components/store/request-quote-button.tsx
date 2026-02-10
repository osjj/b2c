'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useQuoteStore } from '@/stores/quote'

type RequestQuoteButtonProps = React.ComponentProps<typeof Button>

export function RequestQuoteButton({
  onClick,
  type,
  ...props
}: RequestQuoteButtonProps) {
  const openQuote = useQuoteStore((state) => state.openQuote)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (!e.defaultPrevented) {
      openQuote()
    }
  }

  return <Button {...props} type={type ?? 'button'} onClick={handleClick} />
}
