'use client'

import { useActionState, useState, useRef, useTransition } from 'react'
import { createSolution, updateSolution, type SolutionState } from '@/actions/solutions'
import { generateSlug } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUpload } from './image-upload'
import { SolutionSectionsEditor } from './solution-sections-editor'
import { USAGE_SCENES, formatUsageSceneLabel, type SolutionSectionInput } from '@/types/solution'
import type { ImageData } from '@/types/image'
import type { JsonValue } from '@prisma/client/runtime/library'
import {
  RECOMMENDED_PPE_BLOCK_KEY,
  resolveRecommendationMode,
} from '@/lib/solution-recommendations'
import type { RecommendationMode } from '@/types/solution'

interface SolutionSectionRecord {
  key: string
  type: string
  title: string | null
  enabled: boolean
  sort: number
  data: JsonValue
}

interface SolutionProductLinkRecord {
  id: string
  blockKey: string
  productId: string
  sort: number
}

interface SolutionWithJsonFields {
  id: string
  slug: string
  title: string
  excerpt: string | null
  usageScenes: string[]
  coverImage: string | null
  isActive: boolean
  sortOrder: number
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  sections: SolutionSectionRecord[]
  productLinks: SolutionProductLinkRecord[]
  createdAt: Date
  updatedAt: Date
}

interface SolutionFormProps {
  solution?: SolutionWithJsonFields
  productOptions: {
    id: string
    name: string
    isActive: boolean
  }[]
}

const fallbackSectionData = (type: SolutionSectionInput['type']) => {
  switch (type) {
    case 'hero':
      return { intro: '', bullets: [] }
    case 'paragraphs':
      return { paragraphs: [''] }
    case 'list':
      return { items: [{ title: '', text: '' }] }
    case 'table':
      return { headers: [''], rows: [['']] }
    case 'group':
      return { groups: [{ title: '', items: [''] }] }
    case 'callout':
      return { text: '' }
    case 'cta':
      return {
        title: '',
        text: '',
        primaryLabel: '',
        primaryHref: '',
        secondaryLabel: '',
        secondaryHref: '',
      }
    case 'faq':
      return { items: [{ q: '', a: '' }] }
    default:
      return { text: '' }
  }
}

export function SolutionForm({ solution, productOptions }: SolutionFormProps) {
  const [title, setTitle] = useState(solution?.title || '')
  const [slug, setSlug] = useState(solution?.slug || '')
  const [excerpt, setExcerpt] = useState(solution?.excerpt || '')
  const [usageScenes, setUsageScenes] = useState<string[]>(solution?.usageScenes || [])
  const [coverImage, setCoverImage] = useState<ImageData[]>(
    solution?.coverImage ? [{ url: solution.coverImage, alt: solution.title }] : []
  )
  const [isActive, setIsActive] = useState(solution?.isActive ?? true)
  const [sortOrder, setSortOrder] = useState(solution?.sortOrder ?? 0)

  const initialSections = (solution?.sections || [])
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((section) => ({
      key: section.key,
      type: section.type as SolutionSectionInput['type'],
      title: section.title,
      enabled: section.enabled ?? true,
      sort: section.sort,
      data: (section.data ?? fallbackSectionData(section.type as SolutionSectionInput['type'])) as SolutionSectionInput['data'],
    }))

  const [sections, setSections] = useState<SolutionSectionInput[]>(initialSections)

  const recommendedSection = initialSections.find((section) => section.key === RECOMMENDED_PPE_BLOCK_KEY)
  const [recommendationMode, setRecommendationMode] = useState<RecommendationMode>(
    resolveRecommendationMode((recommendedSection?.data as { mode?: unknown } | undefined)?.mode)
  )
  const [productSearch, setProductSearch] = useState('')
  const [manualProductIds, setManualProductIds] = useState<string[]>(
    (solution?.productLinks || [])
      .filter((link) => link.blockKey === RECOMMENDED_PPE_BLOCK_KEY)
      .sort((a, b) => a.sort - b.sort)
      .map((link) => link.productId)
  )

  const [seoTitle, setSeoTitle] = useState(solution?.seoTitle || '')
  const [seoDescription, setSeoDescription] = useState(solution?.seoDescription || '')
  const [seoKeywords, setSeoKeywords] = useState(solution?.seoKeywords || '')

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(formRef.current!)
    startTransition(() => {
      formAction(formData)
    })
  }

  const sectionsPayload = sections.map((section, index) => {
    const data =
      section.key === RECOMMENDED_PPE_BLOCK_KEY
        ? {
            ...(section.data as unknown as Record<string, unknown>),
            mode: recommendationMode,
          }
        : section.data

    return {
      ...section,
      data,
      key: section.key?.trim() || `section-${index + 1}`,
      sort: index,
    }
  })

  const filteredProductOptions = productOptions.filter((product) =>
    product.name.toLowerCase().includes(productSearch.trim().toLowerCase())
  )

  const toggleManualProduct = (productId: string, checked: boolean) => {
    if (checked) {
      if (manualProductIds.includes(productId)) return
      setManualProductIds([...manualProductIds, productId])
      return
    }
    setManualProductIds(manualProductIds.filter((id) => id !== productId))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {state.error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Solution title, usage scenes, and introduction
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
                <Label>Usage Scenes *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-lg">
                  {USAGE_SCENES.map((scene) => (
                    <div key={scene} className="flex items-center space-x-2">
                      <Checkbox
                        id={`scene-${scene}`}
                        checked={usageScenes.includes(scene)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setUsageScenes([...usageScenes, scene])
                          } else {
                            setUsageScenes(usageScenes.filter((s) => s !== scene))
                          }
                        }}
                      />
                      <label
                        htmlFor={`scene-${scene}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {formatUsageSceneLabel(scene)}
                      </label>
                    </div>
                  ))}
                </div>
                <input type="hidden" name="usageScenes" value={JSON.stringify(usageScenes)} />
                {state.errors?.usageScenes && (
                  <p className="text-sm text-destructive">{state.errors.usageScenes[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt / Intro</Label>
                <Textarea
                  id="excerpt"
                  name="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief introduction displayed in the hero section..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sections</CardTitle>
              <CardDescription>
                Build structured content blocks for this solution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SolutionSectionsEditor value={sections} onChange={setSections} />
              <input
                type="hidden"
                name="sections"
                value={JSON.stringify(sectionsPayload)}
              />
            </CardContent>
          </Card>

        </div>

        <div className="space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle>Recommended Products</CardTitle>
              <CardDescription>
                Controls the products shown under the &quot;Recommended PPE&quot; block.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select
                  value={recommendationMode}
                  onValueChange={(value) => setRecommendationMode(value as RecommendationMode)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rule">Rule (usageScenes)</SelectItem>
                    <SelectItem value="manual">Manual (selected products)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Default is rule mode; manual mode uses the selected products below.
                </p>
              </div>

              {recommendationMode === 'manual' && (
                <div className="space-y-3">
                  <Label>Manual Product Selector</Label>
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                  />
                  <div className="max-h-64 overflow-y-auto rounded-lg border p-3 space-y-2">
                    {filteredProductOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No products found.</p>
                    ) : (
                      filteredProductOptions.map((product) => (
                        <div key={product.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`manual-product-${product.id}`}
                            checked={manualProductIds.includes(product.id)}
                            onCheckedChange={(checked) => toggleManualProduct(product.id, checked === true)}
                          />
                          <label
                            htmlFor={`manual-product-${product.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {product.name}
                            {!product.isActive && ' (inactive)'}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selected: {manualProductIds.length}
                  </p>
                </div>
              )}

              <input type="hidden" name="recommendationMode" value={recommendationMode} />
              <input type="hidden" name="manualProductIds" value={JSON.stringify(manualProductIds)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Search engine optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">
                  SEO Title
                  <span className="text-muted-foreground ml-2">
                    ({seoTitle.length}/60)
                  </span>
                </Label>
                <Input
                  id="seoTitle"
                  name="seoTitle"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="SEO title..."
                  maxLength={60}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoDescription">
                  SEO Description
                  <span className="text-muted-foreground ml-2">
                    ({seoDescription.length}/160)
                  </span>
                </Label>
                <Textarea
                  id="seoDescription"
                  name="seoDescription"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="SEO description..."
                  maxLength={160}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoKeywords">SEO Keywords</Label>
                <Input
                  id="seoKeywords"
                  name="seoKeywords"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
            </CardContent>
          </Card>

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
