'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

export function ImageUpload({
  value = [],
  onChange,
  maxImages = 5,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = useCallback(
    async (files: FileList) => {
      if (value.length >= maxImages) return

      setUploading(true)
      const newUrls: string[] = []

      for (const file of Array.from(files)) {
        if (value.length + newUrls.length >= maxImages) break

        const formData = new FormData()
        formData.append('file', file)

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (res.ok) {
            const { url } = await res.json()
            newUrls.push(url)
          }
        } catch (error) {
          console.error('Upload failed:', error)
        }
      }

      onChange([...value, ...newUrls])
      setUploading(false)
    },
    [value, onChange, maxImages]
  )

  const handleRemove = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index)
    onChange(newUrls)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {value.map((url, index) => (
          <div key={url} className="relative aspect-square group">
            <Image
              src={url}
              alt={`Product image ${index + 1}`}
              fill
              className="object-cover rounded-lg"
            />
            <input type="hidden" name="images" value={url} />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {value.length < maxImages && (
          <label
            className={cn(
              'aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors',
              uploading && 'pointer-events-none opacity-50'
            )}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
              disabled={uploading}
            />
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mt-2">
                  Upload
                </span>
              </>
            )}
          </label>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {value.length}/{maxImages} images uploaded
      </p>
    </div>
  )
}
