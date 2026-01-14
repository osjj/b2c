import { NextRequest, NextResponse } from 'next/server'
import { r2Client } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'medusa'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif']
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
  const isFile = ALLOWED_FILE_TYPES.includes(file.type)

  if (!isImage && !isFile) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `chat/${timestamp}-${safeName}`

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  )

  const url = `${R2_PUBLIC_URL}/${key}`

  return NextResponse.json({
    url,
    fileName: file.name,
    fileSize: file.size,
    type: isImage ? 'IMAGE' : 'FILE',
  })
}
