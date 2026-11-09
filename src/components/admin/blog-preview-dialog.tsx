'use client'

import type { MouseEvent } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { BlogContentRenderer } from '@/components/store/blog/blog-content-renderer'
import styles from '@/components/store/blog/blog-layout.module.css'

export interface BlogPreviewSnapshot {
  title: string
  excerpt: string
  coverImage?: string
  content: Parameters<typeof BlogContentRenderer>[0]['content']
}

function keepEditorOpen(event: MouseEvent<HTMLDivElement>) {
  if (event.target instanceof Element && event.target.closest('a')) {
    event.preventDefault()
  }
}

export function BlogPreviewDialog({ snapshot }: { snapshot: BlogPreviewSnapshot }) {
  const { title, excerpt, coverImage, content } = snapshot

  return (
    <DialogContent
      showCloseButton={false}
      className="flex h-[92dvh] w-[calc(100%-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100%-2rem)] motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none motion-reduce:duration-0"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <DialogTitle>Post preview</DialogTitle>
          <DialogDescription className="mt-1">Shows the current form, including unsaved edits.</DialogDescription>
        </div>
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Close post preview">
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
      </div>

      <div
        role="region"
        aria-label="Article content"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2"
        onClickCapture={keepEditorOpen}
        onAuxClickCapture={keepEditorOpen}
      >
        <div className={`${styles.page} ${styles.detailPage}`}>
          <article className={`${styles.frame} [overflow-wrap:anywhere]`}>
            <header className={styles.detailMasthead}>
              <p className={styles.eyebrow}>Safety Guide</p>
              <h2 className={styles.detailTitle}>{title}</h2>
              {excerpt && <p className={styles.detailIntro}>{excerpt}</p>}
            </header>
            <div className={styles.detailGrid} data-toc={false}>
              <div className={styles.detailArticle}>
                {coverImage && (
                  <div className={styles.detailCover}>
                    <Image
                      src={coverImage}
                      alt={title}
                      fill
                      unoptimized
                      sizes="(max-width: 767px) 90vw, 960px"
                      className={styles.coverImage}
                    />
                  </div>
                )}
                <div className={styles.readingSheet}>
                  {content?.blocks.length ? (
                    <BlogContentRenderer content={content} unoptimizedImages />
                  ) : (
                    <p className="text-sm text-muted-foreground">No article content yet.</p>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </DialogContent>
  )
}
