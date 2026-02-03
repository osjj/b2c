import { Package } from 'lucide-react'
import type { MaterialItem } from '@/types/solution'

// Materials metadata
const MATERIAL_META: Record<string, { label: string; description?: string }> = {
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
    <section id="materials" className="scroll-mt-28 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Material Science
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-serif font-bold">
            Materials Used
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Performance-driven materials selected for durability and compliance.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
          <Package className="h-4 w-4 text-primary" />
          {materials.length} materials
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {materials.map((item) => {
          const meta = MATERIAL_META[item.material]
          if (!meta) return null

          return (
            <div
              key={item.material}
              className="rounded-2xl border bg-background/80 p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{meta.label}</h3>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
