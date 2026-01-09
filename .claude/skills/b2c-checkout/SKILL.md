---
name: b2c-checkout
description: Create checkout flow for B2C e-commerce with shipping address, order review, and order creation. Use after b2c-cart when users need checkout page, order placement, or payment integration preparation.
---

# B2C Checkout Flow

Create complete checkout process with address management, order review, and order creation.

## Prerequisites

- Project initialized with `/b2c-init`
- Database setup with `/b2c-database`
- Authentication with `/b2c-auth`
- Products with `/b2c-product`
- Shopping cart with `/b2c-cart`

## Features

- Multi-step checkout flow
- Shipping address form
- Address book (saved addresses)
- Order summary
- Order creation
- Order confirmation page
- Email notification (optional)

## Checkout Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Cart      │───▶│  Shipping   │───▶│   Review    │───▶│  Confirm    │
│   Review    │    │   Address   │    │   & Pay     │    │   Order     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## Execution Steps

### Step 1: Create Order Server Actions

Create `src/actions/orders.ts` from `references/order-actions.md`

### Step 2: Create Address Server Actions

Create `src/actions/addresses.ts` from `references/address-actions.md`

### Step 3: Create Checkout Page

Create `src/app/(store)/checkout/page.tsx` from `references/checkout-page.md`

### Step 4: Create Checkout Components

Create files from `references/checkout-components.md`:
- `src/components/store/checkout/checkout-form.tsx`
- `src/components/store/checkout/shipping-form.tsx`
- `src/components/store/checkout/address-selector.tsx`
- `src/components/store/checkout/order-review.tsx`
- `src/components/store/checkout/payment-section.tsx`

### Step 5: Create Order Confirmation Page

Create `src/app/(store)/checkout/success/page.tsx` from `references/confirmation-page.md`

### Step 6: Create Order History Pages (Account)

Create files from `references/order-history.md`:
- `src/app/(store)/account/orders/page.tsx`
- `src/app/(store)/account/orders/[id]/page.tsx`

### Step 7: Update Cart Summary

Update cart summary to link to checkout

### Step 8: Verify Implementation

```bash
npm run dev
```

Test:
- Add items to cart
- Go to `/checkout`
- Fill shipping address or select from saved addresses
- Review order
- Place order
- View order confirmation
- Check order in `/account/orders`

## Reference Files

- **Order actions**: See `references/order-actions.md`
- **Address actions**: See `references/address-actions.md`
- **Checkout page**: See `references/checkout-page.md`
- **Checkout components**: See `references/checkout-components.md`
- **Confirmation page**: See `references/confirmation-page.md`
- **Order history**: See `references/order-history.md`

## Payment Integration

This skill creates the checkout flow without payment processing. For payment integration, you can add:

- **Stripe**: Use `@stripe/stripe-js` and Stripe Checkout
- **PayPal**: Use `@paypal/react-paypal-js`
- **Alipay/WeChat Pay**: Use respective SDKs

The order is created with `paymentStatus: 'PENDING'` and can be updated after payment confirmation.

## Next Skills

After completion, continue with:
1. `/b2c-order` - Admin order management
