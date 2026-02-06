import { notFound } from 'next/navigation'
import { getSolution } from '@/actions/solutions'
import { SolutionForm } from '@/components/admin/solution-form'
import { prisma } from '@/lib/prisma'

export default async function EditSolutionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [solution, productOptions] = await Promise.all([
    getSolution(id),
    prisma.product.findMany({
      select: { id: true, name: true, isActive: true },
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    }),
  ])

  if (!solution) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Solution</h1>
      <SolutionForm solution={solution} productOptions={productOptions} />
    </div>
  )
}
