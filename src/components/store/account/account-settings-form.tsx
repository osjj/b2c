'use client'

import { useActionState } from 'react'
import { Loader2 } from 'lucide-react'
import { updateAccountSettings, type AccountSettingsState } from '@/actions/account'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AccountSettingsFormProps {
  email: string
  name: string
  phone: string
}

export function AccountSettingsForm({ email, name, phone }: AccountSettingsFormProps) {
  const [state, formAction, pending] = useActionState<AccountSettingsState, FormData>(
    updateAccountSettings,
    {}
  )

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{state.error}</div>
      )}
      {state.success && (
        <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md">
          Account settings updated successfully.
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" value={email} readOnly disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" defaultValue={name} required />
        {state.errors?.name && <p className="text-sm text-red-500">{state.errors.name[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={phone} placeholder="Optional" />
        {state.errors?.phone && <p className="text-sm text-red-500">{state.errors.phone[0]}</p>}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </form>
  )
}
