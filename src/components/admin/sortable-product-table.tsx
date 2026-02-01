'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GripVertical } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import { ProductActions } from '@/components/admin/product-actions'
import { updateProductsOrder, updateProductSortOrder } from '@/actions/products'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  sku: string | null
  price: number
  stock: number
  sortOrder: number
  isActive: boolean
  images: { url: string }[]
}

interface SortableProductTableProps {
  products: Product[]
}

export function SortableProductTable({ products: initialProducts }: SortableProductTableProps) {
  const [products, setProducts] = useState(initialProducts)

  // Sync with props when they change (e.g., pagination)
  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // Add a small delay to allow the drag image to be captured
    const target = e.currentTarget as HTMLElement
    setTimeout(() => {
      target.style.opacity = '0.5'
    }, 0)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) return

    const newProducts = [...products]
    const draggedProduct = newProducts[dragIndex]

    // Remove from old position and insert at new position
    newProducts.splice(dragIndex, 1)
    newProducts.splice(dropIndex, 0, draggedProduct)

    setProducts(newProducts)
    setDragIndex(null)
    setDragOverIndex(null)

    // Save the new order to the database
    startTransition(async () => {
      try {
        await updateProductsOrder(newProducts.map((p) => p.id))
        toast.success('Product order updated')
      } catch (error) {
        toast.error('Failed to update order')
        // Revert on error
        setProducts(initialProducts)
      }
    })
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleSortOrderChange = (productId: string, newOrder: number) => {
    startTransition(async () => {
      try {
        await updateProductSortOrder(productId, newOrder)
        // Update local state
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, sortOrder: newOrder } : p))
        )
        toast.success('Sort order updated')
      } catch (error) {
        toast.error('Failed to update sort order')
      }
    })
  }

  return (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead className="w-20">Order</TableHead>
            <TableHead className="w-16">Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product, index) => (
            <TableRow
              key={product.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'cursor-move transition-all',
                dragIndex === index && 'opacity-50',
                dragOverIndex === index && 'border-t-2 border-primary',
                isPending && 'pointer-events-none opacity-70'
              )}
            >
              <TableCell>
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min="0"
                  defaultValue={product.sortOrder}
                  className="w-16 h-8 text-center"
                  onBlur={(e) => {
                    const newValue = parseInt(e.target.value, 10)
                    if (!isNaN(newValue) && newValue !== product.sortOrder) {
                      handleSortOrderChange(product.id, newValue)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
              <TableCell>
                <Link href={`/admin/products/${product.id}`}>
                  {product.images[0] ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
                      width={40}
                      height={40}
                      className="rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded" />
                  )}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="font-medium hover:underline"
                >
                  {product.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {product.sku || '-'}
              </TableCell>
              <TableCell>{formatPrice(product.price)}</TableCell>
              <TableCell>
                <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                  {product.stock}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={product.isActive ? 'default' : 'secondary'}>
                  {product.isActive ? 'Active' : 'Draft'}
                </Badge>
              </TableCell>
              <TableCell>
                <ProductActions
                  productId={product.id}
                  isActive={product.isActive}
                />
              </TableCell>
            </TableRow>
          ))}
          {products.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No products found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
