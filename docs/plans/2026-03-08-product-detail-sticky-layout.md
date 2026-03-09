# Product Detail Sticky Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the product detail page into a persistent two-column layout where the right product-info panel stays sticky while Description/Specifications/Product Details scroll in the left column with a sticky tab navigation.

**Architecture:** Persistent `lg:grid-cols-[3fr_2fr]` grid spans the full page — left column holds the image gallery plus content sections, right column holds all product info wrapped in `sticky top-28 self-start`. A new client component `ProductSectionTabs` renders a sticky tab bar above the content sections and uses `IntersectionObserver` to highlight the active section.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4, no new dependencies.

---

### Task 1: Create `ProductSectionTabs` client component

**Files:**
- Create: `src/components/store/product-section-tabs.tsx`

**Step 1: Create the component file**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
}

interface ProductSectionTabsProps {
  hasDescription: boolean
  hasSpecifications: boolean
  hasDetails: boolean
}

export function ProductSectionTabs({
  hasDescription,
  hasSpecifications,
  hasDetails,
}: ProductSectionTabsProps) {
  const tabs: Tab[] = [
    hasDescription && { id: 'description', label: 'Description' },
    hasSpecifications && { id: 'specifications', label: 'Specifications' },
    hasDetails && { id: 'product-details', label: 'Product Details' },
  ].filter(Boolean) as Tab[]

  const [activeId, setActiveId] = useState<string>(tabs[0]?.id ?? '')

  useEffect(() => {
    if (tabs.length === 0) return

    const observers: IntersectionObserver[] = []

    tabs.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id)
          }
        },
        {
          rootMargin: '-30% 0px -60% 0px',
          threshold: 0,
        }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (tabs.length === 0) return null

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const offset = 120 // header height + tab bar height
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className="sticky top-28 z-10 bg-background border-b -mx-1 px-1">
      <div className="flex gap-6">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className={cn(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeId === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Verify the file was created correctly**

Open `src/components/store/product-section-tabs.tsx` and confirm it exports `ProductSectionTabs`.

**Step 3: Commit**

```bash
git add src/components/store/product-section-tabs.tsx
git commit -m "feat: add ProductSectionTabs sticky tab navigation component"
```

---

### Task 2: Restructure `page.tsx` into persistent two-column layout

**Files:**
- Modify: `src/app/(store)/products/[slug]/page.tsx`

**Step 1: Add the new import at the top of the file**

In `src/app/(store)/products/[slug]/page.tsx`, add the import after the existing imports:

```tsx
import { ProductSectionTabs } from '@/components/store/product-section-tabs'
```

**Step 2: Replace the product detail section**

Find and replace the entire block starting with `{/* Product Detail */}` through the closing `</div>` of the `container` div (lines 164–337 in the original file). Replace with:

```tsx
      {/* Product Detail - persistent two-column layout */}
      <div className="container mx-auto px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[3fr_2fr] gap-12 items-start">

          {/* LEFT COLUMN: Images + Content Sections */}
          <div>
            {/* Images */}
            <ProductImageGallery
              images={product.images}
              productName={product.name}
              hasDiscount={!!hasDiscount}
              discountPercentage={discountPercentage}
            />

            {/* Sticky Tab Navigation */}
            <ProductSectionTabs
              hasDescription={!!product.description}
              hasSpecifications={
                !!(product.specifications &&
                Array.isArray(product.specifications) &&
                (product.specifications as Array<{name: string, value: string}>)
                  .filter(s => !['sourceUrl1688', 'offerId1688'].includes(s.name)).length > 0)
              }
              hasDetails={!!product.content}
            />

            {/* Description Section */}
            {product.description && (
              <section id="description" className="pt-8 border-t mt-8">
                <h2 className="font-serif text-2xl mb-4">Description</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </section>
            )}

            {/* Specifications Section */}
            {product.specifications && Array.isArray(product.specifications) && (() => {
              const INTERNAL_KEYS = new Set(['sourceUrl1688', 'offerId1688'])
              const visibleSpecs = (product.specifications as Array<{name: string, value: string}>)
                .filter(spec => !INTERNAL_KEYS.has(spec.name))
              return visibleSpecs.length > 0 ? (
                <section id="specifications" className="pt-8 border-t mt-8">
                  <h2 className="font-serif text-2xl mb-4">Specifications</h2>
                  <div className="bg-muted/30 rounded-lg overflow-hidden">
                    <dl className="divide-y">
                      {visibleSpecs.map((spec, index) => (
                        <div key={index} className="flex py-3 px-4">
                          <dt className="w-1/3 text-muted-foreground">{spec.name}</dt>
                          <dd className="w-2/3 font-medium">{spec.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </section>
              ) : null
            })()}

            {/* Product Details Section */}
            {product.content && (
              <section id="product-details" className="pt-8 border-t mt-8">
                <h2 className="font-serif text-2xl mb-6">Product Details</h2>
                <ContentRenderer content={product.content as any} />
              </section>
            )}
          </div>

          {/* RIGHT COLUMN: Sticky Product Info */}
          <div className="sticky top-28 self-start max-h-[calc(100vh-7rem)] overflow-y-auto">
            <div className="space-y-6">
              {product.category && (
                <p className="text-sm tracking-[0.2em] uppercase text-primary">
                  {product.category.name}
                </p>
              )}

              <h1 className="font-serif text-3xl md:text-4xl">{product.name}</h1>

              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-medium">
                  {formatPrice(Number(product.price))}
                </span>
                {hasDiscount && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(Number(product.comparePrice))}
                  </span>
                )}
              </div>

              {/* Product Attributes */}
              {product.attributeValues && product.attributeValues.length > 0 && (
                <div className="space-y-3">
                  {product.attributeValues
                    .filter(av => av.attribute.isActive)
                    .sort((a, b) => a.attribute.sortOrder - b.attribute.sortOrder)
                    .map((av) => {
                      let displayValue = ''
                      if (av.textValue) {
                        displayValue = av.textValue
                      } else if (av.option) {
                        displayValue = av.option.value
                      } else if (av.optionIds && av.optionIds.length > 0) {
                        const optionValues = av.optionIds
                          .map(id => av.attribute.options?.find(opt => opt.id === id)?.value)
                          .filter(Boolean)
                        displayValue = optionValues.join(', ')
                      } else if (av.boolValue !== null) {
                        displayValue = av.boolValue ? 'Yes' : 'No'
                      }

                      if (!displayValue) return null

                      return (
                        <div key={av.id} className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            {av.attribute.name}
                          </p>
                          <p className="text-sm font-medium">{displayValue}</p>
                        </div>
                      )
                    })}
                </div>
              )}

              {/* SKU */}
              {product.sku && (
                <p className="text-sm text-muted-foreground">
                  SKU: {product.sku}
                </p>
              )}

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {product.stock > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-muted-foreground">
                      In Stock ({product.stock} available)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm text-muted-foreground">Out of Stock</span>
                  </>
                )}
              </div>

              {/* Add to Cart or Quote */}
              {product.stock > 0 ? (
                <div className="pt-4">
                  {process.env.NEXT_PUBLIC_PROJECT_TYPE === 'B2B' ? (
                    <B2BProductActions
                      productId={product.id}
                      productName={product.name}
                      productImage={product.images[0]?.url}
                      sku={product.sku || undefined}
                      defaultPrice={Number(product.price)}
                      priceTiers={product.priceTiers?.map(t => ({
                        id: t.id,
                        minQuantity: t.minQuantity,
                        maxQuantity: t.maxQuantity,
                        price: Number(t.price),
                        sortOrder: t.sortOrder,
                      })) || []}
                      stock={product.stock}
                    />
                  ) : (
                    <AddToCartButton
                      productId={product.id}
                      productName={product.name}
                      productPrice={Number(product.price)}
                      productImage={product.images[0]?.url}
                      stock={product.stock}
                      size="lg"
                      className="w-full"
                    >
                      Add to Cart
                    </AddToCartButton>
                  )}
                </div>
              ) : (
                <div className="pt-4">
                  <p className="text-muted-foreground">
                    This product is currently out of stock.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
```

**Step 3: Verify the file compiles**

```bash
cd d:/project/b2c-store && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

**Step 4: Start dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:3000/products/heavy-duty-cowhide-leather-back-cotton-blend-work-gloves and check:
- [ ] Left column wider than right (60/40 split)
- [ ] Product info panel stays fixed on the right when scrolling
- [ ] Tab bar (Description | Specifications | Product Details) appears below images
- [ ] Tab bar sticks to top when scrolling past it
- [ ] Clicking a tab smooth-scrolls to the correct section
- [ ] Active tab highlights as you scroll through sections
- [ ] On mobile (< lg), layout is single column stacking: images → info → tabs+content

**Step 5: Commit**

```bash
git add src/app/\(store\)/products/\[slug\]/page.tsx
git commit -m "feat: restructure product detail page with sticky sidebar and section tabs"
```
