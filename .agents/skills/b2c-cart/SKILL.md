---
name: b2c-cart
description: Create shopping cart functionality for B2C e-commerce with Zustand state management, cart API, and checkout preparation. Use after b2c-product when users need shopping cart, add to cart, or cart management features.
---

# B2C Shopping Cart

Create complete shopping cart system with client-side state and server-side persistence.

## Prerequisites

- Project initialized with `/b2c-init`
- Database setup with `/b2c-database`
- Authentication with `/b2c-auth`
- Products with `/b2c-product`

## Features

- Add/remove items from cart
- Update quantity
- Cart persistence (localStorage + database)
- Guest cart support
- Cart merge on login
- Cart summary component
- Mini cart dropdown

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client Side                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  Zustand    │───▶│ localStorage│    │  UI State   │ │
│  │  Cart Store │    │  (persist)  │    │  (items)    │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      Server Side                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  Cart API   │───▶│   Prisma    │───▶│  Database   │ │
│  │  Routes     │    │   Client    │    │  (Cart)     │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Execution Steps

### Step 1: Create Zustand Cart Store

Create `src/stores/cart.ts` from `references/cart-store.md`

### Step 2: Create Cart Server Actions

Create `src/actions/cart.ts` from `references/cart-actions.md`

### Step 3: Create Cart API Routes

Create `src/app/api/cart/route.ts` from `references/cart-api.md`

### Step 4: Create Cart Page

Create `src/app/(store)/cart/page.tsx` from `references/cart-page.md`

### Step 5: Create Cart Components

Create files from `references/cart-components.md`:
- `src/components/store/cart-item.tsx`
- `src/components/store/cart-summary.tsx`
- `src/components/store/mini-cart.tsx`
- `src/components/store/cart-provider.tsx`

### Step 6: Update Header with Mini Cart

Update `src/components/store/header.tsx` to include mini cart dropdown

### Step 7: Update Add to Cart Button

Update `src/components/store/add-to-cart-button.tsx` with proper integration

### Step 8: Verify Implementation

```bash
npm run dev
```

Test:
- Add product to cart from product page
- View cart at `/cart`
- Update quantity in cart
- Remove item from cart
- Cart persists after page refresh
- Mini cart shows item count in header

## Reference Files

- **Cart store**: See `references/cart-store.md` for Zustand setup
- **Cart actions**: See `references/cart-actions.md` for server actions
- **Cart API**: See `references/cart-api.md` for API routes
- **Cart page**: See `references/cart-page.md` for cart page
- **Cart components**: See `references/cart-components.md` for UI components

## Next Skills

After completion, continue with:
1. `/b2c-checkout` - Checkout flow and order creation
