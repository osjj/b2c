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
    <section id="hazards" className="scroll-mt-20">
      <div className="rounded-lg border border-red-200/50 bg-red-50/30">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-200/50 bg-red-100/40">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h2 className="text-sm font-semibold text-red-900">Common Hazards</h2>
        </div>
        <div className="p-4 text-sm [&_.prose]:prose-sm">
          <ContentRenderer content={content} />
        </div>
      </div>
    </section>
  )
}
