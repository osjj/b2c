'use client'

import { useEffect } from 'react'

import { pushDataLayerEvent } from '@/lib/analytics-events'
import {
  normalizeAttributionSource,
  storeRecentAttributionSource,
} from '@/lib/seo-links'

export function AttributionLinkTracker() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return

      const link = event.target.closest<HTMLAnchorElement>(
        'a[data-source], a[data-download-source]',
      )
      if (!link) return

      const source = normalizeAttributionSource(
        link.dataset.source ?? link.dataset.downloadSource,
      )
      if (!source) return

      storeRecentAttributionSource(source)
      pushDataLayerEvent({
        event: 'internal_link_click',
        source,
        link_url: link.href,
        link_path: link.getAttribute('href') ?? link.href,
        asset: link.dataset.downloadAsset,
      })
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return null
}
