'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Pencil, Archive, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { archiveProduct, deleteProduct } from '@/actions/products'
import { toast } from 'sonner'

interface ProductActionsProps {
  productId: string
  isActive: boolean
}

export function ProductActions({ productId, isActive }: ProductActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleArchive = () => {
    startTransition(async () => {
      try {
        await archiveProduct(productId)
        toast.success('Product archived')
      } catch (error) {
        toast.error('Failed to archive product')
      }
    })
  }

  const handleRestore = () => {
    startTransition(async () => {
      try {
        // We'll use a simple update to restore
        const response = await fetch(`/api/admin/products/${productId}/restore`, {
          method: 'POST',
        })
        if (!response.ok) throw new Error('Failed to restore')
        toast.success('Product restored')
        window.location.reload()
      } catch (error) {
        toast.error('Failed to restore product')
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteProduct(productId)
        toast.success('Product permanently deleted')
        setShowDeleteDialog(false)
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete product')
        setShowDeleteDialog(false)
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/products/${productId}`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isActive ? (
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleRestore}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The product and all its images will be permanently deleted.
              <br /><br />
              <strong>Note:</strong> Products with order history cannot be deleted. Use Archive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
