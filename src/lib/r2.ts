import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const R2_ENDPOINT = process.env.R2_ENDPOINT!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'medusa'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com'

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export const r2BucketName = R2_BUCKET_NAME

export function assertR2Configured() {
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 object storage is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.')
  }
}

export async function uploadObjectToR2(
  key: string,
  file: Buffer,
  contentType: string
): Promise<void> {
  assertR2Configured()

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 30_000)
  try {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
      }),
      { abortSignal: ac.signal }
    )
  } finally {
    clearTimeout(timer)
  }
}

export async function deleteObjectFromR2(key: string): Promise<void> {
  assertR2Configured()

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  )
}

export async function getObjectFromR2(key: string) {
  assertR2Configured()

  return r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  )
}

export async function uploadToR2(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const key = `products/${filename}`

  await uploadObjectToR2(key, file, contentType)

  return `${R2_PUBLIC_URL}/${key}`
}

export async function deleteFromR2(url: string): Promise<void> {
  const key = url.replace(`${R2_PUBLIC_URL}/`, '')

  await deleteObjectFromR2(key)
}
