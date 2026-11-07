# Category navigation performance design

Status: proposed; application changes have not been implemented.

## Goal and evidence

Reduce repeated catalog data work and provide prompt navigation feedback. Six production clicks took 0.87–2.16 seconds to update the heading. About 95%–98% of the measured wait overlapped the target RSC request; it is not a measurement of database execution alone. The browser used a local proxy. A local reproduction of the current data chain issued 13–14 SELECTs, excluding metadata/layout. Current reads have no Data Cache or request memoization, and routes have no loading boundary.

## Scope and constraints

- Next.js 16.1.1, React 19.2.3, Prisma 6.19.1; retain Cache Components disabled and existing dependencies.
- Apply to `/products`, `/categories/[slug]`, `/categories/[slug]/[child]`, and shared storefront category navigation.
- Preserve category ordering, desktop and mobile category entries, product display, URLs, permanent redirects, metadata, canonical pagination and structured data.
- Preserve Other Supplies including unassigned products, current active-product filtering, and active descendant traversal through two levels.
- Keep admin queries live and authorized. Introduce public-only readers rather than changing the shared admin getter's payload.
- No database schema migration, framework upgrade or new cache service in this change.
- Do not alter existing search/sort semantics or out-of-range-page policy as incidental performance work.
- Do not test writes against production business records.

## Public read contracts

Create `src/lib/catalog-data.ts` as server-only public reading code and `src/lib/catalog-types.ts` for types derived from Prisma selections.

- `getPublicCategorySnapshot(): Promise<PublicCatalogCategory[]>` selects active categories once, with `id`, `name`, `slug`, `parentId`, `isActive`, `sortOrder`, `description`, `image`, `metaTitle`, and `metaDescription`. No relation includes or counts. Build parent/children/navigation/subtree views from this snapshot.
- `resolvePublicCategory(slug: string): Promise<PublicCategoryContext | null>` returns the category, parent, sorted children/siblings and subtree IDs. Metadata and page use the same request-memoized resolver. Inactive/missing parent handling must match each route's existing behavior; retain `parentId` information so an active child with an absent parent cannot become a root accidentally.
- `getPublicCatalogPage(categorySlug: string | null, page: number, search?: string): Promise<PublicCatalogPage | null>` returns only public card data plus existing pagination. `null` denotes an unresolved category scope, not a query failure. Page size is 12. Product selection excludes content, specifications, cost, supplier/source fields and other detail-only fields. Retain category name, one ordered image and price tiers needed by the current card. Exclude stock: the current card does not display it, and stock mutations from orders are outside this catalog cache contract.
- Primitive normalized arguments form request memoization keys. Preserve existing category page normalization. Search reads use the same narrow selection but bypass persistent caching; unbounded search strings must not populate the shared cache.
- Missing category scopes are resolved before the listing cache. Limit persistent listing keys to pages 1–100; higher valid pages remain live reads with existing behavior. This is a cache-admission limit, not a new pagination limit.
- All Prisma Decimal values passed to components retain existing number conversion. Cache only plain serializable DTOs; build Maps/Sets after reading the cached array. Select only used relation fields, omitting unused timestamp fields. ProductCard's accepted type is narrowed to the selected public relation fields without changing its output.
- Category traversal uses depth and visited guards; preserve root + children + grandchildren behavior even if malformed legacy data contains a cycle. All Products continues to filter product.isActive without newly filtering products by category visibility. Preserve legacy `/products?category=` resolution for both IDs and slugs.

## Caching and mutation contract

Use the existing project's `unstable_cache`/tag pattern, plus React `cache` for request-level duplicate reads. Do not enable Cache Components merely to adopt a newer API.

- TTL: 300 seconds for category snapshots and eligible public listing pages.
- Tags: `catalog-categories` for the snapshot; both `catalog-categories` and `catalog-products` for listing pages.
- Keys include a version prefix and normalized category scope/page. The fixed page size, fixed current ordering and active-only policy are part of the versioned contract. Add any future behavior-changing filter to the key before enabling it.
- `invalidateCatalogCache(scope: 'products' | 'categories'): void` lives in `src/lib/catalog-cache.ts`. Products expire `catalog-products`; categories expire both tags. Use `revalidateTag(tag, { expire: 0 })`, matching `home-cache.ts`. Revalidate `/products` and the category route subtree; category changes also refresh the shared navigation layout.
- Call invalidation after successful persistence, before redirect or failure-prone ancillary work such as IndexNow/embeddings, and after a nontransactional batch that may have partially written even if it reports zero successes. Preserve existing detail-page and homepage invalidation. Inactive draft-only writes need not invalidate the active-product list unless they also change category data; classify writes at their persistence owner.
- Cover product creation/edit/archive/delete/order changes, bulk changes, restoration, collected-product update/import, and category create/update/delete/reparent/visibility changes.
- Direct database scripts do not execute an application cache invalidation automatically. Document their TTL/on-demand revalidation fallback; it is not a strict five-minute freshness SLA. A future requirement for immediate external-script publication requires a separate authenticated application invalidation path.
- The next server read after successful application invalidation must not use the expired price/visibility data. Already-open screens and another browser's prefetched route are not pushed live updates by this mechanism.
- Verify cache storage and invalidation propagation for the actual production instance topology. If multiple instances lack shared tag invalidation, resolve that deployment contract before claiming consistent invalidation.

## Loading and navigation feedback

- Add a small client child inside category Links using `useLinkStatus`. Pending feedback should appear within 100 ms after a hydrated click under the controlled test. Do not mark the destination `aria-current` until committed.
- Add route loading fallbacks for products and categories, with geometry matching the current catalog and accessible status text. Avoid blocking loading fallback construction on a new database query. Preserve existing navigation on resolved pages and reserve its space during fallback.
- Extract the product-results section under Suspense after category resolution, so a slow listing does not block the resolved title/navigation/SEO shell. Treat permanent redirects and not-found decisions before publishing the destination shell. Keep server-rendered product links and structured data with the correct resolved data.
- Subsequent navigation to another category must remain possible while a previous navigation is pending; clear obsolete feedback on commit/cancellation. Respect reduced motion.
- Only after data work is optimized, evaluate intent prefetch on desktop pointer hover (150 ms dwell) or keyboard focus. At most one speculative destination at a time; no viewport-wide full prefetch, no touchstart interception, and no speculative requests when Save-Data/slow-network signals are available. Use documented Next 16.1.1 APIs; ship this only if the controlled comparison demonstrates a benefit.

## Validation and failure matrix

| Case | Expected behavior |
|---|---|
| Warm successful cache | No catalog SQL for the repeated eligible read |
| Cold cache | At most six SELECTs for category snapshot, listing relations and count; shared metadata/layout reads do not duplicate these |
| Category move / old nested URL | Existing permanent canonical redirect; no duplicate category page |
| Inactive child or inactive required parent | Existing inaccessible-route behavior; no exposure through navigation |
| Other Supplies | Assigned and uncategorized products included exactly as before |
| Product price / tier / visibility update | Expired catalog entries; next server request reflects committed state |
| Batch partially persists then fails | Catalog cache invalidated for any possible persisted change |
| Empty category | Genuine empty state remains cacheable |
| Database rejection | Propagate failure; do not cache a successful empty fallback |
| Search or page outside admission range | Live narrow query; existing results and validation semantics preserved |
| Rapid A→B→C clicks / keyboard / mobile | Final intended category and active state agree; pending does not get stuck |

## Performance acceptance

Use a fresh production build and the same device, viewport and network path for before/after samples. Record first visit, warm server-cache navigation, repeat navigation, parent/child transitions and post-mutation reads independently. Use at least 20 valid navigations for medians; report p95 only with enough samples and label sample size. Record click-to-feedback, click-to-correct-content, RSC timing/bytes, SQL counts and image completion separately.

Targets: hydrated pending feedback within 100 ms; at least 50% reduction in warm application catalog-data time; zero warm catalog SQL; cold query count at most six. Aim for a 30% or greater reduction in median click-to-content on the same network; this is a validation target, not a guaranteed result when network latency dominates. Do not promise universal subsecond navigation.

## References

- Existing contract: `.trellis/spec/shared/homepage-performance.md` and `src/lib/home-cache.ts`.
- Backend guidance: `.trellis/spec/backend/performance.md` and `.trellis/spec/backend/database.md`.
- Next APIs: [unstable_cache](https://nextjs.org/docs/app/api-reference/functions/unstable_cache), [revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag), [useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status). Use installed 16.1.1 definitions where current documentation differs.
