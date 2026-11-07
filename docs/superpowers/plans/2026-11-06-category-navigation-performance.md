# Category Navigation Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce category data latency and give immediate, accurate feedback when switching catalog categories.

**Architecture:** Introduce public-only narrow catalog readers, one shared category snapshot and request memoization. Add tagged Next Data Cache with complete application mutation invalidation, then layer route loading and link pending feedback over the existing navigation. Evaluate bounded intent prefetch only after measuring the core changes.

**Tech Stack:** Next.js 16.1.1, React 19.2.3, Prisma 6.19.1, TypeScript, existing Node/tsx tests and Ego browser.

**Spec:** `docs/superpowers/specs/2026-11-06-category-navigation-performance-design.md`

## Global Constraints

- Retain Cache Components disabled and existing dependencies.
- Preserve category ordering, desktop and mobile category entries, product display, URLs, permanent redirects, metadata, canonical pagination and structured data.
- Keep admin queries live and authorized.
- No database schema migration, framework upgrade or new cache service in this change.
- Do not alter existing search/sort semantics or out-of-range-page policy as incidental performance work.
- Do not test writes against production business records.
- This document is a proposal. No application changes, commits, push or deployment are performed by producing it. Follow project commit rules during execution.

## Review Focus

- Active child with inactive parent: no accidental root/nav exposure; tested in Task 1.
- Missing category / legitimate empty category / database error: three distinct outcomes; tested in Tasks 1–2.
- Partially written import/batch followed by an error: invalidate persisted changes; tested in Task 2.
- Old URL following category move and page-2 metadata: preserve redirects and canonical pagination; tested in Task 1.
- Rapid navigation and mobile/keyboard input: no stale active state or stuck pending; tested in Task 3.

---

### Task 1: Consolidate public catalog reads

**Files**
- Create: `src/lib/catalog-data.ts`, `src/lib/catalog-types.ts`, `src/lib/catalog-data.test.ts`
- Modify: `src/components/store/product-card.tsx`, `src/lib/product-category-navigation.ts`, `src/modules/home-new/components/StorefrontNav.tsx`
- Modify: `src/app/(store)/products/page.tsx`, `src/app/(store)/categories/[slug]/page.tsx`, `src/app/(store)/categories/[slug]/[child]/page.tsx`
- Contract on implementation: `.trellis/spec/shared/catalog-performance.md`

**Interfaces**
- Produces the three readers and Prisma-derived types defined in the design's Public read contracts.
- `PublicCategoryContext` contains category, parent, children, siblings and subtree IDs; the route retains responsibility for canonical redirects/not-found.
- `PublicCatalogPage` contains the narrowed card products and `{page, limit, total, totalPages}` pagination.

- [ ] Write fixture-based tests for active hierarchy traversal through two levels including cycle guards, inactive-parent handling, Other Supplies membership, metadata/page resolver reuse, existing page normalization and old-parent canonical redirects. Assert no detail/source/cost/stock fields in the selected product DTO. Preserve All Products membership and legacy category ID/slug redirects.
- [ ] Run `npx tsx --test src/lib/catalog-data.test.ts` and confirm failures correspond to missing new readers/contracts.
- [ ] Implement the single flat category SELECT and in-memory projections; use React cache around the readers with normalized primitive arguments. Implement narrow product selection with the existing category/image/tier relations and count.
- [ ] Switch the public routes/navigation to these readers. Narrow ProductCard relation typing to match the public DTO. Preserve current HTML, category entries and query behavior.
- [ ] Run the new tests plus `npx tsx --test src/lib/category-pagination.test.ts src/lib/category-seo-content.test.ts src/lib/product-category-selection.test.ts src/lib/product-category-breadcrumbs.test.ts`.
- [ ] Measure query events for the implemented readers using read-only fixtures/configured data: cold catalog page budget ≤6 SELECTs, without metadata/layout duplicates. Review the diff as a coherent first deliverable.

### Task 2: Add tagged caching and complete write invalidation

**Files**
- Create: `src/lib/catalog-cache.ts`, `src/lib/catalog-cache.test.ts`
- Modify: `src/lib/catalog-data.ts`, `src/actions/products.ts`, `src/actions/categories.ts`, `src/actions/collect.ts`, `src/lib/scraper/save-product.ts`
- Modify: `src/app/api/admin/products/batch/route.ts`, `src/app/api/admin/products/batch-update/route.ts`, `src/app/api/admin/products/[id]/restore/route.ts`
- Verify delegation: `src/app/api/admin/products/collect-from-browser/route.ts`, `src/app/api/admin/products/scrape-1688/route.ts`
- Update: `.trellis/spec/shared/catalog-performance.md`

**Interfaces**
- Consumes Task 1 public readers.
- Produces `CATALOG_CACHE_SECONDS = 300`, `CATALOG_CACHE_TAGS` and `invalidateCatalogCache(scope: 'products' | 'categories'): void`.
- Categories tag: `catalog-categories`; products tag: `catalog-products`. Product listing entries carry both tags. Follow the design's normalized keys, page admission and search bypass.

- [ ] Write cache adapter/invalidation tests asserting hit reuse, key separation, normalized page reuse, search/high-page bypass, thrown error propagation, empty-result preservation, expire:0 tags and path refresh behavior.
- [ ] Add isolated mutation fixtures/stubs covering each actual write entry: product create/update/archive/delete/reorder/restore, category reparent/visibility/delete, collected-product replacement and partially successful batch. Assert invalidation happens after any possible persistence, not solely when successCount is positive. Do not invoke real production mutations.
- [ ] Run `npx tsx --test src/lib/catalog-cache.test.ts src/lib/catalog-data.test.ts`; verify the new caching/invalidation assertions fail before implementation.
- [ ] Wrap eligible successful public reads in unstable_cache and retain request memoization. Keep errors thrown; never convert query failure into cached null/empty data.
- [ ] Add the shared invalidator to all listed affected public write paths, preserving existing homepage/detail invalidation and authorization. Place invalidation after persistence and before ancillary work/redirects. Audit delegates so each path invalidates at the persistence owner without redundant caller invalidation; inactive draft-only imports need no product-tag expiry unless they also change the public category snapshot.
- [ ] Re-run targeted tests and verify warm same-key reads issue zero catalog SQL in an isolated production-mode check. Demonstrate committed fixture price/visibility changes are visible to the next server read after invalidation.
- [ ] Document direct-DB script fallback and check production cache topology. Do not declare multi-instance invalidation correct without verifying shared invalidation behavior. Review as one atomic caching-plus-freshness deliverable.

### Task 3: Add immediate feedback and useful loading boundaries

**Files**
- Create: `src/components/store/catalog-link-status.tsx`, `src/components/store/catalog-loading.tsx`, `src/components/store/catalog-product-results.tsx`
- Create: `src/app/(store)/categories/loading.tsx`, `src/app/(store)/products/loading.tsx`
- Modify: `src/components/store/product-category-navigation.tsx`, `src/modules/home-new/components/ProductsNavMenu.tsx`, and the three public listing pages from Task 1

**Interfaces**
- `CatalogLinkStatus(): React.ReactNode` is a client child of Next Link and reads useLinkStatus.
- `CatalogLoading(): React.ReactNode` is a nonblocking, accessible fallback matching catalog geometry.
- `CatalogProductResults({ categorySlug, page, search }): Promise<React.ReactNode>` uses Task 1's reader and renders the current results/count/pagination and their data-dependent structured data. Routes own category resolution, header/navigation and redirects.

- [ ] Reproduce the current missing feedback in the browser with delayed target responses in an isolated local production test. Capture click, feedback and content commit times separately.
- [ ] Implement Link pending feedback with unchanged committed aria-current, reduced-motion behavior and accessible status. Keep all links usable during pending navigation.
- [ ] Add loading files and extract async results under Suspense after route resolution. Do not await product data above that boundary; loading fallback itself must not query the database. Preserve SEO content/JSON-LD with the correct resolved data.
- [ ] Verify desktop, mobile and keyboard navigation, rapid A→B→C clicks, failed/cancelled request feedback, empty categories, pagination, modified-click/new-tab behavior and no-JS usable links. Confirm category navigation remains present on all resolved listing pages.
- [ ] Verify hydrated pending feedback ≤100 ms under a controlled delayed request and no unnecessary full-page blank state. Review as the interaction deliverable.

### Task 4: Evaluate bounded intent prefetch

**Files**
- Conditional create: `src/components/store/catalog-navigation-link.tsx`
- Conditional modify: category sidebar and ProductsNavMenu from Task 3

**Interfaces**
- `CatalogNavigationLink` preserves ordinary Next Link behavior, children and HTML attributes; its only addition is bounded speculative prefetch governed by the design.

- [ ] Measure the Task 1–3 build first. Compare click-to-content and background requests with default prefetch; proceed with this task's implementation only if substantial uncached-on-click waiting remains.
- [ ] Verify installed Next 16.1.1 router.prefetch API and implement 150 ms pointer dwell/keyboard-focus intent, one speculative destination at a time, deduplication, no touch interception and available Save-Data/slow-network checks. Cancel scheduled work on leave/unmount; do not invent network-abort semantics for Next prefetch.
- [ ] Compare controlled pointer, keyboard and touch samples; retain the feature only if navigation improves without a broad increase in speculative traffic. A documented decision to omit this optional task is a valid outcome.

### Task 5: Validate the integrated production build

**Files**
- Create on execution: `output/category-navigation-performance/validation.md` and sanitized timing samples
- Update: `.trellis/spec/shared/catalog-performance.md`

- [ ] Run targeted tests from Tasks 1–2, scoped ESLint, `npx tsc --noEmit`, and `npm run build`. Separate pre-existing failures from regressions with reproducible evidence.
- [ ] Run the fresh build on an isolated available port. Do not use the stale existing `.next` artifact or a development-server compilation delay as a performance comparison.
- [ ] Run the design's before/after matrix on the same network: cold/warm/return visits, parent/child/page2, search, empty/inactive/moved categories and isolated mutation freshness. Collect at least 20 valid navigations for medians, query counts and timing stages.
- [ ] Report targets separately: ≤100 ms pending feedback, zero warm catalog SQL, ≤6 cold SELECTs, ≥50% lower warm catalog-data time; aim for ≥30% lower median click-to-content. Identify the residual network component and do not invent achieved numbers.
- [ ] Review the complete diff, freshness contract and rollback sequence. Roll back readers and their cache usage together if needed; preserve mutation invalidation while any dependent cache remains deployed. Record local/tested/published status precisely. Deployment remains a separate action from this plan request.
