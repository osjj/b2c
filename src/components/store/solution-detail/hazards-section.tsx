'use client'

import { AlertTriangle } from 'lucide-react'
import { ContentRenderer } from '@/components/store/content-renderer'

interface EditorJSContent {
  time?: number
  version?: string
  blocks: Array<{
    id: string
    type: string
    data: Record<string, any>
  }>
}

interface HazardsSectionProps {
  content: EditorJSContent | null
}

export function HazardsSection({ content }: HazardsSectionProps) {
  if (!content?.blocks?.length) return null

  return (
    <section id="hazards" className="scroll-mt-28 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Risk Profile
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-serif font-bold">
            Common Hazards
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Key exposure points that shape PPE selection.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          High-risk visibility
        </div>
      </div>
      <div className="mt-6 rounded-2xl border bg-card/90 p-6 md:p-8 shadow-sm">
        <ContentRenderer content={content} />
      </div>
    </section>
  )
}
