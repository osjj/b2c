# Product Detail Page - Sticky Sidebar Layout Design

**Date:** 2026-03-08
**Status:** Approved

## Problem

The product detail page currently renders Description, Specifications, and Product Details as full-width sections below the image+info hero. These sections are too wide and there is no connection between them and the product info panel as the user scrolls.

## Goal

- Right-side product info panel becomes sticky (follows scroll)
- Description / Specifications / Product Details align left-right with the sticky product info
- The three content sections have a sticky tab navigation at the top

## Approach: Persistent Two-Column Layout + CSS Sticky (Option A)

Restructure the entire product section into a persistent two-column grid that spans the full page height. Use native CSS `position: sticky` — no JS scroll listeners required.

## Layout

```
[Breadcrumb - full width]

lg:grid-cols-[3fr_2fr] gap-12
┌──────────────────────────┬────────────────────┐
│  LEFT COLUMN (60%)       │  RIGHT COLUMN (40%) │
│                          │                     │
│  [ProductImageGallery]   │  [Product Info]     │
│                          │  - category         │
│  ─────────────────────── │  - name             │
│  [Tab Nav: Desc|Spec|Det]│  - price            │
│  ← sticky top-28         │  - attributes       │
│  ─────────────────────── │  - SKU / stock      │
│  <section id="desc">     │  - add to cart      │
│  <section id="spec">     │                     │
│  <section id="details">  │  sticky top-28      │
│                          │  self-start         │
└──────────────────────────┴────────────────────┘

[Related Products - full width]
```

## Components

### New: `src/components/store/product-section-tabs.tsx` (Client Component)

**Props:**
```ts
interface ProductSectionTabsProps {
  hasDescription: boolean
  hasSpecifications: boolean
  hasDetails: boolean
}
```

**Behavior:**
- Renders only tabs for sections that have content
- `sticky top-28 z-10 bg-background border-b` — sticks below header
- Click → smooth scroll to section via `element.scrollIntoView({ behavior: 'smooth' })`
- `IntersectionObserver` on each section → highlights active tab as user scrolls

### Modified: `src/app/(store)/products/[slug]/page.tsx`

Changes:
1. Wrap entire product area in `grid lg:grid-cols-[3fr_2fr] gap-12`
2. Left column: `<ProductImageGallery>` + `<ProductSectionTabs>` + three `<section>` elements
3. Right column: `<div className="sticky top-28 self-start max-h-[calc(100vh-7rem)] overflow-y-auto">` containing all product info

## Constraints

- Header height: announcement bar (~32px) + nav (h-20 = 80px) ≈ 112px → use `top-28` (112px)
- Right column `overflow-y-auto` handles cases where product info is taller than viewport
- Sections only render if they have content (same conditional logic as today)
- Mobile: grid collapses to single column (stacking order: images → info → tabs+content)
