'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { WorkbenchNavigation } from './workbench-navigation'
import { getWorkbenchDestination } from './workbench-routes'

export function WorkbenchShell({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const activeHref = getWorkbenchDestination(usePathname())

  if (!enabled || !activeHref) return children

  return (
    <div className="space-y-6">
      <WorkbenchNavigation activeHref={activeHref} />
      {children}
    </div>
  )
}
