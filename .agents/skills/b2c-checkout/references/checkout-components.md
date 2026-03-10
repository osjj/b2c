# Checkout Components

## src/components/store/checkout/checkout-form.tsx

```tsx
'use client'

import { useActionState, useState } from 'react'
import { User, Address } from '@prisma/client'
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
```

## src/components/store/checkout/shipping-form.tsx

```tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ShippingFormProps {
  errors?: Record<string, string[]>
  defaultValues?: {
    name?: string
    phone?: string
    province?: string
    city?: string
    district?: string
    street?: string
    zipCode?: string
  }
}

export function ShippingForm({ errors, defaultValues }: ShippingFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="shippingName">Recipient Name *</Label>
          <Input
            id="shippingName"
            name="shippingName"
            defaultValue={defaultValues?.name}
            required
          />
          {errors?.name && (
            <p className="text-sm text-red-500">{errors.name[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="shippingPhone">Phone *</Label>
          <Input
            id="shippingPhone"
            name="shippingPhone"
            type="tel"
            defaultValue={defaultValues?.phone}
            required
          />
          {errors?.phone && (
            <p className="text-sm text-red-500">{errors.phone[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="province">Province *</Label>
          <Input
            id="province"
            name="province"
            defaultValue={defaultValues?.province}
            required
          />
          {errors?.province && (
            <p className="text-sm text-red-500">{errors.province[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            name="city"
            defaultValue={defaultValues?.city}
            required
          />
          {errors?.city && (
            <p className="text-sm text-red-500">{errors.city[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="district">District *</Label>
          <Input
            id="district"
            name="district"
            defaultValue={defaultValues?.district}
            required
          />
          {errors?.district && (
            <p className="text-sm text-red-500">{errors.district[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="street">Street Address *</Label>
        <Input
          id="street"
          name="street"
          placeholder="Street, building, apartment, etc."
          defaultValue={defaultValues?.street}
          required
        />
        {errors?.street && (
          <p className="text-sm text-red-500">{errors.street[0]}</p>
        )}
      </div>

      <div className="space-y-2 max-w-xs">
        <Label htmlFor="zipCode">Zip Code</Label>
        <Input
          id="zipCode"
          name="zipCode"
          defaultValue={defaultValues?.zipCode}
        />
      </div>
    </div>
  )
}
```

## src/components/store/checkout/address-selector.tsx

```tsx
'use client'

import { Address } from '@prisma/client'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddressSelectorProps {
  addresses: Address[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function AddressSelector({
  addresses,
  selectedId,
  onSelect,
}: AddressSelectorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {addresses.map((address) => (
        <button
          key={address.id}
          type="button"
          onClick={() => onSelect(address.id)}
          className={cn(
            'relative text-left p-4 border rounded-lg transition-colors',
            selectedId === address.id
              ? 'border-primary bg-primary/5'
              : 'hover:border-gray-400'
          )}
        >
          {selectedId === address.id && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          )}
          <p className="font-medium">{address.name}</p>
          <p className="text-sm text-muted-foreground">{address.phone}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {address.province} {address.city} {address.district}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {address.street}
          </p>
          {address.isDefault && (
            <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              Default
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
```

## src/components/store/checkout/order-review.tsx

```tsx
'use client'

import Image from 'next/image'
import { type CartItem } from '@/stores/cart'
import { formatPrice } from '@/lib/utils'

interface OrderReviewProps {
  items: CartItem[]
}

export function OrderReview({ items }: OrderReviewProps) {
  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {items.map((item) => (
        <div
          key={`${item.productId}-${item.variantId || ''}`}
          className="flex gap-3"
        >
          <div className="w-16 h-16 relative rounded overflow-hidden bg-gray-100 shrink-0">
            {item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                No img
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-2">{item.name}</p>
            <p className="text-sm text-muted-foreground">
              {item.quantity} x {formatPrice(item.price)}
            </p>
          </div>
          <div className="text-sm font-medium">
            {formatPrice(item.price * item.quantity)}
          </div>
        </div>
      ))}
    </div>
  )
}
```
