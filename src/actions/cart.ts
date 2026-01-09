'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

async function getOrCreateCart() {
  const session = await auth()
  const cookieStore = await cookies()

  if (session?.user?.id) {
    // Logged in user - find or create cart by userId
    let cart = await prisma.cart.findFirst({
      where: { userId: session.user.id },
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
        data: { userId: session.user.id },
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
  } else {
    // Guest user - use cookie-based session
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

    let cart = await prisma.cart.findFirst({
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
}

export async function getCart() {
  return getOrCreateCart()
}

// Get cart items formatted for client
export async function getCartItems() {
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

export async function addToCart(productId: string, quantity: number = 1, variantId?: string) {
  const cart = await getOrCreateCart()

  const product = await prisma.product.findUnique({
    where: { id: productId },
  })

  if (!product) {
    throw new Error('Product not found')
  }

  if (!product.isActive) {
    throw new Error('Product is not available')
  }

  if (product.stock < quantity) {
    throw new Error('Not enough stock')
  }

  const existingItem = cart.items.find(
    (item) => item.productId === productId && item.variantId === (variantId || null)
  )

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity
    if (newQuantity > product.stock) {
      throw new Error('Not enough stock')
    }

    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
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

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateCartItem(productId: string, quantity: number, variantId?: string) {
  const cart = await getOrCreateCart()

  const item = cart.items.find(
    (i) => i.productId === productId && i.variantId === (variantId || null)
  )

  if (!item) {
    throw new Error('Item not found in cart')
  }

  if (quantity <= 0) {
    await prisma.cartItem.delete({
      where: { id: item.id },
    })
  } else {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    })

    if (product && quantity > product.stock) {
      throw new Error('Not enough stock')
    }

    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function removeFromCart(productId: string, variantId?: string) {
  const cart = await getOrCreateCart()

  const item = cart.items.find(
    (i) => i.productId === productId && i.variantId === (variantId || null)
  )

  if (item) {
    await prisma.cartItem.delete({
      where: { id: item.id },
    })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function clearCart() {
  const cart = await getOrCreateCart()

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  })

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getCartCount() {
  const cart = await getOrCreateCart()
  return cart.items.reduce((sum, item) => sum + item.quantity, 0)
}

// Merge guest cart into user cart (call after login)
export async function mergeGuestCart() {
  const session = await auth()
  if (!session?.user?.id) return

  const cookieStore = await cookies()
  const sessionId = cookieStore.get('cart_session')?.value
  if (!sessionId) return

  const guestCart = await prisma.cart.findFirst({
    where: { sessionId },
    include: { items: true },
  })

  if (!guestCart || guestCart.items.length === 0) return

  // Get or create user cart
  let userCart = await prisma.cart.findFirst({
    where: { userId: session.user.id },
  })

  if (!userCart) {
    userCart = await prisma.cart.create({
      data: { userId: session.user.id },
    })
  }

  // Merge items
  for (const item of guestCart.items) {
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: userCart.id,
        productId: item.productId,
        variantId: item.variantId,
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

  revalidatePath('/', 'layout')
}
