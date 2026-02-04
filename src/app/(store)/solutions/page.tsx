import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  HardHat,
  Hand,
  Footprints,
  Eye,
  Shield,
  Wind,
  Shirt,
  FileText,
  ChevronRight,
  CheckCircle2,
  Building2,
  Award,
  Truck,
  Target,
  Layers,
  Zap,
  BadgeCheck,
  ArrowUpRight,
  Factory,
  Users
} from 'lucide-react'
import { getSolutions } from '@/actions/solutions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { USAGE_SCENES, formatUsageSceneLabel, PPE_CATEGORIES } from '@/types/solution'

export const metadata: Metadata = {
  title: 'Industry Solutions | PPE Pro',
  description: 'Discover comprehensive PPE solutions tailored for your industry. From construction to chemical processing, we have the safety equipment you need.',
  keywords: ['PPE', 'safety solutions', 'industry PPE', 'protective equipment', 'workplace safety'],
}

// Icon mapping for PPE categories
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
  searchParams: Promise<{ scene?: string }>
}) {
  const params = await searchParams
  const sceneFilter = params.scene

  const { solutions } = await getSolutions({
    activeOnly: true,
    usageScene: sceneFilter,
    limit: 50,
  })

  const allScenes = USAGE_SCENES.map((scene) => [scene, formatUsageSceneLabel(scene)] as const)
  const activeSceneLabel = sceneFilter ? formatUsageSceneLabel(sceneFilter as typeof USAGE_SCENES[number]) : 'All Solutions'

  // Split solutions for featured display
  const featuredSolution = solutions[0]
  const regularSolutions = solutions.slice(1)

  return (
    <div className="min-h-screen bg-ppe-bg-page">
      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90">
        {/* Grid Pattern Background */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        {/* Diagonal Accent */}
        <div className="absolute -right-20 top-0 w-96 h-full bg-accent/20 transform skew-x-12" />

        {/* Floating Elements */}
        <div className="absolute top-20 right-[15%] w-24 h-24 border border-white/10 rounded-full opacity-30" />
        <div className="absolute bottom-10 left-[10%] w-16 h-16 border border-accent/30 rounded-lg rotate-12 opacity-40" />

        <div className="container mx-auto px-6 lg:px-8 py-12 md:py-20 relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-6">
            <Link href="/" className="hover:text-primary-foreground transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-primary-foreground">Solutions</span>
          </nav>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div>
              {/* Trust badges */}
              <div className="flex flex-wrap gap-3 mb-5">
                <div className="flex items-center gap-2 bg-accent/20 px-3 py-1.5 rounded-full">
                  <Shield className="h-4 w-4 text-accent" />
                  <span className="text-xs font-medium text-primary-foreground">Industry Solutions</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                  <Award className="h-4 w-4 text-primary-foreground/80" />
                  <span className="text-xs font-medium text-primary-foreground/80">CE Certified</span>
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-primary-foreground mb-4">
                PPE Solutions
                <span className="text-accent"> Tailored</span>
                <br />for Your Industry
              </h1>

              <p className="text-base text-primary-foreground/70 max-w-lg mb-6">
                Comprehensive protective equipment packages designed for specific workplace hazards. Match your requirements with certified safety solutions.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="h-12 px-6 bg-accent hover:bg-accent/90" asChild>
                  <Link href="/quote">
                    <FileText className="mr-2 h-4 w-4" />
                    Get Quote
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 bg-transparent border-white/30 text-white hover:bg-white hover:text-foreground"
                  asChild
                >
                  <Link href="/products">
                    View Catalog
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Mini Stats */}
              <div className="flex items-center gap-6 mt-8 pt-6 border-t border-white/10">
                <div>
                  <div className="text-2xl font-bold text-accent">{solutions.length}+</div>
                  <div className="text-xs text-primary-foreground/60">Solutions</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <div className="text-2xl font-bold text-primary-foreground">7</div>
                  <div className="text-xs text-primary-foreground/60">Categories</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <div className="text-2xl font-bold text-primary-foreground">50+</div>
                  <div className="text-xs text-primary-foreground/60">Countries</div>
                </div>
              </div>
            </div>

            {/* Hero Visual - Feature Cards */}
            <div className="hidden lg:block relative">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                    <Target className="h-8 w-8 text-accent mb-3" />
                    <h3 className="font-semibold text-primary-foreground text-sm">Hazard Mapping</h3>
                    <p className="text-xs text-primary-foreground/60 mt-1">Identify exposure points</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                    <Layers className="h-8 w-8 text-primary-foreground/80 mb-3" />
                    <h3 className="font-semibold text-primary-foreground text-sm">PPE Categories</h3>
                    <p className="text-xs text-primary-foreground/60 mt-1">Complete protection coverage</p>
                  </div>
                </div>
                <div className="space-y-3 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                    <BadgeCheck className="h-8 w-8 text-primary-foreground/80 mb-3" />
                    <h3 className="font-semibold text-primary-foreground text-sm">Standards Ready</h3>
                    <p className="text-xs text-primary-foreground/60 mt-1">Compliance assured</p>
                  </div>
                  <div className="bg-accent/20 backdrop-blur-sm rounded-xl p-5 border border-accent/30 hover:bg-accent/30 transition-colors">
                    <Zap className="h-8 w-8 text-accent mb-3" />
                    <h3 className="font-semibold text-primary-foreground text-sm">Quick Deploy</h3>
                    <p className="text-xs text-primary-foreground/60 mt-1">Fast implementation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          SCENE FILTER TABS
          ============================================ */}
      <section className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-6 lg:px-8 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Showing: <span className="text-foreground font-medium">{activeSceneLabel}</span>
                <span className="text-border mx-2">|</span>
                <span>{solutions.length} solutions</span>
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <Link href="/solutions">
                <Button
                  variant={!sceneFilter ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full whitespace-nowrap h-8 text-xs"
                >
                  All
                </Button>
              </Link>
              {allScenes.map(([value, label]) => (
                <Link key={value} href={`/solutions?scene=${value}`}>
                  <Button
                    variant={sceneFilter === value ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full whitespace-nowrap h-8 text-xs"
                  >
                    {label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          SOLUTIONS GRID - MAIN FOCUS
          ============================================ */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-6 lg:px-8">
          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 bg-accent rounded-full" />
                <span className="text-sm font-medium text-accent">Browse Solutions</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Find Your Industry Solution
              </h2>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Each solution includes hazard analysis, recommended equipment, and compliance guidance.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>All solutions include expert consultation</span>
            </div>
          </div>

          {solutions.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-border">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary mb-6">
                <Shield className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">No Solutions Found</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {sceneFilter
                  ? `No solutions available for ${formatUsageSceneLabel(sceneFilter as typeof USAGE_SCENES[number])} yet.`
                  : 'No solutions available at the moment.'}
              </p>
              {sceneFilter && (
                <Button asChild>
                  <Link href="/solutions">View All Solutions</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Featured Solution - Large Card */}
              {featuredSolution && (
                <div className="mb-8">
                  <Link
                    href={`/solutions/${featuredSolution.slug}`}
                    className="group block"
                  >
                    <article className="relative bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500">
                      <div className="grid md:grid-cols-2">
                        {/* Image Side */}
                        <div className="relative aspect-[4/3] md:aspect-auto bg-secondary overflow-hidden">
                          {featuredSolution.coverImage ? (
                            <Image
                              src={featuredSolution.coverImage}
                              alt={featuredSolution.title}
                              fill
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                              <Shield className="h-24 w-24 text-primary/20" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card/80 hidden md:block" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />

                          {/* Featured Badge */}
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-accent text-accent-foreground">
                              <Zap className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          </div>
                        </div>

                        {/* Content Side */}
                        <div className="p-6 md:p-8 flex flex-col justify-center">
                          <Badge variant="secondary" className="w-fit mb-4">
                            {featuredSolution.usageScenes[0] ? formatUsageSceneLabel(featuredSolution.usageScenes[0] as typeof USAGE_SCENES[number]) : 'General'}
                          </Badge>

                          <h3 className="text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors mb-4">
                            {featuredSolution.title}
                          </h3>

                          {featuredSolution.subtitle && (
                            <p className="text-muted-foreground mb-6 line-clamp-3">
                              {featuredSolution.subtitle}
                            </p>
                          )}

                          {/* Features List */}
                          <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>Hazard Analysis</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>Equipment Guide</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>Standards Info</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>Product Links</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all">
                            <span>Explore Solution</span>
                            <ArrowUpRight className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                </div>
              )}

              {/* Regular Solutions Grid */}
              {regularSolutions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {regularSolutions.map((solution, index) => (
                    <Link
                      key={solution.id}
                      href={`/solutions/${solution.slug}`}
                      className="group block h-full"
                    >
                      <article className="h-full bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 flex flex-col">
                        {/* Image section */}
                        <div className="relative aspect-[16/10] bg-secondary overflow-hidden">
                          {solution.coverImage ? (
                            <Image
                              src={solution.coverImage}
                              alt={solution.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
                              <Shield className="h-12 w-12 text-muted-foreground/20" />
                            </div>
                          )}
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                          {/* Scene badge */}
                          <div className="absolute bottom-3 left-3">
                            <Badge className="bg-white/90 text-foreground hover:bg-white text-xs">
                              {solution.usageScenes[0] ? formatUsageSceneLabel(solution.usageScenes[0] as typeof USAGE_SCENES[number]) : 'General'}
                            </Badge>
                          </div>

                          {/* Index number */}
                          <div className="absolute top-3 right-3">
                            <span className="text-[10px] font-mono text-white/60 bg-black/30 px-2 py-0.5 rounded">
                              #{String(index + 2).padStart(2, '0')}
                            </span>
                          </div>
                        </div>

                        {/* Content section */}
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                            {solution.title}
                          </h3>
                          {solution.subtitle && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
                              {solution.subtitle}
                            </p>
                          )}

                          {/* Bottom action row */}
                          <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                              <span className="text-[10px]">Certified</span>
                            </div>
                            <div className="flex items-center gap-1 text-primary font-medium text-xs group-hover:gap-1.5 transition-all">
                              Details
                              <ChevronRight className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}

              {/* Load More / View All */}
              {solutions.length >= 8 && (
                <div className="mt-10 text-center">
                  <Button variant="outline" size="lg" asChild>
                    <Link href="/products">
                      View All Products
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ============================================
          PPE CATEGORIES - COMPACT
          ============================================ */}
      <section className="py-10 bg-secondary/30">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <HardHat className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">PPE Categories</h2>
                <p className="text-xs text-muted-foreground">Complete head-to-toe protection</p>
              </div>
            </div>
            <Link href="/categories" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all categories <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Horizontal scrollable categories */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {PPE_CATEGORIES.map((category) => {
              const IconComponent = iconMap[category.icon] || Shield
              return (
                <Link
                  key={category.slug}
                  href={`/categories/${category.slug}`}
                  className="group flex-shrink-0"
                >
                  <div className="flex items-center gap-3 px-4 py-3 bg-card rounded-lg border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                      {category.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============================================
          CTA SECTION - COMPACT
          ============================================ */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Ready to Protect Your Workforce?</h2>
                <p className="text-sm opacity-80 mt-1">Get customized quotes with expert consultation</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" className="h-11 px-6" asChild>
                <Link href="/quote">
                  <FileText className="mr-2 h-4 w-4" />
                  Get Quote
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-11 px-6 bg-transparent border-white/30 text-white hover:bg-white hover:text-primary"
                asChild
              >
                <Link href="/products">
                  View Catalog
                </Link>
              </Button>
            </div>
          </div>

          {/* Trust indicators - inline */}
          <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-primary-foreground/10">
            <div className="flex items-center gap-2 text-sm">
              <Award className="h-4 w-4 opacity-70" />
              <span className="opacity-80">CE & ISO Certified</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Factory className="h-4 w-4 opacity-70" />
              <span className="opacity-80">OEM/ODM Available</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 opacity-70" />
              <span className="opacity-80">Global Shipping</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 opacity-70" />
              <span className="opacity-80">24h Response</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
