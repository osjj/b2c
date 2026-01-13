'use client'

import { useEffect, useRef, useId } from 'react'
import type EditorJS from '@editorjs/editorjs'
import type { OutputData } from '@editorjs/editorjs'

export interface EditorJSData extends OutputData {}

interface ContentEditorProps {
  value?: EditorJSData | null
  onChange?: (data: EditorJSData) => void
  placeholder?: string
}

export function ContentEditor({ value, onChange, placeholder = 'Start writing product details...' }: ContentEditorProps) {
  const editorInstanceRef = useRef<EditorJS | null>(null)
  const holderId = useId().replace(/:/g, '-')
  const onChangeRef = useRef(onChange)
  const initialValue = useRef(value)
  const isInitializing = useRef(false)

  // Keep onChange ref updated without triggering re-init
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (editorInstanceRef.current || isInitializing.current) return

    isInitializing.current = true

    const initEditor = async () => {
      const holderElement = document.getElementById(holderId)
      if (!holderElement) {
        isInitializing.current = false
        return
      }

      // Clear any existing content from previous mount
      holderElement.innerHTML = ''

      const EditorJS = (await import('@editorjs/editorjs')).default
      const Header = (await import('@editorjs/header')).default
      const List = (await import('@editorjs/list')).default
      const Paragraph = (await import('@editorjs/paragraph')).default
      const Delimiter = (await import('@editorjs/delimiter')).default
      const Quote = (await import('@editorjs/quote')).default
      const ImageTool = (await import('@editorjs/image')).default

      // Check again after async imports
      if (editorInstanceRef.current) {
        isInitializing.current = false
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
      editorInstanceRef.current = editor
      isInitializing.current = false
    }

    initEditor()

    return () => {
      const editor = editorInstanceRef.current
      if (editor) {
        // Use setTimeout to avoid destroying during render
        setTimeout(() => {
          if (editor.destroy) {
            editor.destroy()
          }
        }, 0)
        editorInstanceRef.current = null
      }
      isInitializing.current = false
    }
  }, [holderId, placeholder])

  return (
    <div className="min-h-[300px] border rounded-md p-4 bg-background">
      <div id={holderId} className="prose prose-sm max-w-none" />
    </div>
  )
}
