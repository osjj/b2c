function normalizeAltText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? ''
}

export function buildProductImageAlt(input: {
  productName: string
  imageAlt?: string | null
  imageIndex: number
}): string {
  const curatedAlt = normalizeAltText(input.imageAlt)
  if (curatedAlt) return curatedAlt

  const productName = normalizeAltText(input.productName)
  const normalizedIndex = Number.isFinite(input.imageIndex)
    ? Math.max(0, Math.trunc(input.imageIndex))
    : 0
  const galleryPosition = normalizedIndex + 1

  return `${productName} - gallery image ${galleryPosition}`
}
