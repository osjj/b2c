'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import type { SimpleImage } from '@/lib/quotation/simple-input'

// Private endpoints intentionally use no-store. Keep only the thumbnails viewed
// during this editor visit in memory, including requests still in progress.
export function useCommonProductThumbnails() {
  const requests = useRef(new Map<string, Promise<string | null>>())
  const urls = useRef(new Set<string>())
  const controllers = useRef(new Set<AbortController>())
  const generation = useRef(0)

  useEffect(() => {
    const cache = requests.current
    const createdUrls = urls.current
    const pending = controllers.current
    return () => {
      generation.current += 1
      pending.forEach((controller) => controller.abort())
      pending.clear()
      cache.clear()
      createdUrls.forEach((url) => URL.revokeObjectURL(url))
      createdUrls.clear()
    }
  }, [])

  return useCallback((image: SimpleImage): Promise<string | null> => {
    const key = `${image.kind}:${image.id}`
    const cached = requests.current.get(key)
    if (cached) return cached
    const currentGeneration = generation.current
    const controller = new AbortController()
    controllers.current.add(controller)
    const request = (async () => {
      try {
        const response = await fetch(`/api/admin/quotation-images/${encodeURIComponent(image.id)}?kind=${image.kind}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok || response.redirected || !/^image\/(png|jpeg)(?:;|$)/i.test(response.headers.get('content-type') ?? '')) return null
        const blob = await response.blob()
        if (generation.current !== currentGeneration) return null
        const url = URL.createObjectURL(blob)
        urls.current.add(url)
        return url
      } catch { return null }
      finally { controllers.current.delete(controller) }
    })()
    requests.current.set(key, request)
    return request
  }, [])
}

export function CommonProductThumbnail({ image, name, load }: {
  image: SimpleImage
  name: string
  load: (image: SimpleImage) => Promise<string | null>
}) {
  const container = useRef<HTMLDivElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    const show = () => {
      if (!active) return
      void load(image).then((source) => {
        if (!active) return
        setUrl(source)
        setFailed(!source)
      })
    }
    if (!container.current || typeof IntersectionObserver === 'undefined') {
      show()
      return () => { active = false }
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      show()
    }, { rootMargin: '160px' })
    observer.observe(container.current)
    return () => { active = false; observer.disconnect() }
  }, [image, load])

  return <div ref={container} className="relative flex h-full w-full items-center justify-center">
    {url && !failed ? <Image unoptimized src={url} alt={name} fill sizes="(max-width: 640px) 100vw, 360px" className="object-contain p-3" onError={() => setFailed(true)} /> : <span className="flex items-center gap-2 text-xs text-slate-400"><ImageIcon aria-hidden="true" className="size-5" />{failed ? '图片暂不可用' : '正在加载图片…'}</span>}
  </div>
}
