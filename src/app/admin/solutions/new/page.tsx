import { SolutionForm } from '@/components/admin/solution-form'

export default async function NewSolutionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Solution</h1>
      <SolutionForm />
    </div>
  )
}
