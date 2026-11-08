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
import { getSiteUrl } from '@/lib/site-url'
import { buildStoreSolutionCategories } from '@/lib/store-solution-categories'
import {
  getStoreSolutionsPageConfig,
  getStoreSolutionsTotalPages,
  normalizeSolutionsPage,
} from '@/lib/store-solutions-pagination'
import { formatUsageSceneLabel, USAGE_SCENES } from '@/types/solution'
import styles from './solutions-index.module.css'

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
    <div className={styles.page}>
      <div className={styles.frame}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">Solutions</span>
        </nav>

        <section aria-labelledby="solutions-title">
          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>Industry solutions</p>
              <p className={styles.heroEyebrow}>Procurement-ready PPE paths</p>
              <h1 id="solutions-title">PPE solutions built around <span>real work.</span></h1>
              <p className={styles.heroDescription}>
                Match workplace hazards to practical PPE categories, documentation, and quote-ready sourcing paths.
              </p>
              <RequestQuoteButton className={styles.solidAction}>
                <FileText size={17} aria-hidden="true" />
                Get a Quote
              </RequestQuoteButton>
            </div>

            <div className={styles.heroMedia}>
              <Image
                src={heroImage}
                alt=""
                fill
                priority
                sizes="(max-width: 819px) 94vw, 50vw"
                className={styles.heroImage}
              />
            </div>
          </div>

          <div className={styles.heroStats}>
            <HeroStat icon={Shield} value={String(totalSolutionCount) + '+'} label="Solutions" />
            <HeroStat icon={LayoutGrid} value="7" label="Categories" />
            <HeroStat icon={Globe2} value="50+" label="Countries" />
          </div>
        </section>

        <section className={styles.section} aria-labelledby="solution-hubs-title">
          <div className={styles.sectionHead}>
            <h2 id="solution-hubs-title">Priority Industry Hubs</h2>
            <a href="#all-solutions" className={styles.textAction}>
              Browse all solutions
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>

          <div className={styles.hubGrid}>
            {priorityHubs.map((hub, index) => (
              <Link
                className={styles.hubCard}
                href={hub.href}
                key={hub.href}
                aria-label={'Open ' + hub.title}
              >
                <div className={styles.hubMedia}>
                  <Image
                    src={hub.image}
                    alt={hub.imageAlt}
                    fill
                    sizes="(max-width: 839px) 94vw, 46vw"
                    className={styles.hubImage + ' ' + hub.imagePosition}
                  />
                  <span className={styles.hubNumber} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <div className={styles.hubCopy}>
                  <span className={styles.hubIcon}><hub.Icon size={20} aria-hidden="true" /></span>
                  <h3>{hub.title}</h3>
                  <p>{hub.description}</p>
                  <ul className={styles.hubHighlights}>
                    {hub.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
                  </ul>
                  <span className={styles.cardAction}>
                    Open Hub <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="all-solutions" className={styles.section} aria-labelledby="explore-solutions-title">
          <div className={styles.archiveHeader}>
            <div>
              <h2 id="explore-solutions-title">Explore Solutions</h2>
              <p className={styles.resultCount}>
                Showing <strong>{activeSceneLabel}</strong>
                <span className={styles.resultDivider} aria-hidden="true">/</span>
                {browseCountLabel}
              </p>
            </div>

            <nav className={styles.sceneNav} aria-label="Filter solutions by work scene">
              <SceneFilter href="/solutions" active={!sceneFilter} label="All Solutions" />
              {primaryScenes.map(([value, label]) => (
                <SceneFilter
                  href={'/solutions?scene=' + value}
                  active={sceneFilter === value}
                  label={label}
                  key={value}
                />
              ))}
              <details className={styles.moreScenes}>
                <summary className={styles.sceneFilter}>
                  More <ChevronDown size={15} aria-hidden="true" />
                </summary>
                <div className={styles.additionalScenes}>
                  {additionalScenes.map(([value, label]) => (
                    <SceneFilter
                      href={'/solutions?scene=' + value}
                      active={sceneFilter === value}
                      label={label}
                      key={value}
                    />
                  ))}
                </div>
              </details>
            </nav>
          </div>

          {solutions.length === 0 ? (
            <div className={styles.empty}>
              <Shield size={34} aria-hidden="true" />
              <h3>No solutions found</h3>
              <p>Try another work scene or browse all solutions.</p>
              <Link href="/solutions" className={styles.outlineAction}>View all solutions</Link>
            </div>
          ) : (
            <>
              <div className={styles.archiveGrid}>
                {solutions.map((solution, index) => (
                  <Link
                    className={styles.archiveCard}
                    href={'/solutions/' + solution.slug}
                    key={solution.id}
                  >
                    <div className={styles.archiveMedia}>
                      {solution.coverImage ? (
                        <Image
                          src={solution.coverImage}
                          alt={solution.title}
                          fill
                          sizes="(max-width: 639px) 94vw, (max-width: 1079px) 46vw, 31vw"
                          className={styles.archiveImage}
                        />
                      ) : (
                        <span className={styles.archivePlaceholder}><Shield size={38} aria-hidden="true" /></span>
                      )}
                      <span className={styles.archiveNumber}>
                        #{String(solutionIndexStart + index).padStart(2, '0')}
                      </span>
                    </div>
                    <div className={styles.archiveCopy}>
                      <p className={styles.archiveScene}>
                        {solution.usageScenes[0]
                          ? formatUsageSceneLabel(solution.usageScenes[0] as (typeof USAGE_SCENES)[number])
                          : 'General'}
                      </p>
                      <h3>{solution.title}</h3>
                      {solution.excerpt ? <p className={styles.archiveExcerpt}>{solution.excerpt}</p> : null}
                      <span className={styles.cardAction}>
                        View solution <ArrowRight size={16} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className={styles.archiveFooter}>
                {totalPages > 1 ? (
                  <Suspense fallback={null}>
                    <StorePagination
                      currentPage={pageConfig.page}
                      totalPages={totalPages}
                      total={pagination.total}
                    />
                  </Suspense>
                ) : null}
                <Link href="/products" className={styles.outlineAction}>
                  View All Products <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </>
          )}
        </section>

        <section className={styles.section} aria-labelledby="solution-categories-title">
          <div className={styles.sectionHead}>
            <div>
              <h2 id="solution-categories-title">PPE Categories</h2>
              <p>Move from industry planning to head-to-toe equipment.</p>
            </div>
            <Link href="/categories" className={styles.textAction}>
              View all categories <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.categoryGrid}>
            {solutionCategories.map((category) => {
              const IconComponent = iconMap[category.icon] || Shield
              return (
                <Link
                  className={styles.categoryLink}
                  href={'/categories/' + category.slug}
                  key={category.slug}
                >
                  <span className={styles.categoryIcon}>
                    <IconComponent className={styles.categorySvg} aria-hidden="true" />
                  </span>
                  <span>{category.label}</span>
                  <ChevronRight size={15} aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>

        <section className={styles.quotePanel} aria-labelledby="solutions-quote-title">
          <div className={styles.quoteRow}>
            <div className={styles.quoteCopy}>
              <span className={styles.quoteIcon}><Shield size={25} aria-hidden="true" /></span>
              <div>
                <h2 id="solutions-quote-title">Ready to build a role-based PPE plan?</h2>
                <p>Share the worksite, tasks, standards, sizes, and delivery requirements.</p>
              </div>
            </div>
            <div className={styles.quoteActions}>
              <RequestQuoteButton className={styles.solidAction}>
                <FileText size={17} aria-hidden="true" />
                Get Quote
              </RequestQuoteButton>
              <Link href="/products" className={styles.quoteCatalog}>View Catalog</Link>
            </div>
          </div>
          <div className={styles.trustItems}>
            <TrustItem icon={Award} text="Standards documentation" />
            <TrustItem icon={Factory} text="OEM/ODM available" />
            <TrustItem icon={Truck} text="Global shipping" />
            <TrustItem icon={Users} text="24-hour response" />
          </div>
        </section>
      </div>
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
    <div className={styles.heroStat}>
      <Icon className={styles.statIcon} aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function SceneFilter({ href, active, label }: { href: string; active: boolean; label: string }) {
  return <Link href={href} aria-current={active ? 'page' : undefined} className={styles.sceneFilter}>{label}</Link>
}

function TrustItem({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>
  text: string
}) {
  return (
    <span className={styles.trustItem}>
      <Icon className={styles.trustIcon} aria-hidden="true" />
      {text}
    </span>
  )
}
