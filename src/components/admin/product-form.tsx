'use client'

import { useActionState, useState, useRef, useTransition, useCallback } from 'react'
import type { Category, ProductImage, Collection, Attribute, AttributeOption, ProductAttributeValue } from '@prisma/client'
import { Loader2 } from 'lucide-react'
import { createProduct, updateProduct, type ProductState } from '@/actions/products'
import { buildProductSlugBase } from '@/lib/product-slug'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ProductAttributesInput } from './product-attributes-input'
import { SpecificationsEditor, type Specification } from './specifications-editor'
import { ContentEditor, type EditorJSData, type ContentEditorRef } from './content-editor'
import { PriceTiersEditor, type PriceTierInput } from './price-tiers-editor'
import { AIGenerateButton, AIImageDialog } from './ai-product-generator'
import { CollectImageAIDialog } from './collect-image-ai-dialog'
import type { AIGeneratedProduct } from '@/types/ai-generation'
import type { ImageData } from '@/types/image'
import {
  buildProductMetaDescription,
  buildProductMetaTitle,
} from '@/lib/product-seo'
import {
  MAX_PRODUCT_GALLERY_IMAGES,
  promoteToPrimaryProductImage,
} from '@/lib/product-gallery'
import { USAGE_SCENES, formatUsageSceneLabel } from '@/types/solution'

type AttributeWithOptions = Attribute & {
  options: AttributeOption[]
}

type ProductAttributeValueWithRelations = ProductAttributeValue & {
  attribute: Attribute
  option?: AttributeOption | null
}

type ProductWithImages = {
  id: string
  name: string
  slug: string
  description: string | null
  content?: unknown
  specifications?: unknown
  price: number
  comparePrice: number | null
  cost: number | null
  sku: string | null
  stock: number
  categoryId: string | null
  isActive: boolean
  isFeatured: boolean
  images: ProductImage[]
  attributeValues?: ProductAttributeValueWithRelations[]
  priceTiers?: Array<{
    id: string
    minQuantity: number
    maxQuantity: number | null
    price: number
    sortOrder: number
  }>
  // SEO Fields
  metaTitle?: string | null
  metaDescription?: string | null
  metaKeywords?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: string | null
  // Usage Scenes for Solution association
  usageScenes?: string[]
}

interface ProductFormProps {
  product?: ProductWithImages
  categories: Category[]
  collections?: Collection[]
  productCollectionIds?: string[]
  attributes?: AttributeWithOptions[]
}

export function ProductForm({ product, categories, collections = [], productCollectionIds = [], attributes = [] }: ProductFormProps) {
  // Form key for forcing re-render when AI data is applied
  const [formKey, setFormKey] = useState(0)

  // Basic info fields (controlled for AI fill)
  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  const [price, setPrice] = useState(product?.price ? Number(product.price) : '')
  const [comparePrice, setComparePrice] = useState(product?.comparePrice ? Number(product.comparePrice) : '')
  const [sku, setSku] = useState(product?.sku || '')
  const [stock, setStock] = useState(product?.stock ?? 999999)
  const [categoryId, setCategoryId] = useState(product?.categoryId || 'none')
  const [isActive, setIsActive] = useState(product?.isActive ?? true)
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false)

  const [images, setImages] = useState<ImageData[]>(
    product?.images.map((img) => ({ url: img.url, alt: img.alt || '' })) || []
  )
  const [galleryActionMessage, setGalleryActionMessage] = useState<{
    kind: 'success' | 'error'
    text: string
  } | null>(null)
  const [slug, setSlug] = useState(product?.slug || '')
  const [selectedCollections, setSelectedCollections] = useState<string[]>(productCollectionIds)
  const [specifications, setSpecifications] = useState<Specification[]>(() => {
    const raw = product?.specifications
    if (!raw) return []
    // 数组格式（新商品正常保存的格式）
    if (Array.isArray(raw)) return raw as Specification[]
    // 对象格式（1688 采集商品保存的格式：{ key: value }）
    if (typeof raw === 'object') {
      return Object.entries(raw as Record<string, unknown>)
        .filter(([, v]) => typeof v === 'string')
        .map(([name, value]) => ({ name, value: String(value) }))
    }
    return []
  })
  const [content, setContent] = useState<EditorJSData | null>(
    (product?.content as EditorJSData) || null
  )
  const [priceTiers, setPriceTiers] = useState<PriceTierInput[]>(
    product?.priceTiers?.map((t) => ({
      minQuantity: t.minQuantity,
      maxQuantity: t.maxQuantity,
      price: Number(t.price),
    })) || []
  )
  const contentEditorRef = useRef<ContentEditorRef>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // AI 图片生成弹框状态 (用于 Product Details)
  const [contentAiImageDialogOpen, setContentAiImageDialogOpen] = useState(false)

  // AI 文本优化
  const [optimizingText, setOptimizingText] = useState(false)

  // AI 图片生成弹框状态 (用于主图)
  const [imagesAIDialogOpen, setImagesAIDialogOpen] = useState(false)

  // AI 图片生成弹框状态 (用于 Product Details 详情图)
  const [contentDetailAIDialogOpen, setContentDetailAIDialogOpen] = useState(false)

  function handleContentDetailImagesAIUpdate(newUrls: string[]) {
    setContent((prev) => {
      if (!prev) return prev
      let imgIndex = 0
      // 替换现有图片块
      const updatedBlocks = prev.blocks.map((block) => {
        if ((block as { type: string }).type !== 'image') return block
        const newUrl = newUrls[imgIndex++]
        if (!newUrl) return block
        return { ...block, data: { ...(block as { data: object }).data, file: { url: newUrl } } }
      })
      // 追加多出来的新图片
      const extraBlocks = newUrls.slice(imgIndex).map((url) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'image',
        data: { file: { url }, caption: '', withBorder: false, stretched: true, withBackground: false },
      }))
      return { ...prev, blocks: [...updatedBlocks, ...extraBlocks] }
    })
    setFormKey((k) => k + 1)
  }

  async function handleOptimizeText() {
    setOptimizingText(true)
    try {
      const specsRecord = Object.fromEntries(specifications.map((s) => [s.name, s.value]))
      const res = await fetch('/api/ai/optimize-collect-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, specifications: specsRecord }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        const { toast } = await import('sonner')
        toast.error(json.error || 'AI 优化失败')
        return
      }
      if (json.name) { setName(json.name); if (!product) setSlug(buildProductSlugBase(json.name)) }
      if (json.description) setDescription(json.description)
      if (json.specifications) {
        setSpecifications(
          Object.entries(json.specifications as Record<string, string>).map(([n, v]) => ({ name: n, value: v }))
        )
      }
      const { toast } = await import('sonner')
      toast.success('AI 文本优化完成')
    } catch {
      const { toast } = await import('sonner')
      toast.error('网络错误，请重试')
    } finally {
      setOptimizingText(false)
    }
  }

  function handleImagesAIUpdate(newUrls: string[]) {
    const altMap = new Map(images.map((img) => [img.url, img.alt]))
    setImages(newUrls.map((url, i) => ({
      url,
      alt: altMap.get(url) || (i === 0 ? name : `${name} - Image ${i + 1}`),
    })))
  }

  const handleSetDetailImageAsPrimary = useCallback((imageUrl: string) => {
    const result = promoteToPrimaryProductImage(
      images,
      { url: imageUrl, alt: name || 'Product image' },
      MAX_PRODUCT_GALLERY_IMAGES
    )

    if (result.status === 'gallery-full') {
      setGalleryActionMessage({
        kind: 'error',
        text: `The main gallery already has ${MAX_PRODUCT_GALLERY_IMAGES} images. Remove one before adding this detail image.`,
      })
      return false
    }

    setImages(result.images)
    setGalleryActionMessage({
      kind: 'success',
      text: result.status === 'already-primary'
        ? 'This image is already the main image.'
        : 'Detail image set as the main image. Click Update Product to save.',
    })
    return true
  }, [images, name])

  // SEO Fields
  const [metaTitle, setMetaTitle] = useState(product?.metaTitle || '')
  const [metaDescription, setMetaDescription] = useState(product?.metaDescription || '')
  const [metaKeywords, setMetaKeywords] = useState(product?.metaKeywords || '')
  const [ogTitle, setOgTitle] = useState(product?.ogTitle || '')
  const [ogDescription, setOgDescription] = useState(product?.ogDescription || '')
  const [ogImage, setOgImage] = useState(product?.ogImage || '')
  const previewTitle = buildProductMetaTitle({
    name: name || 'Product Title',
    metaTitle,
  })
  const previewDescription = buildProductMetaDescription({
    name: name || 'Product Title',
    description,
    metaDescription,
  })

  // Usage Scenes for Solution association
  const [usageScenes, setUsageScenes] = useState<string[]>(product?.usageScenes || [])

  // Initialize attribute values from existing product
  const [attributeValues, setAttributeValues] = useState<Record<string, unknown>>(() => {
    if (!product?.attributeValues) return {}
    const values: Record<string, unknown> = {}
    for (const av of product.attributeValues) {
      if (av.textValue !== null) {
        values[av.attributeId] = av.textValue
      } else if (av.optionId !== null) {
        values[av.attributeId] = av.optionId
      } else if (av.optionIds && av.optionIds.length > 0) {
        values[av.attributeId] = av.optionIds
      } else if (av.boolValue !== null) {
        values[av.attributeId] = av.boolValue
      }
    }
    return values
  })

  const action = product
    ? updateProduct.bind(null, product.id)
    : createProduct

  const [state, formAction, actionPending] = useActionState<ProductState, FormData>(
    action,
    {}
  )
  const [transitionPending, startTransition] = useTransition()
  const [isPreparingSubmit, setIsPreparingSubmit] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const isSaving = isPreparingSubmit || transitionPending || actionPending
  const validationErrors = Object.entries(state.errors ?? {}).flatMap(([field, messages]) =>
    messages.map((message) => `${field}: ${message}`)
  )

  const handleNameChange = (newName: string) => {
    setName(newName)
    if (!product) {
      setSlug(buildProductSlugBase(newName))
    }
  }

  // Handle AI generated data
  const handleAIApply = useCallback((data: AIGeneratedProduct) => {
    // Update all form fields with AI generated data
    setName(data.name)
    setSlug(data.slug)
    setDescription(data.description)
    setPrice(data.price)
    if (data.comparePrice) setComparePrice(data.comparePrice)
    setSku(data.sku)
    setStock(data.stock)
    setIsActive(data.isActive)
    setIsFeatured(data.isFeatured)

    // Update images (filter out placeholders)
    const validImages = data.images.filter(
      (img) => img.startsWith('http') || img.startsWith('data:')
    )
    if (validImages.length > 0) {
      setImages(validImages.map((url, index) => ({
        url,
        alt: index === 0 ? data.name : `${data.name} - Image ${index + 1}`,
      })))
    }

    // Update specifications
    if (data.specifications) {
      setSpecifications(data.specifications)
    }

    // Update content (force editor re-render)
    if (data.content) {
      setContent(data.content)
      setFormKey((k) => k + 1) // Force ContentEditor to reinitialize
    }

    // Update price tiers
    if (data.priceTiers) {
      setPriceTiers(data.priceTiers)
    }

    // Update category
    if (data.categoryId) {
      setCategoryId(data.categoryId)
    }

    // Update collections
    if (data.collectionIds) {
      setSelectedCollections(data.collectionIds)
    }
  }, [])

  const toggleCollection = (collectionId: string) => {
    setSelectedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    )
  }

  // 处理 AI 生成的图片并插入到 Content Editor
  const handleContentAIImagesGenerated = useCallback(async (generatedImages: string[]) => {
    // 上传 base64 图片到服务器
    const uploadedUrls: string[] = []

    for (const base64 of generatedImages) {
      try {
        const response = await fetch(base64)
        const blob = await response.blob()
        const file = new File([blob], `ai-content-${Date.now()}.png`, { type: 'image/png' })

        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const { url } = await res.json()
          uploadedUrls.push(url)
        }
      } catch (error) {
        console.error('Failed to upload AI generated image:', error)
      }
    }

    if (uploadedUrls.length > 0) {
      // 将图片添加到 content 中
      const imageBlocks = uploadedUrls.map((url) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'image',
        data: {
          file: { url },
          caption: '',
          withBorder: false,
          stretched: false,
          withBackground: false,
        },
      }))

      setContent((prev) => {
        const newContent = prev ? { ...prev } : { time: Date.now(), version: '2.28.2', blocks: [] }
        return {
          ...newContent,
          blocks: [...(newContent.blocks || []), ...imageBlocks],
        }
      })

      // 强制 ContentEditor 重新渲染
      setFormKey((k) => k + 1)
    }

    setContentAiImageDialogOpen(false)
  }, [])

  // Handle form submission - save editor content first
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isSaving) return

    setIsPreparingSubmit(true)
    setSubmitError(null)

    try {
      // Force save editor content before form submission
      if (contentEditorRef.current) {
        const editorData = await contentEditorRef.current.save()
        if (editorData) {
          setContent(editorData)
          // Update hidden input directly since setState is async
          const contentInput = formRef.current?.querySelector('input[name="content"]')
          if (contentInput instanceof HTMLInputElement) {
            contentInput.value = JSON.stringify(editorData)
          }
        }
      }

      const form = formRef.current
      if (!form) {
        throw new Error('Product form is unavailable')
      }

      // Submit form via action. useActionState keeps actionPending true until
      // the server action has either returned an error or redirected on success.
      const formData = new FormData(form)
      startTransition(() => {
        formAction(formData)
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save product')
    } finally {
      setIsPreparingSubmit(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* AI Generate Button at top */}
      <div className="flex justify-end">
        <AIGenerateButton
          categories={categories}
          collections={collections}
          onApply={handleAIApply}
        />
      </div>

      {(submitError || state.error || validationErrors.length > 0) && (
        <div
          role="alert"
          className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <p className="font-medium">Product was not updated.</p>
          {submitError && <p>{submitError}</p>}
          {state.error && <p>{state.error}</p>}
          {validationErrors.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {validationErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Hidden inputs for collections */}
      {selectedCollections.map((id) => (
        <input key={id} type="hidden" name="collectionIds" value={id} />
      ))}

      {/* Hidden input for attribute values */}
      <input type="hidden" name="attributeValues" value={JSON.stringify(attributeValues)} />

      {/* Hidden input for specifications */}
      <input type="hidden" name="specifications" value={JSON.stringify(specifications)} />

      {/* Hidden input for content */}
      <input type="hidden" name="content" value={JSON.stringify(content)} />

      {/* Hidden input for price tiers */}
      <input type="hidden" name="priceTiers" value={JSON.stringify(priceTiers)} />

      {/* Hidden input for images with alt */}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {/* Hidden inputs for SEO fields */}
      <input type="hidden" name="metaTitle" value={metaTitle} />
      <input type="hidden" name="metaDescription" value={metaDescription} />
      <input type="hidden" name="metaKeywords" value={metaKeywords} />
      <input type="hidden" name="ogTitle" value={ogTitle} />
      <input type="hidden" name="ogDescription" value={ogDescription} />
      <input type="hidden" name="ogImage" value={ogImage} />

      {/* Hidden input for usage scenes */}
      <input type="hidden" name="usageScenes" value={JSON.stringify(usageScenes)} />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Basic Information</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOptimizeText}
                disabled={optimizingText}
              >
                {optimizingText ? 'AI 优化中...' : 'AI 优化文本'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
                {state.errors?.name && (
                  <p className="text-sm text-red-500">{state.errors.name[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Images</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImagesAIDialogOpen(true)}
                disabled={images.length === 0}
              >
                AI 生成
              </Button>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={images}
                onChange={setImages}
                maxImages={MAX_PRODUCT_GALLERY_IMAGES}
                productName={name}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comparePrice">Compare Price</Label>
                  <Input
                    id="comparePrice"
                    name="comparePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={comparePrice}
                    onChange={(e) => setComparePrice(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost</Label>
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={product?.cost ? Number(product.cost) : ''}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>批量定价</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceTiersEditor
                tiers={priceTiers}
                onChange={setPriceTiers}
                defaultPrice={product?.price || 0}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SKU</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
              <input type="hidden" name="stock" value={stock} />
            </CardContent>
          </Card>

          {attributes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attributes</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductAttributesInput
                  attributes={attributes}
                  values={attributeValues}
                  onChange={setAttributeValues}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <SpecificationsEditor
                specifications={specifications}
                onChange={setSpecifications}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Product Details</CardTitle>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setContentDetailAIDialogOpen(true)}
                  disabled={
                    !(content?.blocks ?? []).some((b) => (b as { type: string }).type === 'image')
                  }
                >
                  AI 生成
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setContentAiImageDialogOpen(true)}
                  className="gap-2"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" />
                    <path d="M12 12L12 21" />
                    <path d="M12 12L20 7.5" />
                    <path d="M12 12L4 7.5" />
                  </svg>
                  AI 生成图片
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ContentEditor
                key={formKey}
                ref={contentEditorRef}
                value={content}
                onChange={setContent}
                placeholder="Add detailed product description with images..."
                onSetAsPrimaryImage={handleSetDetailImageAsPrimary}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Click a detail image to preview it, then choose Set as main image. Click Update Product to save.
              </p>
              {galleryActionMessage && (
                <p
                  role={galleryActionMessage.kind === 'error' ? 'alert' : 'status'}
                  className={
                    galleryActionMessage.kind === 'error'
                      ? 'mt-2 text-sm text-red-600'
                      : 'mt-2 text-sm text-green-700'
                  }
                >
                  {galleryActionMessage.text}
                </p>
              )}
            </CardContent>
          </Card>

          {/* AI Image Dialog for Product Details */}
          <AIImageDialog
            open={contentAiImageDialogOpen}
            onOpenChange={setContentAiImageDialogOpen}
            referenceImages={images.map((img) => img.url)}
            productName={name}
            onImagesGenerated={handleContentAIImagesGenerated}
          />

          {/* CollectImageAIDialog for Product Details 详情图 */}
          {(() => {
            const detailImgUrls = (content?.blocks ?? [])
              .filter((b) => (b as { type: string }).type === 'image')
              .map((b) => ((b as { data: { file: { url: string } } }).data?.file?.url))
              .filter(Boolean) as string[]
            return (
              <CollectImageAIDialog
                open={contentDetailAIDialogOpen}
                onClose={() => setContentDetailAIDialogOpen(false)}
                images={detailImgUrls}
                selectedImages={new Set(detailImgUrls)}
                onImagesUpdate={handleContentDetailImagesAIUpdate}
              />
            )
          })()}

          {/* SEO Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Optimize how this product appears in search engines and social media
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Meta Title */}
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={name || 'Auto-generated from product name'}
                  maxLength={60}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Recommended: 50-60 characters</span>
                  <span className={metaTitle.length > 60 ? 'text-red-500' : ''}>
                    {metaTitle.length}/60
                  </span>
                </div>
              </div>

              {/* Meta Description */}
              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder={description?.slice(0, 160) || 'Auto-generated from product description'}
                  rows={3}
                  maxLength={160}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Recommended: 120-160 characters</span>
                  <span className={metaDescription.length > 160 ? 'text-red-500' : ''}>
                    {metaDescription.length}/160
                  </span>
                </div>
              </div>

              {/* Meta Keywords */}
              <div className="space-y-2">
                <Label htmlFor="metaKeywords">Keywords</Label>
                <Input
                  id="metaKeywords"
                  value={metaKeywords}
                  onChange={(e) => setMetaKeywords(e.target.value)}
                  placeholder="safety gloves, work gloves, PPE"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated keywords (optional, low SEO impact)
                </p>
              </div>

              <Separator className="my-4" />

              <h4 className="font-medium">Social Media (Open Graph)</h4>

              {/* OG Title */}
              <div className="space-y-2">
                <Label htmlFor="ogTitle">Social Title</Label>
                <Input
                  id="ogTitle"
                  value={ogTitle}
                  onChange={(e) => setOgTitle(e.target.value)}
                  placeholder="Defaults to Meta Title"
                  maxLength={100}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Recommended: up to 60 characters</span>
                  <span>{ogTitle.length}/100</span>
                </div>
              </div>

              {/* OG Description */}
              <div className="space-y-2">
                <Label htmlFor="ogDescription">Social Description</Label>
                <Textarea
                  id="ogDescription"
                  value={ogDescription}
                  onChange={(e) => setOgDescription(e.target.value)}
                  placeholder="Defaults to Meta Description"
                  rows={2}
                />
              </div>

              {/* OG Image URL */}
              <div className="space-y-2">
                <Label htmlFor="ogImage">Social Image URL</Label>
                <Input
                  id="ogImage"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="Defaults to first product image"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 1200x630px. Leave empty to use the first product image.
                </p>
              </div>

              {/* SEO Preview */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Search Preview</h4>
                <div className="space-y-1">
                  <p className="text-blue-600 text-lg truncate">
                    {previewTitle}
                  </p>
                  <p className="text-green-700 text-sm">
                    {process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'}/products/{slug || 'product-slug'}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {previewDescription}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Final title length: {previewTitle.length}/60
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  name="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  value="true"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isFeatured">Featured</Label>
                <Switch
                  id="isFeatured"
                  name="isFeatured"
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                  value="true"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Select name="categoryId" value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {collections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Collections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {collections.map((collection) => (
                    <div key={collection.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`collection-${collection.id}`}
                        checked={selectedCollections.includes(collection.id)}
                        onCheckedChange={() => toggleCollection(collection.id)}
                      />
                      <label
                        htmlFor={`collection-${collection.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {collection.name}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Usage Scenes</CardTitle>
              <CardDescription>
                Select usage scenes where this product is applicable
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSaving} aria-busy={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isSaving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()} disabled={isSaving}>
          Cancel
        </Button>
      </div>

      {/* AI 图片生成 Dialog（主图） */}
      <CollectImageAIDialog
        open={imagesAIDialogOpen}
        onClose={() => setImagesAIDialogOpen(false)}
        images={images.map((img) => img.url)}
        selectedImages={new Set(images.map((img) => img.url))}
        onImagesUpdate={handleImagesAIUpdate}
      />
    </form>
  )
}
