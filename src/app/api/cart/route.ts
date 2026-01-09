import { NextRequest, NextResponse } from 'next/server'
import { getCartItems, addToCart, updateCartItem, removeFromCart, clearCart } from '@/actions/cart'

// GET /api/cart - Get cart items
export async function GET() {
  try {
    const items = await getCartItems()
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Get cart error:', error)
    return NextResponse.json(
      { error: 'Failed to get cart' },
      { status: 500 }
    )
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, quantity = 1, variantId } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    await addToCart(productId, quantity, variantId)
    const items = await getCartItems()

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Add to cart error:', error)
    return NextResponse.json(
      { error: 'Failed to add to cart' },
      { status: 500 }
    )
  }
}

// PATCH /api/cart - Update item quantity
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, quantity, variantId } = body

    if (!productId || typeof quantity !== 'number') {
      return NextResponse.json(
        { error: 'Product ID and quantity are required' },
        { status: 400 }
      )
    }

    await updateCartItem(productId, quantity, variantId)
    const items = await getCartItems()

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Update cart error:', error)
    return NextResponse.json(
      { error: 'Failed to update cart' },
      { status: 500 }
    )
  }
}

// DELETE /api/cart - Remove item or clear cart
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const variantId = searchParams.get('variantId')
    const clearAll = searchParams.get('clear') === 'true'

    if (clearAll) {
      await clearCart()
    } else if (productId) {
      await removeFromCart(productId, variantId || undefined)
    } else {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const items = await getCartItems()
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Delete cart error:', error)
    return NextResponse.json(
      { error: 'Failed to delete from cart' },
      { status: 500 }
    )
  }
}
