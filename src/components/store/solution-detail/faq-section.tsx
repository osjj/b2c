'use client'

import { useState } from 'react'
import { HelpCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditorJSContent {
  time?: number
  version?: string
  blocks: Array<{
    id: string
    type: string
    data: Record<string, any>
  }>
}

interface FaqSectionProps {
  content: EditorJSContent | null
}

interface FaqItem {
  question: string
  answer: string
}

function parseFaqFromBlocks(blocks: EditorJSContent['blocks']): FaqItem[] {
  const faqs: FaqItem[] = []
  let currentQuestion = ''

  for (const block of blocks) {
    if (block.type === 'header' && block.data.level === 3) {
      if (currentQuestion) {
        // Save previous if exists without answer
        faqs.push({ question: currentQuestion, answer: '' })
      }
      currentQuestion = block.data.text
    } else if (block.type === 'paragraph' && currentQuestion) {
      faqs.push({ question: currentQuestion, answer: block.data.text })
      currentQuestion = ''
    }
  }

  return faqs.filter(faq => faq.question && faq.answer)
}

function FaqAccordionItem({ faq, isOpen, onToggle }: { faq: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 py-3 px-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm font-medium text-foreground">{faq.question}</span>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all",
        isOpen ? "max-h-96" : "max-h-0"
      )}>
        <p
          className="px-4 pb-3 text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: faq.answer }}
        />
      </div>
    </div>
  )
}

export function FaqSection({ content }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number>(0)

  if (!content?.blocks?.length) return null

  const faqs = parseFaqFromBlocks(content.blocks)
  if (faqs.length === 0) return null

  return (
    <section id="faq" className="scroll-mt-20">
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">FAQ</h2>
          </div>
          <span className="text-xs text-muted-foreground">{faqs.length} questions</span>
        </div>
        <div>
          {faqs.map((faq, index) => (
            <FaqAccordionItem
              key={index}
              faq={faq}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
