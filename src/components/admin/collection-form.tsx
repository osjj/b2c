'use client'

import { useActionState, useState } from 'react'
import { Collection } from '@prisma/client'
import { createCollection, updateCollection, type CollectionState } from '@/actions/collections'
import { generateSlug } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CollectionFormProps {
  collection?: Collection
}

export function CollectionForm({ collection }: CollectionFormProps) {
  const [slug, setSlug] = useState(collection?.slug || '')

  const action = collection
    ? updateCollection.bind(null, collection.id)
    : createCollection

  const [state, formAction, pending] = useActionState<CollectionState, FormData>(
    action,
    {}
  )

  const handleNameChange = (name: string) => {
    if (!collection) {
      setSlug(generateSlug(name))
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {state.error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Collection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={collection?.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
                {state.errors?.name && (
                  <p className="text-sm text-red-500">{state.errors.name[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={collection?.description || ''}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  name="image"
                  type="url"
                  defaultValue={collection?.image || ''}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  min="0"
                  defaultValue={collection?.sortOrder ?? 0}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  name="isActive"
                  defaultChecked={collection?.isActive ?? true}
                  value="true"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : collection ? 'Update Collection' : 'Create Collection'}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
