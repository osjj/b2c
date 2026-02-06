import { SolutionForm } from '@/components/admin/solution-form'
import { prisma } from '@/lib/prisma'

export default async function NewSolutionPage() {
  const productOptions = await prisma.product.findMany({
    select: { id: true, name: true, isActive: true },
    orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Solution</h1>
      <SolutionForm productOptions={productOptions} />
    </div>
  )
}
