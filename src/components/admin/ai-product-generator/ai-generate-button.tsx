'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AIGenerateDialog } from './ai-generate-dialog'
import type { Category, Collection } from '@prisma/client'
import type { AIGeneratedProduct } from '@/types/ai-generation'

interface AIGenerateButtonProps {
  categories: Category[]
  collections: Collection[]
  onApply: (data: AIGeneratedProduct) => void
}

export function AIGenerateButton({
  categories,
  collections,
  onApply,
}: AIGenerateButtonProps) {
  const [open, setOpen] = useState(false)

  const handleApply = (data: AIGeneratedProduct) => {
    onApply(data)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        AI Generate
      </Button>

      <AIGenerateDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        collections={collections}
        onApply={handleApply}
      />
    </>
  )
}
