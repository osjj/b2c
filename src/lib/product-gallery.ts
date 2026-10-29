import type { ImageData } from '@/types/image'

export type PromoteProductImageStatus =
  | 'added'
  | 'moved'
  | 'already-primary'

export interface PromoteProductImageResult {
  images: ImageData[]
  status: PromoteProductImageStatus
}

export function promoteToPrimaryProductImage(
  images: readonly ImageData[],
  image: ImageData
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

  return {
    images: [image, ...images],
    status: 'added',
  }
}
