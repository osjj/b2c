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
  multiple?: boolean
  maxFiles?: number
  label?: string
  buttonLabel?: string
  onUploadingChange?: (uploading: boolean) => boolean | void
  onUploaded: (url: string) => void
}

/** Deliberately excludes the product uploader's AI image generation controls. */
export function CaseDocumentaryUpload({
  id, disabled, multiple = false, maxFiles = 1, label = 'Documentary image file',
  buttonLabel = 'Upload documentary image', onUploadingChange, onUploaded,
}: CaseDocumentaryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)
  const [files, setFiles] = useState<File[]>([])
  const [permission, setPermission] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  function selectionError(selection: File[]) {
    const limit = multiple ? maxFiles : Math.min(1, maxFiles)
    if (selection.length > limit) return `Choose at most ${limit} image${limit === 1 ? '' : 's'}. Remove a gallery image first if more space is needed.`
    if (selection.some((file) => !allowedTypes.has(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024)) {
      return 'Choose nonempty JPEG, PNG, WebP or GIF images no larger than 10 MB each. No files in this selection were uploaded.'
    }
    return ''
  }

  async function upload() {
    if (!files.length || !permission || disabled || uploadingRef.current) return
    const invalid = selectionError(files)
    if (invalid) {
      setError(invalid)
      return
    }
    // The parent synchronously reserves the editor before React updates disabled controls.
    if (onUploadingChange?.(true) === false) return

    uploadingRef.current = true
    setUploading(true)
    setError('')
    setStatus('')
    const failed: File[] = []
    const failures: string[] = []
    let completed = 0
    try {
      for (const [index, file] of files.entries()) {
        setStatus(`Uploading ${index + 1} of ${files.length}: ${file.name}`)
        try {
          const body = new FormData()
          body.append('file', file)
          // Reuse the existing ADMIN-protected documentary image endpoint.
          const response = await fetch('/api/upload', { method: 'POST', body })
          if (!response.ok) {
            failed.push(file)
            failures.push(`${file.name}: Upload failed. Check your administrator session and try again.`)
            continue
          }
          const result = uploadResponseSchema.safeParse(await response.json())
          if (!result.success || new URL(result.data.url).protocol !== 'https:') {
            failed.push(file)
            failures.push(`${file.name}: The upload service returned an invalid image URL.`)
            continue
          }
          onUploaded(result.data.url)
          completed += 1
        } catch {
          failed.push(file)
          failures.push(`${file.name}: Upload could not be confirmed. Check your connection and try again.`)
        }
      }
      // Successful files are never included in a retry, even after partial failure.
      setFiles(failed)
      if (inputRef.current) inputRef.current.value = ''
      setError(failures.join(' '))
      setStatus(completed
        ? `${completed} image${completed === 1 ? '' : 's'} uploaded. Save the case to keep these changes.${failed.length ? ` ${failed.length} failed file${failed.length === 1 ? '' : 's'} retained for retry; successful files will not be uploaded again.` : ''}`
        : 'No images were changed. Failed files are retained for retry.')
    } finally {
      uploadingRef.current = false
      setUploading(false)
      onUploadingChange?.(false)
    }
  }

  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-dashed p-4" aria-busy={uploading}>
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
          I have permission to make {multiple ? 'these redacted images' : 'this redacted image'} publicly accessible.
        </Label>
      </div>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input
        ref={inputRef}
        id={id}
        type="file"
        multiple={multiple}
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={!permission || disabled || uploading}
        aria-describedby={`${id}-notice${multiple ? ` ${id}-limit` : ''}${error ? ` ${id}-error` : ''}`}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          const selection = Array.from(event.target.files ?? [])
          setFiles(selection)
          setError(selectionError(selection))
          setStatus('')
        }}
        className="h-auto min-h-11 py-2 text-xs"
      />
      {multiple ? <p id={`${id}-limit`} className="text-xs text-muted-foreground">Up to {maxFiles} more images · JPEG, PNG, WebP or GIF · 10 MB each</p> : null}
      {files.length ? <ul className="space-y-1 text-xs text-muted-foreground" aria-label="Selected image files">{files.map((file, index) => <li key={`${file.name}-${index}`} className="break-all">{file.name}</li>)}</ul> : null}
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-11 w-full whitespace-normal"
        onClick={upload}
        disabled={!permission || !files.length || disabled || uploading}
      >
        {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
        {uploading ? 'Uploading images…' : buttonLabel}
      </Button>
      {status ? <p role="status" className="break-words text-xs text-muted-foreground">{status}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="break-words text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
