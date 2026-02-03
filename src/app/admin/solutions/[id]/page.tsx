import { notFound } from 'next/navigation'
import { getCategories } from '@/actions/categories'
import { getSolution } from '@/actions/solutions'
import { SolutionForm } from '@/components/admin/solution-form'

export default async function EditSolutionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [solution, categories] = await Promise.all([
    getSolution(id),
    getCategories({ includeInactive: true }),
  ])

  if (!solution) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Solution</h1>
      <SolutionForm solution={solution} categories={categories} />
    </div>
  )
}
