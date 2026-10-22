export const MAX_COMMON_PRODUCT_IMAGE_INPUT_BYTES = 20 * 1024 * 1024
export const MAX_COMMON_PRODUCT_IMAGE_OUTPUT_BYTES = 5 * 1024 * 1024

const MAX_IMAGE_PIXELS = 40_000_000
const SMALL_IMAGE_BYTES = 512 * 1024
const IMAGE_OPERATION_TIMEOUT_MS = 30_000
const JPEG_QUALITY = 0.92
const LONGEST_EDGE_STEPS = [2560, 2048, 1600, 1280]

type ImageType = 'image/png' | 'image/jpeg'
type DecodedImage = {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

async function validateImageFile(file: File): Promise<ImageType> {
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
    throw new Error('仅支持 PNG 或 JPEG 图片')
  }
  if (!file.size) throw new Error('图片文件为空，请重新选择')
  if (file.size > MAX_COMMON_PRODUCT_IMAGE_INPUT_BYTES) {
    throw new Error('原始图片不能超过 20 MB，请先缩小图片后重试')
  }

  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if ((file.type === 'image/png' && !isPng) || (file.type === 'image/jpeg' && !isJpeg)) {
    throw new Error('图片内容与格式不符，请选择有效的 PNG 或 JPEG 图片')
  }
  return file.type
}

function decodeBitmap(file: File): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      settled = true
      reject(new Error('图片读取超时，请换一张图片或重试'))
    }, IMAGE_OPERATION_TIMEOUT_MS)

    // Browser decoding applies EXIF orientation before dimensions and pixels are used.
    Promise.resolve().then(() => createImageBitmap(file, { imageOrientation: 'from-image' })).then(
      (bitmap) => {
        if (settled) {
          bitmap.close()
          return
        }
        settled = true
        clearTimeout(timeout)
        resolve({
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          release: () => bitmap.close(),
        })
      },
      () => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        reject(new Error('无法读取图片，文件可能已损坏，请重新选择'))
      },
    )
  })
}

function decodeImageElement(file: File): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    let settled = false
    let released = false
    const release = () => {
      if (released) return
      released = true
      image.onload = null
      image.onerror = null
      image.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
    const timeout = setTimeout(() => {
      settled = true
      release()
      reject(new Error('图片读取超时，请换一张图片或重试'))
    }, IMAGE_OPERATION_TIMEOUT_MS)

    image.onload = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      image.onload = null
      image.onerror = null
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, release })
    }
    image.onerror = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      release()
      reject(new Error('无法读取图片，文件可能已损坏，请重新选择'))
    }
    image.decoding = 'async'
    image.src = url
  })
}

function encodeCanvas(canvas: HTMLCanvasElement, type: ImageType): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      settled = true
      reject(new Error('图片压缩超时，请换一张图片或重试'))
    }, IMAGE_OPERATION_TIMEOUT_MS)

    try {
      canvas.toBlob((blob) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (!blob || !blob.size || blob.type !== type) {
          reject(new Error('图片压缩失败，请重新选择图片或使用新版浏览器'))
          return
        }
        resolve(blob)
      }, type, type === 'image/jpeg' ? JPEG_QUALITY : undefined)
    } catch {
      settled = true
      clearTimeout(timeout)
      reject(new Error('图片压缩失败，请重新选择图片或使用新版浏览器'))
    }
  })
}

function hasTransparency(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  const pixels = context.getImageData(0, 0, width, height).data
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] !== 255) return true
  }
  return false
}

function fileWithMatchingExtension(blob: Blob, original: File, type: ImageType): File {
  const extension = type === 'image/png' ? 'png' : 'jpg'
  const matchingExtension = type === 'image/png' ? /\.png$/i : /\.jpe?g$/i
  const name = matchingExtension.test(original.name)
    ? original.name
    : `${original.name.replace(/\.[^.]*$/, '') || 'image'}.${extension}`
  if (blob === original && name === original.name) return original
  return new File([blob], name, { type, lastModified: original.lastModified })
}

/** Prepare a common-product image locally, retaining original bytes when compression is not useful. */
export async function prepareCommonProductImage(file: File): Promise<File> {
  const type = await validateImageFile(file)
  if (typeof document === 'undefined' || (typeof createImageBitmap !== 'function' && typeof Image === 'undefined')) {
    throw new Error('当前浏览器不支持图片压缩，请使用新版浏览器重试')
  }

  const decoded = await (typeof createImageBitmap === 'function' ? decodeBitmap(file) : decodeImageElement(file))
  let canvas: HTMLCanvasElement | undefined
  try {
    const { width, height } = decoded
    if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
      throw new Error('图片尺寸无效或超过 4000 万像素，请缩小图片后重试')
    }
    const longestEdge = Math.max(width, height)
    if (file.size <= SMALL_IMAGE_BYTES && longestEdge <= LONGEST_EDGE_STEPS[0]) {
      return fileWithMatchingExtension(file, file, type)
    }

    canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法处理图片，请使用新版浏览器重试')
    let previousWidth = 0
    let previousHeight = 0
    let transparent: boolean | undefined

    for (const limit of LONGEST_EDGE_STEPS) {
      const scale = Math.min(1, limit / longestEdge)
      const targetWidth = Math.max(1, Math.round(width * scale))
      const targetHeight = Math.max(1, Math.round(height * scale))
      if (targetWidth === previousWidth && targetHeight === previousHeight) continue
      previousWidth = targetWidth
      previousHeight = targetHeight
      canvas.width = targetWidth
      canvas.height = targetHeight
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      try {
        context.drawImage(decoded.source, 0, 0, targetWidth, targetHeight)
        if (type === 'image/png' && transparent === undefined) {
          transparent = hasTransparency(context, targetWidth, targetHeight)
        }
      } catch {
        throw new Error('无法处理图片像素，请重新选择图片或使用新版浏览器')
      }

      let candidate = await encodeCanvas(canvas, type)
      let candidateType = type
      if (type === 'image/png' && !transparent) {
        const jpeg = await encodeCanvas(canvas, 'image/jpeg')
        // Preserve lossless PNG unless JPEG provides a meaningful byte saving.
        if (jpeg.size <= candidate.size * 0.8) {
          candidate = jpeg
          candidateType = 'image/jpeg'
        }
      }
      if (file.size <= MAX_COMMON_PRODUCT_IMAGE_OUTPUT_BYTES && candidate.size > file.size * 0.9) {
        return fileWithMatchingExtension(file, file, type)
      }
      if (candidate.size <= MAX_COMMON_PRODUCT_IMAGE_OUTPUT_BYTES) {
        return fileWithMatchingExtension(candidate, file, candidateType)
      }
    }
    throw new Error('图片压缩后仍超过 5 MB，请裁剪图片或选择较小的图片')
  } finally {
    decoded.release()
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }
}
