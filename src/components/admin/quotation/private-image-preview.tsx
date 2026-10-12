'use client'

import type { MouseEventHandler, ReactNode } from 'react'
import Image from 'next/image'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { SimpleImage } from '@/lib/quotation/simple-input'

interface PrivateImagePreviewProps {
  imageId: string
  imageKind: SimpleImage['kind']
  imageName: string
  children: ReactNode
  className?: string
  onTriggerClick?: MouseEventHandler<HTMLButtonElement>
}

export function PrivateImagePreview({ imageId, imageKind, imageName, children, className, onTriggerClick }: PrivateImagePreviewProps) {
  return <Dialog>
    <DialogTrigger asChild>
      <button type="button" data-image-preview-trigger aria-label={`放大查看${imageName}`} onClick={onTriggerClick} className={cn('relative block w-full cursor-zoom-in rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 [-webkit-tap-highlight-color:transparent]', className)}>
        {children}
      </button>
    </DialogTrigger>
    <DialogContent showCloseButton={false} onPaste={(event) => event.stopPropagation()} onDragEnter={(event) => { event.stopPropagation(); if (event.dataTransfer.types.includes('Files')) event.preventDefault() }} onDragOver={(event) => { event.stopPropagation(); if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'none' } }} onDragLeave={(event) => event.stopPropagation()} onDrop={(event) => { event.stopPropagation(); if (event.dataTransfer.types.includes('Files')) event.preventDefault() }} className="h-[min(48rem,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-3 p-4 sm:p-6 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none motion-reduce:duration-0">
      <div className="min-w-0 pr-14">
        <DialogTitle className="leading-6">图片预览</DialogTitle>
        <DialogDescription className="mt-1 line-clamp-2 [overflow-wrap:anywhere]">{imageName}</DialogDescription>
      </div>
      <div className="relative min-h-0 overflow-hidden rounded-lg bg-slate-50">
        {/* Keep ADMIN session cookies on the authenticated private image request. */}
        <Image unoptimized draggable={false} fill src={`/api/admin/quotation-images/${imageId}?kind=${imageKind}`} alt={imageName} className="object-contain" sizes="(max-width: 1024px) 100vw, 1024px" />
      </div>
      <DialogClose asChild><button type="button" aria-label="关闭图片预览" className="absolute right-3 top-3 inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm font-medium text-slate-600 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 [-webkit-tap-highlight-color:transparent]">关闭</button></DialogClose>
    </DialogContent>
  </Dialog>
}
