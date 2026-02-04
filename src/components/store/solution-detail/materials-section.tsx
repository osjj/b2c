import { Package } from 'lucide-react'
import type { MaterialItem } from '@/types/solution'

const MATERIAL_META: Record<string, { label: string }> = {
  'abs-plastic': { label: 'ABS Plastic' },
  'cowhide-leather': { label: 'Cowhide Leather' },
  'rubber': { label: 'Rubber' },
  'nylon': { label: 'Nylon' },
  'polyester': { label: 'Polyester' },
  'steel': { label: 'Steel' },
  'kevlar': { label: 'Kevlar' },
  'nitrile': { label: 'Nitrile' },
}

interface MaterialsSectionProps {
  materials: MaterialItem[] | null
}

export function MaterialsSection({ materials }: MaterialsSectionProps) {
  if (!materials?.length) return null

  return (
    <section id="materials" className="scroll-mt-20">
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Materials</h2>
          </div>
          <span className="text-xs text-muted-foreground">{materials.length} types</span>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {materials.map((item) => {
              const meta = MATERIAL_META[item.material]
              if (!meta) return null

              return (
                <div
                  key={item.material}
                  className="flex items-start gap-3 rounded-md border p-3 bg-background"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600">
                    <Package className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{meta.label}</h3>
                    {item.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
