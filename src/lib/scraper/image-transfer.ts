import sharp from 'sharp'
import { uploadToR2 } from '@/lib/r2'

interface TransferResult {
  originalUrl: string
  newUrl: string
  success: boolean
  error?: string
}

export async function transferImage(
  imageUrl: string,
  index: number
): Promise<TransferResult> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        Referer: 'https://detail.1688.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      return {
        originalUrl: imageUrl,
        newUrl: imageUrl,
        success: false,
        error: `HTTP ${response.status}`,
      }
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    const processed = await sharp(buffer)
      .resize(2560, 2560, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer()

    const filename = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}.webp`
    const newUrl = await uploadToR2(processed, filename, 'image/webp')

    return { originalUrl: imageUrl, newUrl, success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      originalUrl: imageUrl,
      newUrl: imageUrl,
      success: false,
      error: message,
    }
  }
}

export async function transferImages(
  imageUrls: string[],
  concurrency = 5
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>()
  const unique = [...new Set(imageUrls)]

  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency)
    const results = await Promise.all(
      batch.map((url, idx) => transferImage(url, i + idx))
    )
    for (const r of results) {
      urlMap.set(r.originalUrl, r.success ? r.newUrl : r.originalUrl)
    }
  }

  return urlMap
}
