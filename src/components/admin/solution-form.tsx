'use client'

import { useActionState, useState, useRef, useTransition } from 'react'
import { Solution, Industry } from '@prisma/client'
import { createSolution, updateSolution, type SolutionState } from '@/actions/solutions'
import { generateSlug } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ImageUpload } from './image-upload'
import { ContentEditor, type EditorJSData, type ContentEditorRef } from './content-editor'
import { PpeCategoriesEditor } from './ppe-categories-editor'
import { MaterialsEditor } from './materials-editor'
import { INDUSTRY_LABELS, type PpeCategoryItem, type MaterialItem } from '@/types/solution'
import type { ImageData } from '@/types/image'
import type { JsonValue } from '@prisma/client/runtime/library'

// Solution with loose typing for JSON fields since Prisma returns JsonValue
interface SolutionWithJsonFields {
  id: string
  slug: string
  title: string
  subtitle: string | null
  industry: Industry
  coverImage: string | null
  isActive: boolean
  sortOrder: number
  hazardsContent: JsonValue
  standardsContent: JsonValue
  faqContent: JsonValue
  ppeCategories: JsonValue
  materials: JsonValue
  metaTitle: string | null
  metaDescription: string | null
  metaKeywords: string | null
  createdAt: Date
  updatedAt: Date
}

interface SolutionFormProps {
  solution?: SolutionWithJsonFields
}

export function SolutionForm({ solution }: SolutionFormProps) {
  // Basic info fields
  const [title, setTitle] = useState(solution?.title || '')
  const [slug, setSlug] = useState(solution?.slug || '')
  const [subtitle, setSubtitle] = useState(solution?.subtitle || '')
  const [industry, setIndustry] = useState<Industry>(solution?.industry || 'CONSTRUCTION')
  const [coverImage, setCoverImage] = useState<ImageData[]>(
    solution?.coverImage ? [{ url: solution.coverImage, alt: solution.title }] : []
  )
  const [isActive, setIsActive] = useState(solution?.isActive ?? true)
  const [sortOrder, setSortOrder] = useState(solution?.sortOrder ?? 0)

  // Editor.js content fields
  const [hazardsContent, setHazardsContent] = useState<EditorJSData | null>(
    (solution?.hazardsContent as unknown as EditorJSData) || null
  )
  const [standardsContent, setStandardsContent] = useState<EditorJSData | null>(
    (solution?.standardsContent as unknown as EditorJSData) || null
  )
  const [faqContent, setFaqContent] = useState<EditorJSData | null>(
    (solution?.faqContent as unknown as EditorJSData) || null
  )

  // PPE Categories and Materials
  const [ppeCategories, setPpeCategories] = useState<PpeCategoryItem[]>(
    (solution?.ppeCategories as unknown as PpeCategoryItem[]) || []
  )
  const [materials, setMaterials] = useState<MaterialItem[]>(
    (solution?.materials as unknown as MaterialItem[]) || []
  )

  // SEO Fields
  const [metaTitle, setMetaTitle] = useState(solution?.metaTitle || '')
  const [metaDescription, setMetaDescription] = useState(solution?.metaDescription || '')
  const [metaKeywords, setMetaKeywords] = useState(solution?.metaKeywords || '')

  // Editor refs
  const hazardsEditorRef = useRef<ContentEditorRef>(null)
  const standardsEditorRef = useRef<ContentEditorRef>(null)
  const faqEditorRef = useRef<ContentEditorRef>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const action = solution
    ? updateSolution.bind(null, solution.id)
    : createSolution

  const [state, formAction] = useActionState<SolutionState, FormData>(action, {})
  const [pending, startTransition] = useTransition()

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    if (!solution) {
      setSlug(generateSlug(newTitle))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Save all editors
    const [hazardsData, standardsData, faqData] = await Promise.all([
      hazardsEditorRef.current?.save(),
      standardsEditorRef.current?.save(),
      faqEditorRef.current?.save(),
    ])

    // Update hidden inputs
    if (formRef.current) {
      const hazardsInput = formRef.current.querySelector('input[name="hazardsContent"]') as HTMLInputElement
      const standardsInput = formRef.current.querySelector('input[name="standardsContent"]') as HTMLInputElement
      const faqInput = formRef.current.querySelector('input[name="faqContent"]') as HTMLInputElement

      if (hazardsInput) hazardsInput.value = JSON.stringify(hazardsData)
      if (standardsInput) standardsInput.value = JSON.stringify(standardsData)
      if (faqInput) faqInput.value = JSON.stringify(faqData)
    }

    // Submit form
    const formData = new FormData(formRef.current!)
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {/* Error Display */}
      {state.error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Solution title, industry, and basic details
              </CardDescription>
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
                    placeholder="e.g., Construction Safety Solutions"
                    required
                  />
                  {state.errors?.title && (
                    <p className="text-sm text-destructive">{state.errors.title[0]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="construction-safety-solutions"
                    required
                  />
                  {state.errors?.slug && (
                    <p className="text-sm text-destructive">{state.errors.slug[0]}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select
                  name="industry"
                  value={industry}
                  onValueChange={(value) => setIndustry(value as Industry)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle / Hero Description</Label>
                <Textarea
                  id="subtitle"
                  name="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Brief introduction displayed in the hero section..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Hazards Section */}
          <Card>
            <CardHeader>
              <CardTitle>Common Hazards</CardTitle>
              <CardDescription>
                Describe common hazards in this industry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContentEditor
                ref={hazardsEditorRef}
                value={hazardsContent}
                onChange={setHazardsContent}
                placeholder="Describe common hazards..."
              />
              <input
                type="hidden"
                name="hazardsContent"
                value={JSON.stringify(hazardsContent)}
              />
            </CardContent>
          </Card>

          {/* PPE Categories Section */}
          <Card>
            <CardHeader>
              <CardTitle>PPE Categories</CardTitle>
              <CardDescription>
                Select relevant PPE categories and provide descriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PpeCategoriesEditor
                value={ppeCategories}
                onChange={setPpeCategories}
              />
              <input
                type="hidden"
                name="ppeCategories"
                value={JSON.stringify(ppeCategories)}
              />
            </CardContent>
          </Card>

          {/* Materials Section */}
          <Card>
            <CardHeader>
              <CardTitle>Materials</CardTitle>
              <CardDescription>
                Select relevant materials used in PPE for this industry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaterialsEditor value={materials} onChange={setMaterials} />
              <input
                type="hidden"
                name="materials"
                value={JSON.stringify(materials)}
              />
            </CardContent>
          </Card>

          {/* Standards Section */}
          <Card>
            <CardHeader>
              <CardTitle>Standards & Certifications</CardTitle>
              <CardDescription>
                Relevant safety standards and certifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContentEditor
                ref={standardsEditorRef}
                value={standardsContent}
                onChange={setStandardsContent}
                placeholder="Describe safety standards and certifications..."
              />
              <input
                type="hidden"
                name="standardsContent"
                value={JSON.stringify(standardsContent)}
              />
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle>FAQ</CardTitle>
              <CardDescription>
                Frequently asked questions for this industry solution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContentEditor
                ref={faqEditorRef}
                value={faqContent}
                onChange={setFaqContent}
                placeholder="Add FAQ content..."
              />
              <input
                type="hidden"
                name="faqContent"
                value={JSON.stringify(faqContent)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cover Image */}
          <Card>
            <CardHeader>
              <CardTitle>Cover Image</CardTitle>
              <CardDescription>
                Main image for the solution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={coverImage}
                onChange={setCoverImage}
                maxImages={1}
                productName={title}
              />
              <input
                type="hidden"
                name="coverImage"
                value={coverImage[0]?.url || ''}
              />
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Display on storefront
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <input type="hidden" name="isActive" value={String(isActive)} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  min={0}
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Search engine optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">
                  Meta Title
                  <span className="text-muted-foreground ml-2">
                    ({metaTitle.length}/60)
                  </span>
                </Label>
                <Input
                  id="metaTitle"
                  name="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="SEO title..."
                  maxLength={60}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">
                  Meta Description
                  <span className="text-muted-foreground ml-2">
                    ({metaDescription.length}/160)
                  </span>
                </Label>
                <Textarea
                  id="metaDescription"
                  name="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="SEO description..."
                  maxLength={160}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaKeywords">Meta Keywords</Label>
                <Input
                  id="metaKeywords"
                  name="metaKeywords"
                  value={metaKeywords}
                  onChange={(e) => setMetaKeywords(e.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <Button type="submit" className="w-full" disabled={pending}>
                {pending
                  ? 'Saving...'
                  : solution
                  ? 'Update Solution'
                  : 'Create Solution'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
