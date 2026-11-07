'use client'

import Link, { useLinkStatus } from 'next/link'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WORKBENCH_DESTINATIONS } from './workbench-routes'

function NavigationLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus()

  return (
    <span aria-busy={pending} className="inline-flex items-center gap-2">
      {label}
      <span className="inline-flex size-4 items-center justify-center" aria-hidden="true">
        {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" />}
      </span>
      <span role="status" className="sr-only">{pending ? `正在加载${label}` : ''}</span>
    </span>
  )
}

export function WorkbenchNavigation({ activeHref }: { activeHref: string }) {
  return (
    <nav aria-label="报价工作台" className="flex flex-wrap gap-2 border-b pb-4 text-sm">
      {WORKBENCH_DESTINATIONS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={activeHref === href ? 'page' : undefined}
          className={cn(
            'inline-flex min-h-11 items-center rounded-full px-4 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 motion-reduce:transition-none',
            activeHref === href
              ? 'bg-teal-50 text-teal-900 ring-1 ring-inset ring-teal-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
          )}
        >
          <NavigationLabel label={label} />
        </Link>
      ))}
    </nav>
  )
}
