'use client'

import { useActionState, useState, useRef, useTransition } from 'react'
import { Product, Category, ProductImage, Collection, Attribute, AttributeOption, ProductAttributeValue } from '@prisma/client'
import { createProduct, updateProduct, type ProductState } from '@/actions/products'
import { generateSlug } from '@/lib/utils'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUpload } from './image-upload'
import { ProductAttributesInput } from './product-attributes-input'
import { SpecificationsEditor, type Specification } from './specifications-editor'
import { ContentEditor, type EditorJSData, type ContentEditorRef } from './content-editor'
import { PriceTiersEditor, type PriceTierInput } from './price-tiers-editor'
import { TranslationTabs } from './translation-tabs'
import { TranslatableInput } from './translatable-input'
import { TranslatableTextarea } from './translatable-textarea'
import { locales, defaultLocale, type Locale } from '@/i18n/config'

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
  translations?: Array<{
    locale: string
    name: string
    description: string | null
  }>
}

interface ProductFormProps {
  product?: ProductWithImages
  categories: Category[]
  collections?: Collection[]
  productCollectionIds?: string[]
  attributes?: AttributeWithOptions[]
}

export function ProductForm({ product, categories, collections = [], productCollectionIds = [], attributes = [] }: ProductFormProps) {
  const [images, setImages] = useState<string[]>(
    product?.images.map((img) => img.url) || []
  )
  const [slug, setSlug] = useState(product?.slug || '')
  const [selectedCollections, setSelectedCollections] = useState<string[]>(productCollectionIds)
  const [specifications, setSpecifications] = useState<Specification[]>(
    (product?.specifications as Specification[]) || []
  )
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

  // Translation state
  const [activeLocale, setActiveLocale] = useState<Locale>(defaultLocale)
  const [translations, setTranslations] = useState<Record<Locale, { name: string; description: string }>>(() => {
    const initial = {} as Record<Locale, { name: string; description: string }>
    locales.forEach((locale) => {
      if (locale === defaultLocale) {
        initial[locale] = {
          name: product?.name || '',
          description: product?.description || '',
        }
      } else {
        const existing = product?.translations?.find((t) => t.locale === locale)
        initial[locale] = {
          name: existing?.name || '',
          description: existing?.description || '',
        }
      }
    })
    return initial
  })

  const updateTranslation = (locale: Locale, field: 'name' | 'description', value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }))
    // Auto-generate slug from default locale name
    if (locale === defaultLocale && field === 'name' && !product) {
      setSlug(generateSlug(value))
    }
  }

  const completedLocales = locales.filter(
    (locale) => translations[locale]?.name
  )

  // Initialize attribute values from existing product
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>(() => {
    if (!product?.attributeValues) return {}
    const values: Record<string, any> = {}
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

  const [state, formAction] = useActionState<ProductState, FormData>(
    action,
    {}
  )
  const [pending, startTransition] = useTransition()

  const toggleCollection = (collectionId: string) => {
    setSelectedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    )
  }

  // Handle form submission - save editor content first
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Force save editor content before form submission
    if (contentEditorRef.current) {
      const editorData = await contentEditorRef.current.save()
      if (editorData) {
        setContent(editorData)
        // Update hidden input directly since setState is async
        const contentInput = formRef.current?.querySelector('input[name="content"]') as HTMLInputElement
        if (contentInput) {
          contentInput.value = JSON.stringify(editorData)
        }
      }
    }

    // Submit form via action
    const formData = new FormData(formRef.current!)
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {state.error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {state.error}
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

      {/* Hidden inputs for translations */}
      <input type="hidden" name="name" value={translations[defaultLocale]?.name || ''} />
      <input type="hidden" name="description" value={translations[defaultLocale]?.description || ''} />
      <input type="hidden" name="translations" value={JSON.stringify(translations)} />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Translation Tabs */}
              <TranslationTabs
                activeLocale={activeLocale}
                onLocaleChange={setActiveLocale}
                completedLocales={completedLocales}
              />

              {/* Name field - translatable */}
              <TranslatableInput
                name="productName"
                label="Product Name"
                values={Object.fromEntries(
                  locales.map((l) => [l, translations[l]?.name || ''])
                ) as Record<Locale, string>}
                onChange={(locale, value) => updateTranslation(locale, 'name', value)}
                activeLocale={activeLocale}
                required
              />
              {state.errors?.name && (
                <p className="text-sm text-red-500">{state.errors.name[0]}</p>
              )}

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

              {/* Description field - translatable */}
              <TranslatableTextarea
                name="productDescription"
                label="Description"
                values={Object.fromEntries(
                  locales.map((l) => [l, translations[l]?.description || ''])
                ) as Record<Locale, string>}
                onChange={(locale, value) => updateTranslation(locale, 'description', value)}
                activeLocale={activeLocale}
                rows={5}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload value={images} onChange={setImages} />
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
                    defaultValue={product?.price ? Number(product.price) : ''}
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
                    defaultValue={product?.comparePrice ? Number(product.comparePrice) : ''}
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
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    defaultValue={product?.sku || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock *</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    defaultValue={product?.stock ?? 0}
                    required
                  />
                </div>
              </div>
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
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <ContentEditor
                ref={contentEditorRef}
                value={content}
                onChange={setContent}
                placeholder="Add detailed product description with images..."
              />
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
                  defaultChecked={product?.isActive ?? true}
                  value="true"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isFeatured">Featured</Label>
                <Switch
                  id="isFeatured"
                  name="isFeatured"
                  defaultChecked={product?.isFeatured ?? false}
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
              <Select name="categoryId" defaultValue={product?.categoryId || 'none'}>
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
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
