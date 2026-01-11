'use client'

import { useState, useRef } from 'react'
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
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const currentImage = images[currentIndex]

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
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
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Gallery - Smaller Size */}
      {images.length > 1 && (
        <div className="grid grid-cols-6 gap-2">
          {images.slice(0, 6).map((image, index) => (
            <button
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'relative aspect-square overflow-hidden bg-muted transition-all',
                currentIndex === index
                  ? 'ring-2 ring-primary ring-offset-1'
                  : 'hover:ring-2 hover:ring-muted-foreground/30 opacity-70 hover:opacity-100'
              )}
            >
              <Image
                src={image.url}
                alt={`${productName} ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
