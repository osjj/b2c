import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import {
  Boxes,
  ChevronRight,
  Ear,
  Eye,
  Flame,
  Footprints,
  Hand,
  HardHat,
  Package,
  ShieldCheck,
  Shirt,
  Umbrella,
  Wind,
} from 'lucide-react'
import type { buildProductCategoryNavigation } from '@/lib/product-category-navigation'
import { cn } from '@/lib/utils'

const categoryIconMap: Record<string, LucideIcon> = {
  'foot-protection': Footprints,
  'body-protection': Shirt,
  'eye-protection': Eye,
  'respiratory-protection': Wind,
  'hand-protection': Hand,
  'fall-protection': ShieldCheck,
  'head-protection': HardHat,
  'hearing-protection': Ear,
  'other-supplies': Boxes,
  'firefighting-equipment': Flame,
  rainwear: Umbrella,
}

export function ProductCategoryNavigation({
  categories,
  activeHref = '/products',
}: {
  categories: ReturnType<typeof buildProductCategoryNavigation>
  activeHref?: string
}) {
  const activeCategoryHref = categories.reduce((active, category) => {
    const matches = activeHref === category.href || activeHref.startsWith(`${category.href}/`)
    return matches && category.href.length > active.length ? category.href : active
  }, '')
  const allProductsActive = activeHref === '/products'

  return (
    <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <nav
        aria-label="Product categories"
        className="[-webkit-tap-highlight-color:transparent] lg:hidden"
      >
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-accent">
              Product categories
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Choose a protection type</p>
          </div>
          <span className="pb-0.5 text-xs font-medium text-muted-foreground">
            {categories.length} categories
          </span>
        </div>

        <ul className="grid grid-cols-2 gap-2.5">
          <li className="col-span-2">
            <Link
              href="/products"
              aria-current={allProductsActive ? 'page' : undefined}
              className={cn(
                'group flex min-h-14 items-center gap-3 rounded-md border px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none',
                allProductsActive
                  ? 'border-accent/35 bg-accent/[0.06] text-accent shadow-[0_10px_24px_-20px_rgba(234,88,12,0.75)]'
                  : 'border-border/80 bg-card text-foreground/80 hover:border-accent/45 hover:bg-muted/55 hover:text-accent'
              )}
            >
              <span className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-sm',
                allProductsActive ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground/70'
              )}>
                <Package className="h-5 w-5 stroke-[1.8]" aria-hidden="true" />
              </span>
              <span className="flex-1">All Products</span>
              <span className={cn('text-xs font-medium', allProductsActive ? 'text-accent/75' : 'text-muted-foreground')}>View all</span>
              <ChevronRight
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </li>

          {categories.map((category, index) => {
            const Icon = categoryIconMap[category.slug] ?? Package
            const isActive = category.href === activeCategoryHref
            const isLastUnpairedCategory =
              categories.length % 2 === 1 && index === categories.length - 1

            return (
              <li key={category.id} className={isLastUnpairedCategory ? 'col-span-2' : undefined}>
                <Link
                  href={category.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex overflow-hidden rounded-md border border-border/80 bg-card p-3.5 pr-9 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.65)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-[0_16px_30px_-22px_rgba(234,88,12,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transform-none motion-reduce:transition-none',
                    isLastUnpairedCategory
                      ? 'min-h-20 flex-row items-center gap-3'
                      : 'min-h-24 flex-col items-start justify-between',
                    isActive && 'border-accent/35 bg-accent/[0.06] shadow-[0_10px_24px_-20px_rgba(234,88,12,0.75)]'
                  )}
                >
                  <span className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-sm bg-muted text-foreground/70 transition-colors duration-200 group-hover:bg-accent/10 group-hover:text-accent motion-reduce:transition-none',
                    isActive && 'bg-accent text-accent-foreground group-hover:bg-accent group-hover:text-accent-foreground'
                  )}>
                    <Icon className="h-5 w-5 stroke-[1.7]" aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      'text-sm font-semibold leading-tight text-foreground/85 group-hover:text-accent',
                      !isLastUnpairedCategory && 'mt-3',
                      isActive && 'text-accent'
                    )}
                  >
                    {category.name}
                  </span>
                  <ChevronRight
                    className={cn(
                      'absolute right-3 h-4 w-4 text-muted-foreground transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-accent motion-reduce:transition-none',
                      isLastUnpairedCategory ? 'top-1/2 -translate-y-1/2' : 'top-4',
                      isActive && 'text-accent'
                    )}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <nav
        aria-label="Product categories"
        className="hidden border border-border/70 bg-card shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)] [-webkit-tap-highlight-color:transparent] lg:block"
      >
        <ul>
          <li className="border-b">
            <Link
              href="/products"
              aria-current={allProductsActive ? 'page' : undefined}
              className={cn(
                'group relative flex min-h-16 w-full items-center gap-3 border-l-2 px-4 text-sm font-semibold transition-colors duration-200 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset motion-reduce:transition-none',
                allProductsActive
                  ? 'border-accent bg-accent/[0.045] text-accent'
                  : 'border-transparent text-foreground/80 hover:border-accent/45 hover:bg-muted/55 hover:text-accent'
              )}
            >
              <Package className="h-5 w-5 shrink-0 stroke-[1.7]" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">All Products</span>
              <ChevronRight
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </li>

          {categories.map((category) => {
            const Icon = categoryIconMap[category.slug] ?? Package
            const isActive = category.href === activeCategoryHref

            return (
              <li
                key={category.id}
                className="border-b last:border-b-0"
              >
                <Link
                  href={category.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex min-h-16 w-full items-center gap-3 border-l-2 border-transparent px-4 text-sm font-semibold text-foreground/80 transition-colors duration-200 hover:border-accent/45 hover:bg-muted/55 hover:text-accent focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset motion-reduce:transition-none',
                    isActive && 'border-accent bg-accent/[0.045] text-accent hover:border-accent hover:bg-accent/[0.045]'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 stroke-[1.7] text-muted-foreground transition-colors duration-200 group-hover:text-accent motion-reduce:transition-none',
                      isActive && 'text-accent'
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 leading-tight lg:break-words">
                    {category.name}
                  </span>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-accent motion-reduce:transition-none',
                      isActive && 'text-accent'
                    )}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

