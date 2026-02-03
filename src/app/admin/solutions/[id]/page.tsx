import { notFound } from 'next/navigation'
import { getSolution } from '@/actions/solutions'
import { SolutionForm } from '@/components/admin/solution-form'

export default async function EditSolutionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const solution = await getSolution(id)

  if (!solution) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Solution</h1>
      <SolutionForm solution={solution} />
    </div>
  )
}
