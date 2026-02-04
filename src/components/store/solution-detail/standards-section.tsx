import { Award } from 'lucide-react'
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

interface StandardsSectionProps {
  content: EditorJSContent | null
}

export function StandardsSection({ content }: StandardsSectionProps) {
  if (!content?.blocks?.length) return null

  return (
    <section id="standards" className="scroll-mt-20">
      <div className="rounded-lg border border-emerald-200/50 bg-emerald-50/30">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-200/50 bg-emerald-100/40">
          <Award className="h-4 w-4 text-emerald-700" />
          <h2 className="text-sm font-semibold text-emerald-900">Standards & Certifications</h2>
        </div>
        <div className="p-4 text-sm [&_.prose]:prose-sm">
          <ContentRenderer content={content} />
        </div>
      </div>
    </section>
  )
}
