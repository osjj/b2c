"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Minus, Plus, X, ArrowRight, ShoppingBag, Truck } from "lucide-react"
import { useState } from "react"

// Placeholder cart items
const initialCartItems = [
  {
    id: "1",
    productId: "1",
    name: "Artisan Ceramic Vase",
    price: 89,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=200&h=260&fit=crop",
    variant: "Terracotta",
  },
  {
    id: "2",
    productId: "2",
    name: "Linen Blend Throw",
    price: 145,
    quantity: 2,
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&h=260&fit=crop",
    variant: "Natural",
  },
]

export default function CartPage() {
  const [cartItems, setCartItems] = useState(initialCartItems)
  const [promoCode, setPromoCode] = useState("")

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    )
  }

  const removeItem = (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id))
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = subtotal >= 150 ? 0 : 15
  const total = subtotal + shipping

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="font-serif text-3xl mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">
            Looks like you haven&apos;t added any items to your cart yet. Explore our collection and find something you love.
          </p>
          <Button size="lg" className="luxury-btn" asChild>
            <Link href="/products">
              Continue Shopping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12">
      <div className="container mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-serif text-4xl md:text-5xl mb-2 animate-fade-up">Shopping Cart</h1>
          <p className="text-muted-foreground animate-fade-up stagger-1">
            {cartItems.length} {cartItems.length === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Free Shipping Banner */}
            {subtotal < 150 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3 animate-fade-up">
                <Truck className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm">
                  Add <span className="font-medium text-primary">${(150 - subtotal).toFixed(2)}</span> more for free shipping!
                </p>
              </div>
            )}

            {/* Items List */}
            <div className="divide-y">
              {cartItems.map((item, index) => (
                <div
                  key={item.id}
                  className="py-6 first:pt-0 opacity-0 animate-fade-up"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
                  <div className="flex gap-6">
                    {/* Image */}
                    <Link href={`/products/${item.productId}`} className="flex-shrink-0">
                      <div className="w-24 h-32 md:w-32 md:h-40 bg-muted overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    </Link>

                    {/* Details */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between">
                        <div>
                          <Link
                            href={`/products/${item.productId}`}
                            className="font-serif text-lg hover:text-primary transition-colors"
                          >
                            {item.name}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1">{item.variant}</p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="mt-auto flex items-end justify-between">
                        {/* Quantity */}
                        <div className="flex items-center border rounded-md">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-2 hover:bg-muted transition-colors"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-12 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-2 hover:bg-muted transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-muted-foreground">${item.price} each</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Continue Shopping */}
            <div className="pt-6">
              <Link
                href="/products"
                className="text-sm editorial-link text-muted-foreground hover:text-foreground"
              >
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card border rounded-xl p-6 sticky top-32 animate-fade-up stagger-2">
              <h2 className="font-serif text-xl mb-6">Order Summary</h2>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
                </div>

                {/* Promo Code */}
                <div className="pt-4">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                    Promo Code
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code"
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm">
                      Apply
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="flex justify-between text-lg font-medium mb-6">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <Button className="w-full h-12 luxury-btn" size="lg" asChild>
                <Link href="/checkout">
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>Free shipping on orders over $150</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 flex justify-center gap-4">
                <div className="w-10 h-6 bg-muted rounded" />
                <div className="w-10 h-6 bg-muted rounded" />
                <div className="w-10 h-6 bg-muted rounded" />
                <div className="w-10 h-6 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
