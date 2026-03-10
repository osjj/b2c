---
name: b2c-order
description: Create admin order management for B2C e-commerce with order list, status updates, and order details. Use after b2c-checkout when users need admin order management, order fulfillment, or order status tracking.
---

# B2C Admin Order Management

Create complete admin order management system with order list, filtering, status updates, and detailed view.

## Prerequisites

- Project initialized with `/b2c-init`
- Database setup with `/b2c-database`
- Authentication with `/b2c-auth`
- Checkout flow with `/b2c-checkout`

## Features

- Order list with search, filter, pagination
- Order status management
- Payment status tracking
- Order detail view
- Bulk actions (optional)
- Export orders (optional)
- Dashboard statistics

## Order Workflow

```
┌─────────┐    ┌───────────┐    ┌────────────┐    ┌─────────┐    ┌───────────┐
│ PENDING │───▶│ CONFIRMED │───▶│ PROCESSING │───▶│ SHIPPED │───▶│ DELIVERED │
└─────────┘    └───────────┘    └────────────┘    └─────────┘    └───────────┘
      │
      └──────────────────────▶ CANCELLED
```

## Execution Steps

### Step 1: Create Admin Order Actions

Create `src/actions/admin/orders.ts` from `references/admin-order-actions.md`

### Step 2: Create Admin Order List Page

Create `src/app/admin/orders/page.tsx` from `references/admin-orders-page.md`

### Step 3: Create Admin Order Detail Page

Create `src/app/admin/orders/[id]/page.tsx` from `references/order-detail-page.md`

### Step 4: Create Order Components

Create files from `references/order-components.md`:
- `src/components/admin/order-status-select.tsx`
- `src/components/admin/order-timeline.tsx`
- `src/components/admin/order-filters.tsx`

### Step 5: Create Dashboard Statistics

Create `src/app/admin/page.tsx` updates from `references/dashboard-stats.md`

### Step 6: Update Admin Sidebar

Ensure `/admin/orders` link exists in admin sidebar

### Step 7: Verify Implementation

```bash
npm run dev
```

Test:
- `/admin/orders` - View all orders
- Filter orders by status
- Search orders by order number
- Click order to view details
- Update order status
- View order timeline

## Reference Files

- **Admin order actions**: See `references/admin-order-actions.md`
- **Order list page**: See `references/admin-orders-page.md`
- **Order detail page**: See `references/order-detail-page.md`
- **Order components**: See `references/order-components.md`
- **Dashboard stats**: See `references/dashboard-stats.md`

## Order Statuses

| Status | Description |
|--------|-------------|
| PENDING | Order placed, awaiting confirmation |
| CONFIRMED | Order confirmed, awaiting processing |
| PROCESSING | Order is being prepared |
| SHIPPED | Order has been shipped |
| DELIVERED | Order delivered to customer |
| CANCELLED | Order cancelled |
| REFUNDED | Order refunded |

## Payment Statuses

| Status | Description |
|--------|-------------|
| PENDING | Payment pending |
| PAID | Payment received |
| FAILED | Payment failed |
| REFUNDED | Payment refunded |

## Skills Complete

This is the final skill in the B2C e-commerce series. You now have:
1. `/b2c-init` - Project initialization
2. `/b2c-database` - Database schema
3. `/b2c-auth` - Authentication
4. `/b2c-product` - Product management
5. `/b2c-cart` - Shopping cart
6. `/b2c-checkout` - Checkout flow
7. `/b2c-order` - Order management
