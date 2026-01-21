'use client'

import { useEffect, useRef, useId, useImperativeHandle, forwardRef, useState, useCallback } from 'react'
import type EditorJS from '@editorjs/editorjs'
import type { OutputData } from '@editorjs/editorjs'
import { ImagePreviewDialog } from './image-preview-dialog'

export interface EditorJSData extends OutputData {}

export interface ContentEditorRef {
  save: () => Promise<EditorJSData | null>
}

interface ContentEditorProps {
  value?: EditorJSData | null
  onChange?: (data: EditorJSData) => void
  placeholder?: string
}

export const ContentEditor = forwardRef<ContentEditorRef, ContentEditorProps>(function ContentEditor(
  { value, onChange, placeholder = 'Start writing product details...' },
  ref
) {
  const editorInstanceRef = useRef<EditorJS | null>(null)
  const holderId = useId().replace(/:/g, '-')
  const onChangeRef = useRef(onChange)
  const initialValue = useRef(value)
  const isInitializedRef = useRef(false)

  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // 处理图片点击事件
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    // 检查是否点击的是图片
    if (target.tagName === 'IMG') {
      const imgSrc = (target as HTMLImageElement).src
      if (imgSrc) {
        setPreviewImage(imgSrc)
      }
    }
  }, [])

  // Expose save method to parent
  useImperativeHandle(ref, () => ({
    async save() {
      if (editorInstanceRef.current) {
        const data = await editorInstanceRef.current.save()
        return data
      }
      return null
    },
  }))

  // Keep onChange ref updated without triggering re-init
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    // 防止重复初始化
    if (isInitializedRef.current) {
      return
    }
    isInitializedRef.current = true

    let editorInstance: EditorJS | null = null
    let isCancelled = false

    const initEditor = async () => {
      // 等待 DOM 渲染完成
      await new Promise(resolve => setTimeout(resolve, 0))

      const holderElement = document.getElementById(holderId)
      if (!holderElement || isCancelled) {
        return
      }

      // 清空容器
      holderElement.innerHTML = ''

      const EditorJS = (await import('@editorjs/editorjs')).default
      const Header = (await import('@editorjs/header')).default
      const List = (await import('@editorjs/list')).default
      const Paragraph = (await import('@editorjs/paragraph')).default
      const Delimiter = (await import('@editorjs/delimiter')).default
      const Quote = (await import('@editorjs/quote')).default
      const ImageTool = (await import('@editorjs/image')).default

      if (isCancelled) {
        return
      }

      const editor = new EditorJS({
        holder: holderId,
        placeholder,
        data: initialValue.current || undefined,
        tools: {
          header: {
            class: Header,
            config: {
              placeholder: 'Enter a header',
              levels: [2, 3, 4],
              defaultLevel: 2,
            },
          },
          list: {
            class: List,
            inlineToolbar: true,
            config: {
              defaultStyle: 'unordered',
            },
          },
          paragraph: {
            class: Paragraph,
            inlineToolbar: true,
          },
          delimiter: Delimiter,
          quote: {
            class: Quote,
            inlineToolbar: true,
            config: {
              quotePlaceholder: 'Enter a quote',
              captionPlaceholder: 'Quote author',
            },
          },
          image: {
            class: ImageTool,
            config: {
              uploader: {
                async uploadByFile(file: File) {
                  const formData = new FormData()
                  formData.append('file', file)

                  const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                  })

                  if (res.ok) {
                    const { url } = await res.json()
                    return {
                      success: 1,
                      file: { url },
                    }
                  }

                  return {
                    success: 0,
                    file: { url: '' },
                  }
                },
              },
            },
          },
        },
        onChange: async () => {
          if (editorInstanceRef.current && onChangeRef.current) {
            const data = await editorInstanceRef.current.save()
            onChangeRef.current(data)
          }
        },
      })

      await editor.isReady

      if (isCancelled) {
        editor.destroy?.()
        return
      }

      editorInstance = editor
      editorInstanceRef.current = editor
    }

    initEditor()

    return () => {
      isCancelled = true
      if (editorInstance) {
        try {
          editorInstance.destroy?.()
        } catch {
          // 忽略销毁错误
        }
      }
      editorInstanceRef.current = null
      isInitializedRef.current = false
    }
  }, [holderId, placeholder])

  return (
    <>
      <div
        className="min-h-[300px] border rounded-md p-4 bg-background"
        onClick={handleImageClick}
      >
        <div id={holderId} className="prose prose-sm max-w-none [&_img]:cursor-pointer [&_img]:transition-opacity [&_img:hover]:opacity-80" />
      </div>

      {/* 图片预览弹框 */}
      <ImagePreviewDialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
        src={previewImage || ''}
        alt="图片预览"
      />
    </>
  )
})
