'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductImage {
  id: string
  url: string
}

interface ProductImageGalleryProps {
  images: ProductImage[]
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
  const [isZooming, setIsZooming] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })
  const [thumbnailStart, setThumbnailStart] = useState(0)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const safeCurrentIndex = images.length > 0 ? Math.min(currentIndex, images.length - 1) : 0
  const currentImage = images[safeCurrentIndex]
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setZoomPosition({ x, y })
  }

  const handleMouseEnter = () => {
    setIsZooming(true)
  }

  const handleMouseLeave = () => {
    setIsZooming(false)
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
      {/* Main Image with Zoom */}
      <div
        ref={imageContainerRef}
        className="relative aspect-square overflow-hidden bg-muted cursor-crosshair group"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {currentImage && (
          <>
            {/* Normal Image */}
            <Image
              src={currentImage.url}
              alt={productName}
              fill
              className={cn(
                'object-cover transition-opacity duration-200',
                isZooming && 'opacity-0'
              )}
              priority
            />
            {/* Zoomed Image */}
            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-200',
                isZooming ? 'opacity-100' : 'opacity-0 pointer-events-none'
              )}
              style={{
                backgroundImage: `url(${currentImage.url})`,
                backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                backgroundSize: '200%',
                backgroundRepeat: 'no-repeat',
              }}
            />
          </>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <span className="absolute top-4 right-4 bg-red-500 text-white text-sm px-3 py-1 z-10">
            -{discountPercentage}%
          </span>
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrevious()
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
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
                    alt={`${productName} ${imageIndex + 1}`}
                    fill
                    className="object-cover"
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
