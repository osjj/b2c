'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  ChevronLeft, ChevronRight, FlipHorizontal2, FlipVertical2, Maximize2,
  RotateCcw, RotateCw, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { ProductImage } from '@/types'
import { buildProductImageAlt } from '@/lib/product-image-alt'
import { cn } from '@/lib/utils'
import styles from './product-detail.module.css'

type ProductGalleryImage = Pick<ProductImage, 'id' | 'url' | 'alt'>

interface ProductImageGalleryProps {
  images: ReadonlyArray<ProductGalleryImage>
  productName: string
  hasDiscount?: boolean
  discountPercentage?: number
  catalog?: boolean
}

const MIN_ZOOM = 100
const MAX_ZOOM = 400
const ZOOM_STEP = 25
const MAIN_IMAGE_SIZES = '(min-width: 96rem) 54rem, (min-width: 80rem) 44rem, (min-width: 64rem) 34rem, calc(100vw - 2rem)'
const THUMBNAIL_SIZES = '(min-width: 96rem) 9rem, (min-width: 80rem) 7.5rem, (min-width: 64rem) 6rem, 16vw'
const CATALOG_IMAGE_SIZES = '(min-width: 90rem) 43rem, (min-width: 48rem) 48vw, calc(100vw - 2rem)'
const CATALOG_THUMBNAIL_SIZES = '(min-width: 90rem) 8.5rem, (min-width: 48rem) 10vw, 18vw'

function ProductImagePreview({ src, alt }: { src: string; alt: string }) {
  const [originalStatus, setOriginalStatus] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const [orientation, setOrientation] = useState({ turns: 0, flipX: false, flipY: false })
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const stageRef = useRef<HTMLDivElement>(null)
  const previousZoom = useRef(zoom)

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (stage && zoom !== previousZoom.current) {
      const ratio = zoom / previousZoom.current
      const centerX = stage.clientWidth / 2
      const centerY = stage.clientHeight / 2
      stage.scrollLeft = (stage.scrollLeft + centerX) * ratio - centerX
      stage.scrollTop = (stage.scrollTop + centerY) * ratio - centerY
    }
    previousZoom.current = zoom
  }, [zoom])

  const rotate = (direction: -1 | 1) => {
    setOrientation(({ turns, flipX, flipY }) => ({
      turns: (turns + direction + 4) % 4,
      // Screen-relative flip axes swap when the image rotates by a quarter turn.
      flipX: flipY,
      flipY: flipX,
    }))
  }

  const controls = [
    { label: 'Flip vertically', Icon: FlipVertical2, pressed: orientation.flipY, action: () => setOrientation(view => ({ ...view, flipY: !view.flipY })) },
    { label: 'Flip horizontally', Icon: FlipHorizontal2, pressed: orientation.flipX, action: () => setOrientation(view => ({ ...view, flipX: !view.flipX })) },
    { label: 'Rotate left', Icon: RotateCcw, action: () => rotate(-1) },
    { label: 'Rotate right', Icon: RotateCw, action: () => rotate(1) },
    { label: 'Zoom out', Icon: ZoomOut, disabled: zoom === MIN_ZOOM, action: () => setZoom(value => Math.max(MIN_ZOOM, value - ZOOM_STEP)) },
    { label: 'Zoom in', Icon: ZoomIn, disabled: zoom === MAX_ZOOM, action: () => setZoom(value => Math.min(MAX_ZOOM, value + ZOOM_STEP)) },
  ]
  const sideways = orientation.turns % 2 === 1

  return (
    <>
      <div className="flex shrink-0 items-center justify-center border-b bg-background py-1 md:justify-between">
        <DialogTitle className="sr-only md:not-sr-only md:pl-4">Product image preview</DialogTitle>
        <DialogDescription className="sr-only">
          Flip, rotate or zoom the selected product image. Scroll the image area to view more detail when zoomed in.
        </DialogDescription>
        <div role="group" aria-label="Image controls" className="flex flex-wrap justify-center md:px-2">
          {controls.map(({ label, Icon, action, pressed, disabled }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={label}
              aria-pressed={pressed}
              title={label}
              disabled={disabled}
              onClick={action}
              className="size-11 aria-pressed:bg-accent"
            >
              <Icon className="size-5" aria-hidden="true" />
            </Button>
          ))}
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" title="Close" className="size-11">
              <X className="size-5" aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-muted/40 [container-type:size]">
        <div
          ref={stageRef}
          data-product-image-stage
          role="region"
          aria-label="Product image"
          tabIndex={0}
          className="absolute inset-0 overflow-auto overscroll-contain focus-visible:outline-ring focus-visible:-outline-offset-2"
        >
          <div className="relative overflow-hidden" style={{ width: `${zoom}cqw`, height: `${zoom}cqh` }}>
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                width: sideways ? `${zoom}cqh` : '100%',
                height: sideways ? `${zoom}cqw` : '100%',
                transform: `translate(-50%, -50%) scale(${orientation.flipX ? -1 : 1}, ${orientation.flipY ? -1 : 1}) rotate(${orientation.turns * 90}deg)`,
              }}
            >
              {originalStatus !== 'loaded' && (
                <Image src={src} alt={alt} fill sizes={MAIN_IMAGE_SIZES} className="object-contain" />
              )}
              {originalStatus !== 'failed' && (
                // next/image reassigns src with onError and can request the original twice.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={alt}
                  aria-hidden={originalStatus !== 'loaded'}
                  className={cn('absolute inset-0 h-full w-full object-contain', originalStatus !== 'loaded' && 'opacity-0')}
                  onLoad={() => setOriginalStatus('loaded')}
                  onError={() => setOriginalStatus('failed')}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {originalStatus === 'loading' && (
        <p role="status" className="shrink-0 border-t px-4 py-2 text-sm text-muted-foreground">Loading full-size image…</p>
      )}
      {originalStatus === 'failed' && (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t px-4 py-2 text-sm">
          <p role="status" className="text-muted-foreground">The full-size image could not be loaded.</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setOriginalStatus('loading')}>
            Retry
          </Button>
        </div>
      )}
    </>
  )
}

export function ProductImageGallery({
  images,
  productName,
  hasDiscount,
  discountPercentage,
  catalog = false,
}: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
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
  const visibleThumbnailCount = Math.min(images.length, catalog ? 5 : 6)
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

  if (images.length === 0) {
    return (
      <div className={catalog ? styles.gallery : 'space-y-3'}>
        <div className={cn('relative overflow-hidden', catalog ? styles.galleryStage : 'aspect-square bg-muted')}>
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={catalog ? styles.gallery : 'space-y-3'}>
      <div className={cn('group relative overflow-hidden', catalog ? styles.galleryStage : 'aspect-square bg-white')}>
        {currentImage && (
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="View full-size image"
                className="absolute inset-0 w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <Image
                  src={currentImage.url}
                  alt={currentImageAlt}
                  fill
                  sizes={catalog ? CATALOG_IMAGE_SIZES : MAIN_IMAGE_SIZES}
                  className="object-contain"
                  priority
                />
                <span className={cn('absolute right-3 bottom-3 flex items-center gap-1.5 bg-white/95 px-3 py-1.5 text-xs font-medium text-black', catalog ? styles.zoomLabel : 'rounded-full shadow-sm')}>
                  <Maximize2 className="size-3.5" aria-hidden="true" />
                  View full size
                </span>
              </button>
            </DialogTrigger>
            <DialogContent
              showCloseButton={false}
              overlayClassName="z-[1100]"
              className="z-[1101] flex h-[min(92dvh,72rem)] w-[calc(100%-0.5rem)] max-w-[90rem] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100%-2rem)] motion-reduce:animate-none"
            >
              {previewOpen && (
                <ProductImagePreview key={currentImage.url} src={currentImage.url} alt={currentImageAlt} />
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <span className={cn('pointer-events-none absolute top-4 right-4 text-white text-sm px-3 py-1 z-10', catalog ? styles.galleryDiscount : 'bg-red-500')}>
            -{discountPercentage}%
          </span>
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white flex items-center justify-center transition-opacity z-10', catalog ? styles.galleryArrow : 'rounded-full shadow-md opacity-0 group-hover:opacity-100')}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className={cn('absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white flex items-center justify-center transition-opacity z-10', catalog ? styles.galleryArrow : 'rounded-full shadow-md opacity-0 group-hover:opacity-100')}
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className={cn('pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 z-10', !catalog && 'rounded-full')}>
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
              className={cn('flex min-h-11 items-center justify-center transition-colors', catalog ? styles.thumbnailArrow : 'rounded-md border bg-background text-foreground shadow-sm hover:bg-muted')}
              aria-label="Show previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <div className={cn('grid gap-2', catalog ? 'grid-cols-5' : 'grid-cols-6')}>
            {visibleThumbnails.map((image, offset) => {
              const imageIndex = safeThumbnailStart + offset
              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => selectImage(imageIndex)}
                  className={cn(
                    'relative overflow-hidden transition-colors',
                    catalog
                      ? styles.thumbnail
                      : cn(
                          'aspect-square bg-muted',
                          safeCurrentIndex === imageIndex
                            ? 'ring-2 ring-primary ring-offset-1'
                            : 'hover:ring-2 hover:ring-muted-foreground/30 opacity-70 hover:opacity-100'
                        )
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
                    sizes={catalog ? CATALOG_THUMBNAIL_SIZES : THUMBNAIL_SIZES}
                    loading="lazy"
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
              className={cn('flex min-h-11 items-center justify-center transition-colors', catalog ? styles.thumbnailArrow : 'rounded-md border bg-background text-foreground shadow-sm hover:bg-muted')}
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
