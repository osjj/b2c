import Link from 'next/link'
import Image from 'next/image'
import { Plus, Search, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { getSolutions, deleteSolution, toggleSolutionActive } from '@/actions/solutions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pagination } from '@/components/admin/pagination'
import { INDUSTRY_LABELS } from '@/types/solution'
import type { Industry } from '@prisma/client'
import { SolutionActions } from './solution-actions'

export default async function AdminSolutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; industry?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''
  const industry = params.industry as Industry | undefined

  const { solutions, pagination } = await getSolutions({
    page,
    search,
    industry: industry || undefined,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Solutions</h1>
        <Button asChild>
          <Link href="/admin/solutions/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Solution
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <form className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search solutions..."
              defaultValue={search}
              className="pl-10"
            />
          </div>
        </form>
        <form>
          <input type="hidden" name="search" value={search} />
          <Select name="industry" defaultValue={industry || 'all'}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </form>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solutions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No solutions found
                </TableCell>
              </TableRow>
            ) : (
              solutions.map((solution) => (
                <TableRow key={solution.id}>
                  <TableCell>
                    {solution.coverImage ? (
                      <div className="relative w-16 h-12 rounded overflow-hidden">
                        <Image
                          src={solution.coverImage}
                          alt={solution.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-12 rounded bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">No image</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{solution.title}</p>
                      <p className="text-sm text-muted-foreground">/{solution.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {INDUSTRY_LABELS[solution.industry]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {solution.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>{solution.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <SolutionActions solution={solution} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination {...pagination} />
    </div>
  )
}
