import { notFound } from 'next/navigation'
import { getCollection } from '@/actions/collections'
import { CollectionForm } from '@/components/admin/collection-form'

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const collection = await getCollection(id)

  if (!collection) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Collection</h1>
      <CollectionForm collection={collection} />
    </div>
  )
}
