'use client'

import Image from 'next/image'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { calculateQuoteTotal } from '@/lib/ai-quote'
import { cn } from '@/lib/utils'
import type { QuoteItem } from '@/types/ai-quote'

interface QuoteTableProps {
  items: QuoteItem[]
  onChange: (items: QuoteItem[]) => void
}

export function QuoteTable({ items, onChange }: QuoteTableProps) {
  const total = calculateQuoteTotal(items)

  const updateQuantity = (index: number, value: string) => {
    const quantity = Number.parseInt(value, 10)
    if (!Number.isFinite(quantity)) return
    onChange(
      items.map((item, currentIndex) =>
        currentIndex === index ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    )
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-white shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)]">
      <Table>
        <TableHeader className="bg-foreground text-primary-foreground">
          <TableRow className="border-none hover:bg-transparent">
            <TableHead className="h-12 px-5 text-primary-foreground">Product</TableHead>
            <TableHead className="px-4 text-right text-primary-foreground">Unit Price</TableHead>
            <TableHead className="px-4 text-center text-primary-foreground">Qty</TableHead>
            <TableHead className="px-4 text-right text-primary-foreground">Subtotal</TableHead>
            <TableHead className="w-14 px-4 text-primary-foreground" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={`${item.productId}-${index}`} className="group align-top">
              <TableCell className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-secondary">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        PPE
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground leading-snug">{item.name}</div>
                    <p
                      title={item.reason}
                      className="mt-1 text-sm leading-5 text-muted-foreground line-clamp-2 group-hover:line-clamp-none transition-all duration-200"
                    >
                      {item.reason}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-4 py-4 text-right font-medium whitespace-nowrap">
                ¥{item.price.toFixed(2)}
              </TableCell>
              <TableCell className="px-4 py-4 text-center">
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => updateQuantity(index, event.target.value)}
                  className={cn(
                    'mx-auto h-9 w-18 rounded-full border-border/60 bg-background text-center',
                    'focus-visible:ring-primary/30'
                  )}
                />
              </TableCell>
              <TableCell className="px-4 py-4 text-right font-semibold whitespace-nowrap">
                ¥{(item.price * item.quantity).toFixed(2)}
              </TableCell>
              <TableCell className="px-4 py-4 text-right">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="bg-secondary/50">
          <TableRow>
            <TableCell
              colSpan={3}
              className="px-5 py-4 text-right text-sm uppercase tracking-[0.2em] text-muted-foreground"
            >
              Total
            </TableCell>
            <TableCell className="px-4 py-4 text-right text-lg font-semibold text-primary">
              ¥{total.toFixed(2)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
