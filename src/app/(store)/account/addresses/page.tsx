import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createAddressAction,
  deleteAddressAction,
  getUserAddresses,
  setDefaultAddressAction,
} from '@/actions/addresses'
import { formatDate } from '@/lib/utils'

export default async function AccountAddressesPage() {
  const addresses = await getUserAddresses()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Address Book</h1>
        <p className="text-muted-foreground">Manage your shipping addresses for checkout.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Address</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAddressAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">Name *</label>
              <input id="name" name="name" required className="w-full h-10 rounded-md border px-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label htmlFor="phone" className="text-sm font-medium">Phone *</label>
              <input id="phone" name="phone" required className="w-full h-10 rounded-md border px-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label htmlFor="province" className="text-sm font-medium">Province *</label>
              <input id="province" name="province" required className="w-full h-10 rounded-md border px-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label htmlFor="city" className="text-sm font-medium">City *</label>
              <input id="city" name="city" required className="w-full h-10 rounded-md border px-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label htmlFor="district" className="text-sm font-medium">District *</label>
              <input id="district" name="district" required className="w-full h-10 rounded-md border px-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label htmlFor="zipCode" className="text-sm font-medium">Zip Code</label>
              <input id="zipCode" name="zipCode" className="w-full h-10 rounded-md border px-3 text-sm" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="street" className="text-sm font-medium">Street Address *</label>
              <input id="street" name="street" required className="w-full h-10 rounded-md border px-3 text-sm" />
            </div>

            <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="isDefault" value="true" className="h-4 w-4" />
              Set as default address
            </label>

            <div className="md:col-span-2">
              <Button type="submit">Save Address</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No saved addresses yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {address.name}
                  {address.isDefault && <Badge>Default</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-sm text-muted-foreground">{address.phone}</p>
                <p className="text-sm">
                  {address.province} {address.city} {address.district}
                </p>
                <p className="text-sm">{address.street}</p>
                {address.zipCode && <p className="text-sm text-muted-foreground">ZIP: {address.zipCode}</p>}
                <p className="text-xs text-muted-foreground pt-2">
                  Added on {formatDate(address.createdAt)}
                </p>
                <div className="flex gap-2 pt-3">
                  {!address.isDefault && (
                    <form action={setDefaultAddressAction.bind(null, address.id)}>
                      <Button type="submit" size="sm">Set Default</Button>
                    </form>
                  )}
                  <form action={deleteAddressAction.bind(null, address.id)}>
                    <Button type="submit" size="sm" variant="outline">
                      Delete
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
