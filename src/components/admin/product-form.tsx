'use client'

import { useActionState, useState, useRef, useTransition, useCallback } from 'react'
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
import { AIGenerateButton } from './ai-product-generator'
import type { AIGeneratedProduct } from '@/types/ai-generation'

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
  const [stock, setStock] = useState(product?.stock ?? 0)
  const [categoryId, setCategoryId] = useState(product?.categoryId || 'none')
  const [isActive, setIsActive] = useState(product?.isActive ?? true)
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false)

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

  const handleNameChange = (newName: string) => {
    setName(newName)
    if (!product) {
      setSlug(generateSlug(newName))
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
      setImages(validImages)
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
      {/* AI Generate Button at top */}
      <div className="flex justify-end">
        <AIGenerateButton
          categories={categories}
          collections={collections}
          onApply={handleAIApply}
        />
      </div>

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

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
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
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock *</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value) || 0)}
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
                key={formKey}
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
