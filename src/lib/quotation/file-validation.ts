import { createHash } from 'node:crypto'

import sharp from 'sharp'

import { QuotationError } from './errors'
import { sanitizeQuotationFilename } from './object-keys'

export const MAX_QUOTATION_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_QUOTATION_IMAGE_PIXELS = 40_000_000

type ValidatedQuotationFile = {
  filename: string
  contentType: 'image/png' | 'image/jpeg' | 'image/webp'
  sizeBytes: number
  sha256: string
  bytes: Buffer
}

function detectedImageType(bytes: Buffer): ValidatedQuotationFile['contentType'] | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 12
    && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export async function validateQuotationImage(input: {
  filename: string
  contentType: string
  bytes: Buffer
}): Promise<ValidatedQuotationFile> {
  if (input.bytes.length === 0 || input.bytes.length > MAX_QUOTATION_IMAGE_BYTES) {
    throw new QuotationError('FILE_TOO_LARGE', `Image must be between 1 byte and ${MAX_QUOTATION_IMAGE_BYTES} bytes`)
  }

  const detected = detectedImageType(input.bytes)
  if (!detected || detected !== input.contentType) {
    throw new QuotationError('VALIDATION_FAILED', 'File extension, MIME type, and magic bytes do not agree')
  }

  const filename = sanitizeQuotationFilename(input.filename)
  const extension = filename.toLowerCase().split('.').at(-1)
  const validExtension = (
    (detected === 'image/png' && extension === 'png')
    || (detected === 'image/jpeg' && (extension === 'jpg' || extension === 'jpeg'))
    || (detected === 'image/webp' && extension === 'webp')
  )
  if (!validExtension) {
    throw new QuotationError('VALIDATION_FAILED', 'File extension does not match its content')
  }

  try {
    const metadata = await sharp(input.bytes, {
      failOn: 'warning',
      limitInputPixels: MAX_QUOTATION_IMAGE_PIXELS,
    }).metadata()
    const expectedFormat = detected === 'image/jpeg' ? 'jpeg' : detected.split('/')[1]
    if (
      metadata.format !== expectedFormat
      || !metadata.width
      || !metadata.height
      || metadata.width * metadata.height > MAX_QUOTATION_IMAGE_PIXELS
    ) {
      throw new Error('Image metadata does not match the validated file type')
    }
  } catch {
    throw new QuotationError('VALIDATION_FAILED', 'Image is corrupt or exceeds safe pixel limits')
  }

  return {
    filename,
    contentType: detected,
    sizeBytes: input.bytes.length,
    sha256: createHash('sha256').update(input.bytes).digest('hex'),
    bytes: input.bytes,
  }
}
