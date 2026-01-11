import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { getAttributes, deleteAttribute } from '@/actions/attributes'
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
import { DeleteButton } from '@/components/admin/delete-button'

const typeLabels: Record<string, string> = {
  TEXT: 'Text',
  TEXTAREA: 'Textarea',
  SELECT: 'Select',
  MULTISELECT: 'Multi-select',
  BOOLEAN: 'Boolean',
}

export default async function AdminAttributesPage() {
  const attributes = await getAttributes({ includeInactive: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attributes</h1>
        <Button asChild>
          <Link href="/admin/attributes/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Attribute
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Options</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Filterable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attributes.map((attribute) => (
              <TableRow key={attribute.id}>
                <TableCell className="font-medium">{attribute.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {attribute.code}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{typeLabels[attribute.type]}</Badge>
                </TableCell>
                <TableCell>
                  {attribute.options.length > 0 ? (
                    <Badge variant="secondary">
                      {attribute.options.length} options
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {attribute.isRequired ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell>
                  {attribute.isFilterable ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={attribute.isActive ? 'default' : 'secondary'}>
                    {attribute.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/attributes/${attribute.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DeleteButton
                      onDelete={async () => {
                        'use server'
                        await deleteAttribute(attribute.id)
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {attributes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No attributes found. Create your first attribute to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
