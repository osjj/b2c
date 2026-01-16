import { notFound } from 'next/navigation'
import { getAttribute } from '@/actions/attributes'
import { AttributeForm } from '@/components/admin/attribute-form'

export default async function EditAttributePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const attribute = await getAttribute(id)

  if (!attribute) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Attribute</h1>
      <AttributeForm attribute={attribute} />
    </div>
  )
}
