'use client'

import { useActionState, useState } from 'react'
import { Address } from '@prisma/client'
import { createOrder, type CheckoutState } from '@/actions/orders'
import { type CartItem } from '@/stores/cart'
import { ShippingForm } from './shipping-form'
import { AddressSelector } from './address-selector'
import { OrderReview } from './order-review'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { formatPrice } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface CheckoutFormProps {
  user?: {
    id: string
    email?: string | null
    name?: string | null
  }
  cartItems: CartItem[]
  addresses: Address[]
  subtotal: number
  shippingFee: number
  total: number
}

export function CheckoutForm({
  user,
  cartItems,
  addresses,
  subtotal,
  shippingFee,
  total,
}: CheckoutFormProps) {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id || null
  )
  const [useNewAddress, setUseNewAddress] = useState(addresses.length === 0)

  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    createOrder,
    {}
  )

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId)

  return (
    <form action={formAction}>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={user?.email || ''}
                    required
                  />
                  {state.errors?.email && (
                    <p className="text-sm text-red-500">{state.errors.email[0]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              {addresses.length > 0 && (
                <div className="mb-6">
                  <AddressSelector
                    addresses={addresses}
                    selectedId={selectedAddressId}
                    onSelect={(id) => {
                      setSelectedAddressId(id)
                      setUseNewAddress(false)
                    }}
                  />
                  <Button
                    type="button"
                    variant="link"
                    className="mt-2 p-0"
                    onClick={() => {
                      setUseNewAddress(!useNewAddress)
                      if (!useNewAddress) setSelectedAddressId(null)
                    }}
                  >
                    {useNewAddress ? 'Use saved address' : 'Use new address'}
                  </Button>
                </div>
              )}

              {(useNewAddress || addresses.length === 0) ? (
                <ShippingForm errors={state.errors} />
              ) : (
                selectedAddress && (
                  <div className="bg-muted p-4 rounded-lg">
                    <input type="hidden" name="shippingName" value={selectedAddress.name} />
                    <input type="hidden" name="shippingPhone" value={selectedAddress.phone} />
                    <input type="hidden" name="province" value={selectedAddress.province} />
                    <input type="hidden" name="city" value={selectedAddress.city} />
                    <input type="hidden" name="district" value={selectedAddress.district} />
                    <input type="hidden" name="street" value={selectedAddress.street} />
                    <input type="hidden" name="zipCode" value={selectedAddress.zipCode || ''} />
                    <p className="font-medium">{selectedAddress.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedAddress.phone}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedAddress.province} {selectedAddress.city} {selectedAddress.district}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedAddress.street}</p>
                  </div>
                )
              )}

              {useNewAddress && user && (
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox id="saveAddress" name="saveAddress" value="true" />
                  <Label htmlFor="saveAddress" className="font-normal">
                    Save this address for future orders
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Note */}
          <Card>
            <CardHeader>
              <CardTitle>Order Note</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                name="note"
                placeholder="Any special instructions for your order..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrderReview items={cartItems} />

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {shippingFee === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      formatPrice(shippingFee)
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {state.error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {state.error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Place Order - ${formatPrice(total)}`
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By placing this order, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
