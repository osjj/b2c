import Link from 'next/link'
import { getCollections, deleteCollection } from '@/actions/collections'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { DeleteButton } from '@/components/admin/delete-button'

export default async function CollectionsPage() {
  const collections = await getCollections({ includeInactive: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-muted-foreground">
            Manage product collections and curated sets
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/collections/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Collection
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-center">Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No collections found. Create your first collection.
                </TableCell>
              </TableRow>
            ) : (
              collections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{collection.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {collection.slug}
                  </TableCell>
                  <TableCell className="text-center">
                    {collection._count.products}
                  </TableCell>
                  <TableCell>
                    <Badge variant={collection.isActive ? 'default' : 'secondary'}>
                      {collection.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{collection.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/collections/${collection.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteButton
                        onDelete={deleteCollection.bind(null, collection.id)}
                        title="Delete Collection"
                        description="Are you sure you want to delete this collection? Products will not be deleted."
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
