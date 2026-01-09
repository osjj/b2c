import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCartItems } from '@/actions/cart'
import { getUserAddresses } from '@/actions/addresses'
import { CheckoutForm } from '@/components/store/checkout/checkout-form'

export default async function CheckoutPage() {
  const [session, cartItems, addresses] = await Promise.all([
    auth(),
    getCartItems(),
    getUserAddresses(),
  ])

  // Redirect to cart if empty
  if (cartItems.length === 0) {
    redirect('/cart')
  }

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const shippingFee = subtotal >= 100 ? 0 : 10
  const total = subtotal + shippingFee

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>

      <CheckoutForm
        user={session?.user}
        cartItems={cartItems}
        addresses={addresses}
        subtotal={subtotal}
        shippingFee={shippingFee}
        total={total}
      />
    </div>
  )
}
