import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

import { QuotationError } from './errors'

export type QuotationPrivateObject = {
  bytes: Buffer
  contentType: string
  sizeBytes: number
  sha256: string
}

export interface QuotationPrivateStorage {
  readonly provider: 'local' | 'r2-private'
  put(key: string, bytes: Buffer, contentType: string): Promise<QuotationPrivateObject>
  get(key: string, contentType: string): Promise<QuotationPrivateObject>
  move(sourceKey: string, destinationKey: string, contentType: string): Promise<QuotationPrivateObject>
  delete(key: string): Promise<void>
  deletePrefix(prefix: string): Promise<void>
}

function objectMetadata(bytes: Buffer, contentType: string): QuotationPrivateObject {
  return {
    bytes,
    contentType,
    sizeBytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

function assertSafeObjectKey(key: string): void {
  if (!key.startsWith('quotation/') || key.includes('..') || key.includes('\\') || isAbsolute(key)) {
    throw new QuotationError('VALIDATION_FAILED', 'Invalid private object key')
  }
}

class LocalQuotationPrivateStorage implements QuotationPrivateStorage {
  readonly provider = 'local' as const
  private readonly root: string

  constructor(root?: string) {
    this.root = resolve(root || resolve(tmpdir(), 'b2c-quotation-private'))
  }

  private pathFor(key: string): string {
    assertSafeObjectKey(key)
    const target = resolve(this.root, key)
    const pathFromRoot = relative(this.root, target)
    if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
      throw new QuotationError('VALIDATION_FAILED', 'Private object path escaped its root')
    }
    return target
  }

  async put(key: string, bytes: Buffer, contentType: string): Promise<QuotationPrivateObject> {
    const target = this.pathFor(key)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, bytes, { flag: 'wx' })
    return objectMetadata(bytes, contentType)
  }

  async get(key: string, contentType: string): Promise<QuotationPrivateObject> {
    const bytes = await readFile(this.pathFor(key))
    return objectMetadata(bytes, contentType)
  }

  async move(sourceKey: string, destinationKey: string, contentType: string): Promise<QuotationPrivateObject> {
    const source = this.pathFor(sourceKey)
    const destination = this.pathFor(destinationKey)
    await mkdir(dirname(destination), { recursive: true })
    await rename(source, destination)
    return this.get(destinationKey, contentType)
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true })
  }

  async deletePrefix(prefix: string): Promise<void> {
    if (!prefix.endsWith('/')) throw new QuotationError('VALIDATION_FAILED', 'Private object prefix must end with a slash')
    await rm(this.pathFor(prefix), { recursive: true, force: true })
  }
}

class R2QuotationPrivateStorage implements QuotationPrivateStorage {
  readonly provider = 'r2-private' as const
  private readonly client: S3Client
  private readonly bucket: string

  constructor(environment: NodeJS.ProcessEnv) {
    const endpoint = environment.QUOTATION_PRIVATE_R2_ENDPOINT
    const accessKeyId = environment.QUOTATION_PRIVATE_R2_ACCESS_KEY_ID
    const secretAccessKey = environment.QUOTATION_PRIVATE_R2_SECRET_ACCESS_KEY
    const bucket = environment.QUOTATION_PRIVATE_R2_BUCKET
    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new QuotationError('FEATURE_DISABLED', 'Private quotation storage is not configured')
    }
    this.bucket = bucket
    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  async put(key: string, bytes: Buffer, contentType: string): Promise<QuotationPrivateObject> {
    assertSafeObjectKey(key)
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: contentType }))
    return objectMetadata(bytes, contentType)
  }

  async get(key: string, contentType: string): Promise<QuotationPrivateObject> {
    assertSafeObjectKey(key)
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
    if (!response.Body) throw new QuotationError('NOT_FOUND', 'Private quotation file not found')
    const bytes = Buffer.from(await response.Body.transformToByteArray())
    return objectMetadata(bytes, response.ContentType ?? contentType)
  }

  async move(sourceKey: string, destinationKey: string, contentType: string): Promise<QuotationPrivateObject> {
    const source = await this.get(sourceKey, contentType)
    await this.put(destinationKey, source.bytes, contentType)
    await this.delete(sourceKey)
    return source
  }

  async delete(key: string): Promise<void> {
    assertSafeObjectKey(key)
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async deletePrefix(prefix: string): Promise<void> {
    assertSafeObjectKey(prefix)
    if (!prefix.endsWith('/')) throw new QuotationError('VALIDATION_FAILED', 'Private object prefix must end with a slash')
    let continuationToken: string | undefined
    do {
      const page = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }))
      const objects = (page.Contents ?? []).flatMap((object) => object.Key ? [{ Key: object.Key }] : [])
      if (objects.length) {
        await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: objects, Quiet: true } }))
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (continuationToken)
  }
}

export function getQuotationPrivateStorage(
  environment: NodeJS.ProcessEnv = process.env,
): QuotationPrivateStorage {
  const provider = environment.QUOTATION_PRIVATE_STORAGE_PROVIDER ?? 'local'
  if (provider === 'local') {
    if (environment.NODE_ENV === 'production') {
      throw new QuotationError('FEATURE_DISABLED', 'Local quotation storage is disabled in production')
    }
    return new LocalQuotationPrivateStorage(environment.QUOTATION_PRIVATE_LOCAL_ROOT)
  }
  if (provider === 'r2-private') return new R2QuotationPrivateStorage(environment)
  throw new QuotationError('FEATURE_DISABLED', 'Unknown private quotation storage provider')
}
