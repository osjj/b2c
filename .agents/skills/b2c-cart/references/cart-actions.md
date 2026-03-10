# Cart Server Actions

## src/actions/cart.ts

```typescript
'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// Generate or get session ID for guest carts
function getSessionId(): string {
  const cookieStore = cookies()
  let sessionId = cookieStore.get('cart_session')?.value

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    cookieStore.set('cart_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
  }

  return sessionId
}

// Get or create cart
async function getOrCreateCart() {
  const session = await auth()
  const userId = session?.user?.id

  if (userId) {
    // Find or create user cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { images: { take: 1 } },
            },
            variant: true,
          },
        },
      },
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: { include: { images: { take: 1 } } },
              variant: true,
            },
          },
        },
      })
    }

    return cart
  }

  // Guest cart
  const sessionId = getSessionId()
  let cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: {
      items: {
        include: {
          product: { include: { images: { take: 1 } } },
          variant: true,
        },
      },
    },
  })

  if (!cart) {
    cart = await prisma.cart.create({
      data: { sessionId },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1 } } },
            variant: true,
          },
        },
      },
    })
  }

  return cart
}

// Get cart items
export async function getCart() {
  const cart = await getOrCreateCart()

  return cart.items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId || undefined,
    name: item.variant?.name || item.product.name,
    price: Number(item.variant?.price || item.product.price),
    image: item.product.images[0]?.url || '',
    quantity: item.quantity,
    stock: item.variant?.stock ?? item.product.stock,
  }))
}

// Add item to cart
export async function addToCart(
  productId: string,
  quantity: number = 1,
  variantId?: string
) {
  const cart = await getOrCreateCart()

  // Check if item already exists
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId_variantId: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    },
  })

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity },
    })
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
        quantity,
      },
    })
  }

  revalidatePath('/cart')
  return { success: true }
}

// Update item quantity
export async function updateCartItem(
  productId: string,
  quantity: number,
  variantId?: string
) {
  const cart = await getOrCreateCart()

  if (quantity <= 0) {
    await prisma.cartItem.delete({
      where: {
        cartId_productId_variantId: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
        },
      },
    })
  } else {
    await prisma.cartItem.update({
      where: {
        cartId_productId_variantId: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
        },
      },
      data: { quantity },
    })
  }

  revalidatePath('/cart')
  return { success: true }
}

// Remove item from cart
export async function removeFromCart(productId: string, variantId?: string) {
  const cart = await getOrCreateCart()

  await prisma.cartItem.delete({
    where: {
      cartId_productId_variantId: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    },
  })

  revalidatePath('/cart')
  return { success: true }
}

// Clear cart
export async function clearCart() {
  const cart = await getOrCreateCart()

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  })

  revalidatePath('/cart')
  return { success: true }
}

// Merge guest cart into user cart (call after login)
export async function mergeGuestCart() {
  const session = await auth()
  if (!session?.user?.id) return

  const cookieStore = cookies()
  const sessionId = cookieStore.get('cart_session')?.value
  if (!sessionId) return

  const guestCart = await prisma.cart.findUnique({
    where: { sessionId },
    include: { items: true },
  })

  if (!guestCart || guestCart.items.length === 0) return

  // Get or create user cart
  let userCart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
  })

  if (!userCart) {
    userCart = await prisma.cart.create({
      data: { userId: session.user.id },
    })
  }

  // Merge items
  for (const item of guestCart.items) {
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_variantId: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
        },
      },
    })

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + item.quantity },
      })
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      })
    }
  }

  // Delete guest cart
  await prisma.cart.delete({ where: { id: guestCart.id } })

  // Clear session cookie
  cookieStore.delete('cart_session')

  revalidatePath('/cart')
}

// Get cart count
export async function getCartCount(): Promise<number> {
  const cart = await getOrCreateCart()
  return cart.items.reduce((sum, item) => sum + item.quantity, 0)
}
```
