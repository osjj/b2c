'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ImagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  alt?: string
}

export function ImagePreviewDialog({
  open,
  onOpenChange,
  src,
  alt = 'Preview image',
}: ImagePreviewDialogProps) {
  const [scale, setScale] = useState(1)

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.25))
  }

  const handleReset = () => {
    setScale(1)
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setScale(1)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-medium">图片预览</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={scale <= 0.25}
              title="缩小"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={scale >= 3}
              title="放大"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleReset}
              title="重置"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative flex items-center justify-center overflow-auto bg-muted/30 min-h-[400px] max-h-[calc(90vh-80px)]">
          <div
            className="transition-transform duration-200 ease-out"
            style={{ transform: `scale(${scale})` }}
          >
            <Image
              src={src}
              alt={alt}
              width={800}
              height={600}
              className="max-w-none object-contain"
              style={{ maxHeight: '70vh' }}
              unoptimized
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
