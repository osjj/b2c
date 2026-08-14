import type { ImageData } from '@/types/image'

export const MAX_PRODUCT_GALLERY_IMAGES = 5

export type PromoteProductImageStatus =
  | 'added'
  | 'moved'
  | 'already-primary'
  | 'gallery-full'

export interface PromoteProductImageResult {
  images: ImageData[]
  status: PromoteProductImageStatus
}

export function promoteToPrimaryProductImage(
  images: readonly ImageData[],
  image: ImageData,
  maxImages = MAX_PRODUCT_GALLERY_IMAGES
): PromoteProductImageResult {
  const existingIndex = images.findIndex((candidate) => candidate.url === image.url)

  if (existingIndex === 0) {
    return { images: [...images], status: 'already-primary' }
  }

  if (existingIndex > 0) {
    const existingImage = images[existingIndex]
    return {
      images: [
        existingImage,
        ...images.slice(0, existingIndex),
        ...images.slice(existingIndex + 1),
      ],
      status: 'moved',
    }
  }

  if (images.length >= maxImages) {
    return { images: [...images], status: 'gallery-full' }
  }

  return {
    images: [image, ...images],
    status: 'added',
  }
}
