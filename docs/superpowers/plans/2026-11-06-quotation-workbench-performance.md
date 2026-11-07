# Quotation Workbench Performance Implementation Plan

> **For agentic workers:** Use the existing approved scope and execute independent tasks with review. Steps use checkbox syntax.

**Goal:** Reduce quotation tab waiting and original-image transfer while preserving history and admin authorization.

**Architecture:** Use a lean database projection for the sales list, shared navigation outside page loading boundaries, and authenticated derived thumbnails with conditional cache validation. Reuse Next.js 16.1.1, Prisma/PostgreSQL and Sharp without new dependencies or migrations.

**Spec:** `.trellis/tasks/11-06-quotation-workbench-performance/prd.md` (user approved preceding in-chat proposal).

## Global Constraints
- Local changes only; no commit, push, deployment, production DB tests or destructive changes.
- Preserve existing route URLs, historical customer names, raw source images, quotation amounts and write protections.
- Existing unrelated untracked category-navigation documents are not part of this task.

## Review Focus
- Historical customer snapshot names must not silently become current customer names.
- Search across old revisions must still find the parent quotation.
- Cached/304 thumbnail responses must authorize and check current source metadata.
- Image errors and oversized sources must not enter a cache or bypass bounds.
- Rapid link navigation, modifier clicks, browser history and non-workbench admin routes must remain correct.

## Task 1: Sales list projection
- [x] Add meaningful repository tests with large brand-bearing snapshots and SQL-special input.
- [x] Add a lean service under `src/lib/quotation/repositories/`; wire `src/app/admin/sales-quotations/page.tsx` to it. Database extraction returns historical companyName only, plus explicit list fields.
- [x] Update persistence spec and run isolated tests/lint.

## Task 2: Navigation feedback
- [x] Add persistent route-aware workbench navigation in existing `src/app/admin/layout.tsx` and remove duplicate nav from `workbench-header.tsx`.
- [x] Add active/pending feedback and reusable skeleton with loading files for sales-quotations, business-customers, quotation-products and quotation-settings. Keep URL structure.
- [x] Update frontend spec; verify navigation behavior with a local real-Next browser fixture and semantic links.

## Task 3: Private thumbnails
- [x] Add failing image/cache tests for real Sharp output and auth/integrity/conditional paths.
- [x] Implement thumbnail service and extend `/api/admin/quotation-images/[id]` with optional variant defined in PRD. Keep original behavior.
- [x] Update private-file spec and run tests. Parent integrates thumbnail URL into products page to avoid shared-file conflicts.

## Task 4: Product query concurrency and integration
- [x] Parallelize independent category/list/count reads and start defaults after products; retain filtered dependencies.
- [x] Use thumbnail variant on list cards, original on previews. Keep settings reads fresh instead of introducing invalidation complexity.
- [x] Review all patches, run scoped lint/typecheck/quotation tests/production compilation, local browser checks, and document measured limits below.

## Verification completed November 7

- Independent code review: no actionable defects found.
- Three isolated harnesses pass: sales list projection, deferred product-list concurrency, and real Sharp/private thumbnail route/cache behavior.
- Navigation route matching: 3 tests pass. Existing quotation suite: 94 tests pass.
- Scoped ESLint and `git diff --check` pass.
- Full `tsc --noEmit` reports five existing errors in unchanged `src/lib/body-link-map.test.ts` (9/20/31/41) and `src/lib/embeddings.test.ts` (3). Their files and owning source match HEAD. A source-wide typecheck excluding those two baseline test files passes.
- `next build --experimental-build-mode compile` passes with a deliberately unreachable local DATABASE_URL, preventing production database use. This verifies optimized compilation and route collection, not full static generation or a deployable release check.
- Browser fixture uses the actual components/loading files and real Next routing, with a simulated 1.5-second server delay and isolated data. All four links retain the same navigation DOM node, show feedback in 2–19 ms, have one current destination, and avoid document reloads. Rapid switches, back navigation and exclusion on other admin pages pass.
- Fixture CSS source discovery omitted some external component utilities; its mobile screenshot is not visual/layout acceptance evidence. Actual root production compilation includes the component sources. No production latency or live PostgreSQL query timing is claimed.
- Local only: no migration, production data writes, commit, push or deployment.
