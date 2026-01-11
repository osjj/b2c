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
          {errors?.shippingPhone && (
            <p className="text-sm text-red-500">{errors.shippingPhone[0]}</p>
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
