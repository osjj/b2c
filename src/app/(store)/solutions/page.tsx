import { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Award,
  Building2,
  ChevronDown,
  ChevronRight,
  Eye,
  Factory,
  FileText,
  Footprints,
  Globe2,
  Hand,
  HardHat,
  LayoutGrid,
  Pickaxe,
  Shield,
  Shirt,
  Truck,
  Users,
  Wind,
} from 'lucide-react'
import { getCategories } from '@/actions/categories'
import { getSolutions } from '@/actions/solutions'
import { RequestQuoteButton } from '@/components/store/request-quote-button'
import { StorePagination } from '@/components/store/store-pagination'
import { Button } from '@/components/ui/button'
import { getSiteUrl } from '@/lib/site-url'
import { buildStoreSolutionCategories } from '@/lib/store-solution-categories'
import {
  getStoreSolutionsPageConfig,
  getStoreSolutionsTotalPages,
  normalizeSolutionsPage,
} from '@/lib/store-solutions-pagination'
import { formatUsageSceneLabel, USAGE_SCENES } from '@/types/solution'

const baseUrl = getSiteUrl()
const pageUrl = `${baseUrl}/solutions`
const pageTitle = 'Industry Solutions | Laifappe'
const pageDescription =
  'Discover comprehensive PPE solutions tailored for your industry. From construction to chemical processing, we have the safety equipment you need.'

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: pageUrl,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
  },
  keywords: ['PPE', 'safety solutions', 'industry PPE', 'protective equipment', 'workplace safety'],
}

const STORE_EXCLUDED_SOLUTION_SLUGS = [
  'ppe-safety-equipment-for-construction-sites',
  'construction-site-ppe-solution',
  'ppe-safety-equipment-for-mining-quarrying',
]

const heroImage = 'https://shop.laifappe.com/homepage/hero/hero04-e302dc0bc7.webp'

const priorityHubs = [
  {
    title: 'Construction PPE Hub',
    description:
      'Build site-ready PPE plans around construction hazards, standards, task checklists, and procurement paths.',
    highlights: ['Head protection', 'Fall protection', 'Hi-vis apparel'],
    href: '/solutions/construction-site-ppe-solution',
    image: 'https://shop.laifappe.com/solutions/ppe-for-steel-structure-installation-work-cover-1772011042333.webp',
    imageAlt: 'Construction crew installing structural steel while wearing site PPE',
    imagePosition: 'object-[center_34%]',
    Icon: Building2,
  },
  {
    title: 'Mining & Quarrying PPE Hub',
    description:
      'Plan quarry and mine PPE around dust, impact, visibility, noise, work zones, and bulk RFQ requirements.',
    highlights: ['Respiratory planning', 'Eye protection', 'Hearing protection'],
    href: '/solutions/ppe-safety-equipment-for-mining-quarrying',
    image: 'https://shop.laifappe.com/solutions/ppe-safety-equipment-for-mining-quarrying-cover-1772443454027.webp',
    imageAlt: 'Mining and quarry PPE for drilling, crushing, haul roads, and processing work',
    imagePosition: 'object-[center_74%]',
    Icon: Pickaxe,
  },
] as const

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat,
  Hand,
  Footprints,
  Eye,
  Shield,
  Wind,
  Shirt,
}

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; scene?: string }>
}) {
  const params = await searchParams
  const page = normalizeSolutionsPage(params.page)
  const sceneFilter = params.scene
  const pageConfig = getStoreSolutionsPageConfig(page)

  const [{ solutions, pagination }, categories] = await Promise.all([
    getSolutions({
      page: pageConfig.page,
      skip: pageConfig.skip,
      activeOnly: true,
      usageScene: sceneFilter,
      limit: pageConfig.take,
      excludeSlugs: STORE_EXCLUDED_SOLUTION_SLUGS,
    }),
    getCategories(),
  ])

  const solutionCategories = buildStoreSolutionCategories(categories)
  const allScenes = USAGE_SCENES.map((scene) => [scene, formatUsageSceneLabel(scene)] as const)
  const primaryScenes = allScenes.slice(0, 5)
  const additionalScenes = allScenes.slice(5)
  const activeSceneLabel = sceneFilter
    ? formatUsageSceneLabel(sceneFilter as (typeof USAGE_SCENES)[number])
    : 'All Solutions'
  const totalPages = getStoreSolutionsTotalPages(pagination.total)
  const totalSolutionCount = sceneFilter ? pagination.total : pagination.total + priorityHubs.length
  const solutionIndexStart = pageConfig.skip + 1
  const browseCountLabel = sceneFilter
    ? `${pagination.total} matching solutions`
    : `${pagination.total} additional solutions`

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <section className="relative isolate overflow-hidden bg-[#071a2c] text-white">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          aria-hidden="true"
          sizes="100vw"
          className="-z-20 object-cover object-center opacity-25"
        />
        <div className="absolute inset-0 -z-10 bg-[#071a2c]/80" />

        <div className="container mx-auto px-5 py-6 sm:px-6 md:py-7 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-white/60">
            <Link href="/" className="min-h-11 content-center transition-colors hover:text-white">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="text-white">Solutions</span>
          </nav>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.65fr)] lg:items-center">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.13em]">
                <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-orange-600/20 px-4 text-orange-400">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  Industry solutions
                </span>
                <span className="text-white/65">Procurement-ready PPE paths</span>
              </div>
              <div className="grid gap-6 md:grid-cols-[minmax(0,1.45fr)_minmax(210px,0.55fr)] md:items-end">
                <h1 className="max-w-3xl text-4xl font-bold leading-[1.03] tracking-[-0.04em] sm:text-5xl lg:text-[52px]">
                  PPE solutions built around <span className="text-orange-500">real work.</span>
                </h1>
                <p className="border-white/20 text-sm leading-6 text-white/70 md:border-l md:pl-6">
                  Match workplace hazards to practical PPE categories, documentation, and quote-ready sourcing paths.
                </p>
              </div>
            </div>

            <div className="border-white/15 lg:border-l lg:pl-8">
              <RequestQuoteButton className="min-h-12 w-full bg-orange-600 px-6 text-base hover:bg-orange-500 sm:w-auto lg:w-full">
                <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
                Get a Quote
              </RequestQuoteButton>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
                <HeroStat icon={Shield} value={`${totalSolutionCount}+`} label="Solutions" />
                <HeroStat icon={LayoutGrid} value="7" label="Categories" />
                <HeroStat icon={Globe2} value="50+" label="Countries" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section className="bg-white pb-4 pt-5">
          <div className="container mx-auto px-5 sm:px-6 lg:px-8">
            <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                  Priority Industry Hubs
                </h2>
              </div>
              <a href="#all-solutions" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700 hover:text-orange-600">
                Browse all solutions
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {priorityHubs.map((hub) => (
                <Link
                  className="group relative isolate min-h-[315px] overflow-hidden rounded-xl bg-slate-950 text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                  href={hub.href}
                  key={hub.href}
                  aria-label={`Open ${hub.title}`}
                >
                  <Image
                    src={hub.image}
                    alt={hub.imageAlt}
                    fill
                    sizes="(max-width: 1023px) 100vw, 50vw"
                    className={`-z-20 object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.025] ${hub.imagePosition}`}
                  />
                  <span className="absolute inset-0 -z-10 bg-slate-950/60" aria-hidden="true" />
                  <span className="flex min-h-[315px] flex-col justify-end p-6 sm:p-7">
                    <span className="mb-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg">
                      <hub.Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="text-2xl font-bold tracking-tight sm:text-3xl">{hub.title}</span>
                    <span className="mt-2 max-w-xl text-sm leading-6 text-white/80">{hub.description}</span>
                    <span className="mt-4 flex flex-wrap gap-2">
                      {hub.highlights.map((highlight) => (
                        <span
                          className="rounded-full border border-white/30 bg-slate-950/40 px-3 py-1.5 text-xs font-medium text-white/90"
                          key={highlight}
                        >
                          {highlight}
                        </span>
                      ))}
                    </span>
                    <span className="mt-5 inline-flex min-h-11 items-center gap-2 border-t border-white/25 pt-4 text-sm font-bold">
                      Open Hub
                      <ArrowRight className="h-4 w-4 text-orange-400 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="all-solutions" className="scroll-mt-28 border-t border-slate-200 bg-[#f4f6f8] py-4">
          <div className="container mx-auto px-5 sm:px-6 lg:px-8">
            <div className="mb-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">Explore Solutions</h2>
                <p className="mt-1 whitespace-nowrap text-xs text-slate-600 sm:text-sm">
                  Showing <span className="font-semibold text-slate-950">{activeSceneLabel}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  {browseCountLabel}
                </p>
              </div>
              <div className="flex max-w-full min-w-0 gap-2 lg:max-w-[70%]" aria-label="Filter solutions by work scene">
                <div className="scrollbar-hide flex min-w-0 gap-2 overflow-x-auto pb-2 lg:overflow-x-visible lg:pb-0">
                  <SceneFilter href="/solutions" active={!sceneFilter} label="All Solutions" />
                  {primaryScenes.map(([value, label]) => (
                    <SceneFilter
                      href={`/solutions?scene=${value}`}
                      active={sceneFilter === value}
                      label={label}
                      key={value}
                    />
                  ))}
                </div>
                <details className="group relative flex-shrink-0">
                  <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:border-orange-300 hover:text-orange-600">
                    More
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 grid min-w-48 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    {additionalScenes.map(([value, label]) => (
                      <Link
                        href={`/solutions?scene=${value}`}
                        aria-current={sceneFilter === value ? 'page' : undefined}
                        className={
                          sceneFilter === value
                            ? 'rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-bold text-white'
                            : 'rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600'
                        }
                        key={value}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            {solutions.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
                <Shield className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-bold text-slate-950">No solutions found</h3>
                <p className="mt-2 text-sm text-slate-600">Try another work scene or browse all solutions.</p>
                <Button asChild className="mt-6 min-h-11">
                  <Link href="/solutions">View all solutions</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {solutions.map((solution, index) => (
                    <Link
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
                      href={`/solutions/${solution.slug}`}
                      key={solution.id}
                    >
                      <span className="relative aspect-[16/9] overflow-hidden bg-slate-200">
                        {solution.coverImage ? (
                          <Image
                            src={solution.coverImage}
                            alt={solution.title}
                            fill
                            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center bg-slate-100">
                            <Shield className="h-12 w-12 text-slate-300" aria-hidden="true" />
                          </span>
                        )}
                        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-800 shadow-sm">
                          {solution.usageScenes[0]
                            ? formatUsageSceneLabel(solution.usageScenes[0] as (typeof USAGE_SCENES)[number])
                            : 'General'}
                        </span>
                        <span className="absolute right-3 top-3 rounded bg-slate-950/70 px-2 py-1 text-[10px] font-mono text-white">
                          #{String(solutionIndexStart + index).padStart(2, '0')}
                        </span>
                      </span>
                      <span className="flex flex-1 flex-col p-5">
                        <span className="text-lg font-bold leading-6 text-slate-950 transition-colors group-hover:text-orange-600">
                          {solution.title}
                        </span>
                        {solution.excerpt ? (
                          <span className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{solution.excerpt}</span>
                        ) : null}
                        <span className="mt-5 flex min-h-11 items-center justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-800">
                          View solution
                          <ArrowRight className="h-4 w-4 text-orange-600 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="mt-10 flex flex-col items-center gap-6">
                  {totalPages > 1 ? (
                    <Suspense fallback={null}>
                      <StorePagination
                        currentPage={pageConfig.page}
                        totalPages={totalPages}
                        total={pagination.total}
                      />
                    </Suspense>
                  ) : null}
                  <Button variant="outline" size="lg" asChild className="min-h-11 bg-white">
                    <Link href="/products">
                      View All Products
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="bg-white py-10">
          <div className="container mx-auto px-5 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">PPE Categories</h2>
                <p className="mt-1 text-sm text-slate-600">Move from industry planning to head-to-toe equipment.</p>
              </div>
              <Link href="/categories" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-orange-600">
                View all categories
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {solutionCategories.map((category) => {
                const IconComponent = iconMap[category.icon] || Shield
                return (
                  <Link
                    className="group flex min-h-14 flex-shrink-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 transition-colors hover:border-orange-300 hover:text-orange-600"
                    href={`/categories/${category.slug}`}
                    key={category.slug}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <IconComponent className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="whitespace-nowrap text-sm font-semibold">{category.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#071a2c] py-12 text-white">
          <div className="container mx-auto px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Shield className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-2xl font-bold">Ready to build a role-based PPE plan?</h2>
                  <p className="mt-1 text-sm text-white/70">Share the worksite, tasks, standards, sizes, and delivery requirements.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <RequestQuoteButton className="min-h-11 bg-orange-600 px-6 hover:bg-orange-500">
                  <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                  Get Quote
                </RequestQuoteButton>
                <Button variant="outline" asChild className="min-h-11 border-white/30 bg-transparent px-6 text-white hover:bg-white hover:text-slate-950">
                  <Link href="/products">View Catalog</Link>
                </Button>
              </div>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-6 text-sm text-white/70">
              <TrustItem icon={Award} text="Standards documentation" />
              <TrustItem icon={Factory} text="OEM/ODM available" />
              <TrustItem icon={Truck} text="Global shipping" />
              <TrustItem icon={Users} text="24-hour response" />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function HeroStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: string
  label: string
}) {
  return (
    <div className="min-w-0">
      <Icon className="mb-2 h-5 w-5 text-orange-400" aria-hidden="true" />
      <strong className="block text-xl font-bold sm:text-2xl">{value}</strong>
      <span className="block truncate text-[11px] text-white/55 sm:text-xs">{label}</span>
    </div>
  )
}

function SceneFilter({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'inline-flex min-h-11 flex-shrink-0 items-center rounded-full bg-slate-900 px-4 text-xs font-bold text-white'
          : 'inline-flex min-h-11 flex-shrink-0 items-center rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:border-orange-300 hover:text-orange-600'
      }
    >
      {label}
    </Link>
  )
}

function TrustItem({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>
  text: string
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="h-4 w-4 text-orange-400" aria-hidden="true" />
      {text}
    </span>
  )
}
