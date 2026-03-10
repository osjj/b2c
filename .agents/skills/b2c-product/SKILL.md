---
name: b2c-product
description: Create product and category management for B2C e-commerce with CRUD operations, image upload, and admin interface. Use after b2c-auth when users need product listing, product detail pages, or admin product management.
---

# B2C Product Management

Create complete product and category management system with admin CRUD and store display.

## Prerequisites

- Project initialized with `/b2c-init`
- Database setup with `/b2c-database`
- Authentication with `/b2c-auth`

## Features

### Admin Features
- Product list with search, filter, pagination
- Product create/edit/delete
- Category management
- Image upload
- Variant management (size, color)

### Store Features
- Product listing page
- Product detail page
- Category browsing
- Product search

## Execution Steps

### Step 1: Create Product Server Actions

Create `src/actions/products.ts` from `references/product-actions.md`

### Step 2: Create Category Server Actions

Create `src/actions/categories.ts` from `references/category-actions.md`

### Step 3: Create Image Upload API

Create `src/app/api/upload/route.ts` from `references/upload-api.md`

### Step 4: Create Admin Product Pages

Create files from `references/admin-products.md`:
- `src/app/admin/products/page.tsx` - Product list
- `src/app/admin/products/new/page.tsx` - Create product
- `src/app/admin/products/[id]/page.tsx` - Edit product
- `src/components/admin/product-form.tsx` - Product form

### Step 5: Create Admin Category Pages

Create files from `references/admin-categories.md`:
- `src/app/admin/categories/page.tsx` - Category list
- `src/app/admin/categories/new/page.tsx` - Create category
- `src/app/admin/categories/[id]/page.tsx` - Edit category

### Step 6: Create Store Product Pages

Create files from `references/store-products.md`:
- `src/app/(store)/products/page.tsx` - Product listing
- `src/app/(store)/products/[slug]/page.tsx` - Product detail
- `src/components/store/product-card.tsx` - Product card
- `src/components/store/product-grid.tsx` - Product grid

### Step 7: Create Store Category Pages

Create files from `references/store-categories.md`:
- `src/app/(store)/categories/page.tsx` - Category listing
- `src/app/(store)/categories/[slug]/page.tsx` - Category products

### Step 8: Install Additional Dependencies

```bash
npm install sharp
```

### Step 9: Create Upload Directory

```bash
mkdir -p public/uploads/products
```

### Step 10: Verify Implementation

```bash
npm run dev
```

Test:
- `/admin/products` - Admin product list
- `/admin/products/new` - Create new product
- `/admin/categories` - Admin category list
- `/products` - Store product listing
- `/products/[slug]` - Product detail page
- `/categories` - Store category listing

## Reference Files

- **Product actions**: See `references/product-actions.md`
- **Category actions**: See `references/category-actions.md`
- **Upload API**: See `references/upload-api.md`
- **Admin products**: See `references/admin-products.md`
- **Admin categories**: See `references/admin-categories.md`
- **Store products**: See `references/store-products.md`
- **Store categories**: See `references/store-categories.md`

## Next Skills

After completion, continue with:
1. `/b2c-cart` - Shopping cart functionality
