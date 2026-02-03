import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Award, ChevronRight, Factory, HardHat, Shield, ShieldCheck } from 'lucide-react'
import { getSolutions } from '@/actions/solutions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { INDUSTRY_LABELS } from '@/types/solution'
import type { Industry } from '@prisma/client'

export const metadata: Metadata = {
  title: 'Industry Solutions | PPE Pro',
  description: 'Discover comprehensive PPE solutions tailored for your industry. From construction to chemical processing, we have the safety equipment you need.',
  keywords: ['PPE', 'safety solutions', 'industry PPE', 'protective equipment', 'workplace safety'],
}

const metalTextureStyle = {
  backgroundImage:
    'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.12) 1px, transparent 0), linear-gradient(120deg, rgba(15,23,42,0.04), transparent 42%, rgba(15,23,42,0.08))',
  backgroundSize: '30px 30px, 100% 100%',
}

function MetalTexture() {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-25"
      style={metalTextureStyle}
    />
  )
}

function BlueprintBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute left-[12%] top-[14%] h-56 w-56 rounded-full bg-blue-500/18 blur-3xl" />
      <div className="absolute right-[10%] top-[38%] h-64 w-64 rounded-full bg-blue-500/16 blur-3xl" />
      <div className="absolute left-[22%] bottom-[12%] h-60 w-60 rounded-full bg-blue-500/14 blur-3xl" />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(30,64,175,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(30,64,175,0.18)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(30,64,175,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(30,64,175,0.22)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="absolute left-[6%] top-[10%] h-16 w-16 border-l-2 border-t-2 border-blue-600/40" />
      <div className="absolute right-[8%] top-[18%] h-16 w-16 border-r-2 border-t-2 border-blue-600/40" />
      <div className="absolute left-[10%] bottom-[14%] h-20 w-20 border-l-2 border-b-2 border-blue-600/40" />
      <div className="absolute right-[12%] bottom-[12%] h-20 w-20 border-r-2 border-b-2 border-blue-600/40" />
      <div className="absolute left-[18%] top-[42%] h-px w-[36%] bg-blue-600/30" />
      <div className="absolute right-[14%] top-[58%] h-px w-[32%] bg-blue-600/30" />
      <div className="absolute left-[48%] top-[22%] h-12 w-12 rounded-full border border-blue-600/40" />
    </div>
  )
}

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ industry?: string }>
}) {
  const params = await searchParams
  const industryFilter = params.industry as Industry | undefined

  const { solutions } = await getSolutions({
    activeOnly: true,
    industry: industryFilter,
    limit: 50,
  })

  const industries = Object.entries(INDUSTRY_LABELS) as [Industry, string][]
  const activeIndustryCount = new Set(solutions.map((solution) => solution.industry)).size
  const featuredSolutions = solutions.slice(0, 3)
  const activeIndustryLabel = industryFilter ? INDUSTRY_LABELS[industryFilter] : 'All Industries'

  return (
    <div className="relative overflow-hidden bg-ppe-bg-page">
      <BlueprintBackground />
      <div className="pointer-events-none absolute -top-40 right-0 z-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-40 z-0 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-secondary/60 via-background to-background">
          <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
          <div className="container mx-auto relative py-16 md:py-24 px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Industry Solutions</span>
              </div>
              <h1 className="mt-6 font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                PPE strategies built for high-risk operations.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl">
                Match hazards, standards, and PPE categories with solutions engineered for your industry&apos;s exact conditions.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/products">Browse Products</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/cases">See Success Cases</Link>
                </Button>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="relative overflow-hidden rounded-xl border border-foreground/10 bg-background/85 px-4 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.12)]">
                  <MetalTexture />
                  <div className="relative z-10">
                    <p className="text-2xl font-bold text-foreground">{solutions.length}+</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Solutions</p>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-foreground/10 bg-background/85 px-4 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.12)]">
                  <MetalTexture />
                  <div className="relative z-10">
                    <p className="text-2xl font-bold text-foreground">
                      {activeIndustryCount || industries.length}+
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Industries</p>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-foreground/10 bg-background/85 px-4 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.12)]">
                  <MetalTexture />
                  <div className="relative z-10">
                    <p className="text-2xl font-bold text-foreground">Dedicated</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Support</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-card/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
                <MetalTexture />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <HardHat className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Site Ready</p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      Built for complex jobsite conditions.
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Align PPE choices with hazards, compliance, and workflow realities.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-card/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
                <MetalTexture />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Factory className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Scale Ready</p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      OEM/ODM programs for industrial buyers.
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Configure product specs, branding, and volume to your procurement plan.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-card/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
                <MetalTexture />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Compliance</p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      Standards-driven selection and documentation.
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Map equipment to certification and safety policy requirements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </section>

        {/* Industry Filter Tabs */}
        <section className="sticky top-16 z-10 border-y border-foreground/10 bg-background/80 backdrop-blur">
          <div className="container mx-auto py-4 px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Showing</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-foreground">{activeIndustryLabel}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{solutions.length} active solutions</span>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Link href="/solutions" className="cursor-pointer">
                  <Button
                    variant={!industryFilter ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full"
                  >
                    All Industries
                  </Button>
                </Link>
                {industries.map(([value, label]) => (
                  <Link key={value} href={`/solutions?industry=${value}`} className="cursor-pointer">
                    <Button
                      variant={industryFilter === value ? 'default' : 'outline'}
                      size="sm"
                      className="whitespace-nowrap rounded-full"
                    >
                      {label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Solutions Grid */}
        <section className="relative py-12 md:py-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background" />
          <div className="container mx-auto relative z-10 px-6 lg:px-8">
            {solutions.length === 0 ? (
              <div className="text-center py-16">
                <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">No Solutions Found</h2>
                <p className="text-muted-foreground mb-6">
                  {industryFilter
                    ? `No solutions available for ${INDUSTRY_LABELS[industryFilter]} yet.`
                    : 'No solutions available at the moment.'}
                </p>
                {industryFilter && (
                  <Button asChild variant="outline">
                    <Link href="/solutions">View All Solutions</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {solutions.map((solution) => (
                  <Link
                    key={solution.id}
                    href={`/solutions/${solution.slug}`}
                    className="group block h-full cursor-pointer"
                  >
                    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-card/90 shadow-[0_18px_40px_rgba(15,23,42,0.14)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.22)]">
                      {/* Cover Image */}
                      <div className="relative aspect-[16/10] bg-muted">
                        {solution.coverImage ? (
                          <Image
                            src={solution.coverImage}
                            alt={solution.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Shield className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                        <Badge className="absolute bottom-4 left-4 bg-white/90 text-foreground">
                          {INDUSTRY_LABELS[solution.industry]}
                        </Badge>
                      </div>

                      {/* Content */}
                      <div className="relative flex flex-1 flex-col overflow-hidden p-6">
                        <MetalTexture />
                        <div className="relative z-10 flex flex-1 flex-col">
                          <h2 className="text-xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                            {solution.title}
                          </h2>
                          {solution.subtitle && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2 flex-1">
                              {solution.subtitle}
                            </p>
                          )}
                          <div className="mt-5 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Award className="h-4 w-4 text-primary" />
                              <span>Standards-ready guidance</span>
                            </div>
                            <div className="flex items-center gap-2 text-primary font-medium">
                              View Details
                              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Featured Highlights */}
        {featuredSolutions.length > 0 && (
          <section className="relative py-12 md:py-16">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-secondary/40 via-background to-secondary/20" />
            <div className="container mx-auto relative z-10 px-6 lg:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-primary">Highlights</p>
                  <h2 className="mt-3 text-2xl md:text-3xl font-bold">Featured Industry Solutions</h2>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/solutions">View All Solutions</Link>
                </Button>
              </div>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {featuredSolutions.map((solution) => (
                  <Link
                    key={solution.id}
                    href={`/solutions/${solution.slug}`}
                    className="group block cursor-pointer"
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-background/85 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.14)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(15,23,42,0.2)]">
                      <MetalTexture />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-primary/10 text-primary">
                            {INDUSTRY_LABELS[solution.industry]}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {solution.title}
                        </h3>
                        {solution.subtitle && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {solution.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SEO Content Block */}
        <section className="relative py-12 md:py-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/40 via-background to-background" />
          <div className="container mx-auto relative z-10 px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div className="relative overflow-hidden rounded-3xl border border-foreground/10 bg-background/85 p-8 shadow-[0_18px_44px_rgba(15,23,42,0.14)]">
                <MetalTexture />
                <div className="relative z-10">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">
                    Why Choose Industry-Specific PPE Solutions?
                  </h2>
                  <div className="prose prose-lg max-w-none text-muted-foreground">
                    <p>
                      Different industries face unique hazards that require specialized personal protective equipment. Our industry-specific PPE solutions are designed to address the particular risks and safety standards relevant to your workplace.
                    </p>
                    <p>
                      From construction sites requiring head and fall protection to chemical facilities needing respiratory and body protection, we provide comprehensive safety equipment packages tailored to your industry&apos;s needs.
                    </p>
                    <p>
                      Each solution includes detailed information about common hazards, recommended PPE categories, material specifications, and relevant safety standards to help you make informed decisions about workplace safety.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-foreground/10 bg-background/80 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.14)]">
                <MetalTexture />
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-foreground">What&apos;s included</h3>
                  <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium text-foreground">Hazard mapping</p>
                        <p>Identify exposure points and required protection levels.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium text-foreground">PPE category breakdown</p>
                        <p>Translate operational needs into equipment categories.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium text-foreground">Standards guidance</p>
                        <p>Align procurement with certifications and compliance.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium text-foreground">Recommended products</p>
                        <p>Find vetted equipment for performance and comfort.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
