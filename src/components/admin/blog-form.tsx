'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import { createBlogPost, updateBlogPost, type BlogPostState } from '@/actions/admin/blog'
import { generateSlug } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUpload } from './image-upload'
import { ContentEditor, type EditorJSData, type ContentEditorRef } from './content-editor'
import type { ImageData } from '@/types/image'

interface BlogPostRecord {
  id: string
  slug: string
  title: string
  excerpt: string | null
  coverImage: string | null
  content: unknown
  isPublished: boolean
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
}

interface BlogFormProps {
  post?: BlogPostRecord
}

export function BlogForm({ post }: BlogFormProps) {
  const [title, setTitle] = useState(post?.title ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? false)

  const [coverImage, setCoverImage] = useState<ImageData[]>(
    post?.coverImage ? [{ url: post.coverImage, alt: post.title }] : [],
  )

  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? '')
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription ?? '')
  const [seoKeywords, setSeoKeywords] = useState(post?.seoKeywords ?? '')

  const contentEditorRef = useRef<ContentEditorRef>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const initialContent = (post?.content ?? null) as EditorJSData | null

  const action = post ? updateBlogPost.bind(null, post.id) : createBlogPost
  const [state, formAction] = useActionState<BlogPostState, FormData>(action, {})
  const [pending, startTransition] = useTransition()

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!post) setSlug(generateSlug(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = formRef.current
    if (!form) return

    // Pull the latest EditorJS data and stuff it into the hidden field before submit.
    const content = (await contentEditorRef.current?.save()) ?? null
    const hidden = form.elements.namedItem('content') as HTMLInputElement | null
    if (hidden) hidden.value = content ? JSON.stringify(content) : ''

    const formData = new FormData(form)
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {state.error ? (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">{state.error}</div>
      ) : null}
      {state.errors && Object.keys(state.errors).length > 0 ? (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          Please fix the following errors:{' '}
          {Object.entries(state.errors)
            .map(([field, msgs]) => `${field}: ${msgs?.[0]}`)
            .join('; ')}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Post title, slug, and short summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g., Safety Footwear Guide for Construction Workers"
                    required
                  />
                  {state.errors?.title ? (
                    <p className="text-sm text-destructive">{state.errors.title[0]}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="construction-safety-footwear-guide"
                    required
                  />
                  {state.errors?.slug ? (
                    <p className="text-sm text-destructive">{state.errors.slug[0]}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  name="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="One to three sentences shown on the /blog card and in search previews."
                  rows={3}
                />
                {state.errors?.excerpt ? (
                  <p className="text-sm text-destructive">{state.errors.excerpt[0]}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>
                Long-form article body. Use headings, paragraphs, lists, and images.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContentEditor
                ref={contentEditorRef}
                value={initialContent}
                placeholder="Start writing your article..."
              />
              <input type="hidden" name="content" defaultValue="" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
              <CardDescription>Optional overrides for search engines and social cards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  name="seoTitle"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  maxLength={160}
                  placeholder="Defaults to the post title when empty"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Textarea
                  id="seoDescription"
                  name="seoDescription"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Defaults to the excerpt when empty"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoKeywords">SEO Keywords</Label>
                <Input
                  id="seoKeywords"
                  name="seoKeywords"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  placeholder="Comma-separated keywords"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cover Image</CardTitle>
              <CardDescription>Shown on the /blog card and at the top of the article</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={coverImage}
                onChange={setCoverImage}
                maxImages={1}
                productName={title}
              />
              <input type="hidden" name="coverImage" value={coverImage[0]?.url ?? ''} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Published</Label>
                  <p className="text-sm text-muted-foreground">Visible on /blog when on</p>
                </div>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                <input type="hidden" name="isPublished" value={String(isPublished)} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Saving...' : post ? 'Update Post' : 'Create Post'}
          </Button>
        </div>
      </div>
    </form>
  )
}
