'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Copy, ExternalLink, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type UploadStatus = 'uploading' | 'done' | 'error'

interface ImageToolItem {
  id: string
  fileName: string
  originalSize: number
  status: UploadStatus
  url?: string
  returnedSize?: number
  error?: string
}

interface UploadSuccessResponse {
  url: string
  size?: number
  originalSize?: number
}

interface UploadErrorResponse {
  error: string
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

export function ImageCompressionTool() {
  const [items, setItems] = useState<ImageToolItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (selectedFiles.length === 0) {
      return
    }

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length !== selectedFiles.length) {
      toast.error('Only image files can be uploaded.')
    }

    if (imageFiles.length === 0) {
      return
    }

    const nextItems = imageFiles.map((file) => ({
      id: createUploadId(file),
      fileName: file.name,
      originalSize: file.size,
      status: 'uploading' as const,
    }))

    setItems((currentItems) => [...nextItems, ...currentItems])
    setIsUploading(true)

    await Promise.all(
      imageFiles.map((file, index) => uploadImage(file, nextItems[index].id))
    )

    setIsUploading(false)
  }

  const uploadImage = async (file: File, itemId: string) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const result: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const errorMessage = isUploadErrorResponse(result)
          ? result.error
          : `Upload failed with status ${response.status}.`
        markUploadError(itemId, errorMessage)
        toast.error(errorMessage)
        return
      }

      if (!isUploadSuccessResponse(result)) {
        const errorMessage = 'Upload succeeded but no image URL was returned.'
        markUploadError(itemId, errorMessage)
        toast.error(errorMessage)
        return
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: 'done',
                url: result.url,
                returnedSize: result.size,
              }
            : item
        )
      )
      toast.success('Image converted to WebP.')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed.'
      markUploadError(itemId, errorMessage)
      toast.error(errorMessage)
    }
  }

  const markUploadError = (itemId: string, errorMessage: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: 'error',
              error: errorMessage,
            }
          : item
      )
    )
  }

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url)
    toast.success('Image URL copied.')
  }

  const removeItem = (itemId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Image Compression Tool</CardTitle>
        <CardDescription>
          Upload images, convert them to compressed WebP files, and copy the returned URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-dashed bg-muted/20 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Label htmlFor="imageToolUpload" className="text-base font-medium">
                Upload images
              </Label>
              <p className="text-sm text-muted-foreground">
                Supports JPG, PNG, WebP, and GIF. Each file follows the existing 10MB upload limit.
              </p>
            </div>
            <Input
              ref={fileInputRef}
              id="imageToolUpload"
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              onChange={handleFilesSelected}
              className="hidden"
              disabled={isUploading}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploading ? 'Uploading' : 'Choose Images'}
            </Button>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-[96px_minmax(0,1fr)_auto]"
              >
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                  {item.url ? (
                    <Image
                      src={item.url}
                      alt={item.fileName}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate font-medium">{item.fileName}</p>
                    <Badge variant={item.status === 'error' ? 'destructive' : 'secondary'}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span>Original size: {formatFileSize(item.originalSize)}</span>
                    {typeof item.returnedSize === 'number' && (
                      <span className="ml-3">
                        Returned WebP size: {formatFileSize(item.returnedSize)}
                      </span>
                    )}
                  </div>

                  {item.url && (
                    <div className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
                      <code className="min-w-0 flex-1 truncate text-xs">{item.url}</code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (item.url) {
                            void copyUrl(item.url)
                          }
                        }}
                        aria-label={`Copy URL for ${item.fileName}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {item.error && (
                    <p className="text-sm text-destructive">{item.error}</p>
                  )}
                </div>

                <div className="flex items-start gap-2 md:justify-end">
                  {item.url && (
                    <Button type="button" variant="outline" size="sm" asChild>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </a>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.fileName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-40 items-center justify-center rounded-lg border bg-muted/10 px-6 text-center">
            <div className="space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No images uploaded yet</p>
              <p className="text-sm text-muted-foreground">
                Converted WebP URLs will appear here after upload.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function createUploadId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round((bytes / 1024) * 10) / 10}KB`
  }

  return `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`
}

function getStatusLabel(status: UploadStatus) {
  if (status === 'uploading') {
    return 'Converting'
  }

  if (status === 'done') {
    return 'WebP Ready'
  }

  return 'Failed'
}

function isUploadSuccessResponse(value: unknown): value is UploadSuccessResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'url' in value &&
    typeof value.url === 'string'
  )
}

function isUploadErrorResponse(value: unknown): value is UploadErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  )
}
