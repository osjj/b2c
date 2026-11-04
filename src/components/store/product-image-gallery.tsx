'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { ProductImage } from '@/types'
import { buildProductImageAlt } from '@/lib/product-image-alt'
import { cn } from '@/lib/utils'

type ProductGalleryImage = Pick<ProductImage, 'id' | 'url' | 'alt'>

interface ProductImageGalleryProps {
  images: ReadonlyArray<ProductGalleryImage>
  productName: string
  hasDiscount?: boolean
  discountPercentage?: number
}

export function ProductImageGallery({
  images,
  productName,
  hasDiscount,
  discountPercentage,
}: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [originalStatus, setOriginalStatus] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const [thumbnailStart, setThumbnailStart] = useState(0)

  const safeCurrentIndex = images.length > 0 ? Math.min(currentIndex, images.length - 1) : 0
  const currentImage = images[safeCurrentIndex]
  const currentImageAlt = currentImage
    ? buildProductImageAlt({
        productName,
        imageAlt: currentImage.alt,
        imageIndex: safeCurrentIndex,
      })
    : ''
  const visibleThumbnailCount = Math.min(images.length, 6)
  const maxThumbnailStart = Math.max(0, images.length - visibleThumbnailCount)
  const safeThumbnailStart = Math.min(thumbnailStart, maxThumbnailStart)
  const visibleThumbnails = images.slice(
    safeThumbnailStart,
    safeThumbnailStart + visibleThumbnailCount
  )
  const hasThumbnailControls = images.length > visibleThumbnailCount

  const selectImage = (nextIndex: number) => {
    if (images.length === 0) return

    const boundedIndex = (nextIndex + images.length) % images.length
    setCurrentIndex(boundedIndex)
    setThumbnailStart((prev) => {
      if (boundedIndex < prev) {
        return boundedIndex
      }
      if (boundedIndex >= prev + visibleThumbnailCount) {
        return Math.min(boundedIndex - visibleThumbnailCount + 1, maxThumbnailStart)
      }
      return Math.min(prev, maxThumbnailStart)
    })
  }

  const goToPrevious = () => {
    selectImage(safeCurrentIndex - 1)
  }

  const goToNext = () => {
    selectImage(safeCurrentIndex + 1)
  }

  const handlePreviewOpenChange = (open: boolean) => {
    if (open) setOriginalStatus('loading')
    setPreviewOpen(open)
  }

  if (images.length === 0) {
    return (
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="group relative aspect-square overflow-hidden bg-white">
        {currentImage && (
          <Dialog open={previewOpen} onOpenChange={handlePreviewOpenChange}>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="View full-size image"
                className="absolute inset-0 w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <Image src={currentImage.url} alt={currentImageAlt} fill className="object-contain" priority />
                <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-black shadow-sm">
                  <Maximize2 className="size-3.5" aria-hidden="true" />
                  View full size
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl gap-3 p-4 sm:p-6">
              <DialogTitle className="pr-8">Product image preview</DialogTitle>
              <DialogDescription className="sr-only">Full-size preview of the selected product image.</DialogDescription>
              <div className="relative h-[min(70dvh,calc(100vw-4rem))] bg-white">
                {originalStatus !== 'loaded' && (
                  <Image src={currentImage.url} alt={currentImageAlt} fill className="object-contain" />
                )}
                {previewOpen && originalStatus !== 'failed' && (
                  // next/image reassigns src with onError and can request the original twice.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentImage.url}
                    alt={currentImageAlt}
                    aria-hidden={originalStatus !== 'loaded'}
                    className={cn(
                      'absolute inset-0 h-full w-full object-contain',
                      originalStatus !== 'loaded' && 'opacity-0'
                    )}
                    onLoad={() => setOriginalStatus('loaded')}
                    onError={() => setOriginalStatus('failed')}
                  />
                )}
              </div>
              {originalStatus === 'loading' && (
                <p role="status" className="text-sm text-muted-foreground">Loading full-size image…</p>
              )}
              {originalStatus === 'failed' && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <p role="status" className="text-muted-foreground">The full-size image could not be loaded.</p>
                  <button
                    type="button"
                    onClick={() => setOriginalStatus('loading')}
                    className="min-h-11 rounded-md border px-3 font-medium hover:bg-muted"
                  >
                    Retry
                  </button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <span className="pointer-events-none absolute top-4 right-4 bg-red-500 text-white text-sm px-3 py-1 z-10">
            -{discountPercentage}%
          </span>
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
            {safeCurrentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Gallery - Smaller Size */}
      {images.length > 1 && (
        <div
          className={cn(
            'grid gap-2',
            hasThumbnailControls
              ? 'grid-cols-[2.25rem_minmax(0,1fr)_2.25rem]'
              : 'grid-cols-1'
          )}
        >
          {hasThumbnailControls && (
            <button
              type="button"
              onClick={goToPrevious}
              className="flex min-h-11 items-center justify-center rounded-md border bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
              aria-label="Show previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <div className="grid grid-cols-6 gap-2">
            {visibleThumbnails.map((image, offset) => {
              const imageIndex = safeThumbnailStart + offset
              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => selectImage(imageIndex)}
                  className={cn(
                    'relative aspect-square overflow-hidden bg-muted transition-all',
                    safeCurrentIndex === imageIndex
                      ? 'ring-2 ring-primary ring-offset-1'
                      : 'hover:ring-2 hover:ring-muted-foreground/30 opacity-70 hover:opacity-100'
                  )}
                  aria-label={`Show image ${imageIndex + 1}`}
                  aria-current={safeCurrentIndex === imageIndex ? 'true' : undefined}
                >
                  <Image
                    src={image.url}
                    alt={buildProductImageAlt({
                      productName,
                      imageAlt: image.alt,
                      imageIndex,
                    })}
                    fill
                    className="object-contain"
                  />
                </button>
              )
            })}
          </div>

          {hasThumbnailControls && (
            <button
              type="button"
              onClick={goToNext}
              className="flex min-h-11 items-center justify-center rounded-md border bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
              aria-label="Show next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
