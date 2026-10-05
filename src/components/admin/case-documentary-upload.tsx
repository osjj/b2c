'use client'

import { useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const uploadResponseSchema = z.object({ url: z.string().url() })
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

interface CaseDocumentaryUploadProps {
  id: string
  disabled?: boolean
  onUploaded: (url: string) => void
}

/** Deliberately excludes the product uploader's AI image generation controls. */
export function CaseDocumentaryUpload({ id, disabled, onUploaded }: CaseDocumentaryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [permission, setPermission] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function upload() {
    if (!file || !permission || disabled || uploading) return
    if (!allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Choose a JPEG, PNG, WebP or GIF image no larger than 10 MB.')
      return
    }

    setUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      // Reuse the existing ADMIN-protected documentary image endpoint.
      const response = await fetch('/api/upload', { method: 'POST', body })
      if (!response.ok) {
        setError('Upload failed. Check your administrator session and try again.')
        return
      }
      const result = uploadResponseSchema.safeParse(await response.json())
      if (!result.success || new URL(result.data.url).protocol !== 'https:') {
        setError('The upload service returned an invalid image URL.')
        return
      }
      onUploaded(result.data.url)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch {
      setError('Upload failed. Your case content has not been changed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <p className="text-xs leading-relaxed text-muted-foreground" id={`${id}-notice`}>
        Upload only real documentary images that you have permission to publish. Redact faces,
        customer names, addresses, order numbers and other sensitive details first. Image storage
        URLs are public even when the case is a draft. Removing an image here does not delete the
        uploaded file.
      </p>
      <div className="flex items-start gap-3">
        <Checkbox
          id={`${id}-permission`}
          checked={permission}
          disabled={disabled || uploading}
          onCheckedChange={(checked) => setPermission(checked === true)}
          className="mt-1"
        />
        <Label htmlFor={`${id}-permission`} className="min-h-11 cursor-pointer text-xs leading-relaxed">
          I have permission to make this redacted image publicly accessible.
        </Label>
      </div>
      <Label htmlFor={id} className="text-xs">Documentary image file</Label>
      <Input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={!permission || disabled || uploading}
        aria-describedby={`${id}-notice`}
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null)
          setError('')
        }}
        className="h-auto min-h-11 py-2 text-xs"
      />
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        onClick={upload}
        disabled={!permission || !file || disabled || uploading}
      >
        {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
        {uploading ? 'Uploading documentary image…' : 'Upload documentary image'}
      </Button>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
