# Usage Scenes Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `Industry` with `USAGE_SCENES` across Solutions and product usage, including schema, data migration, UI, and SEO text.

**Architecture:** Introduce a single source of truth (`USAGE_SCENES`, `UsageScene` type, label formatter, and industry→scene mapping). `Solution` stores `usageScenes: string[]`, `Product.usageScenes` is normalized to the same tag set. Filters and badges use `formatUsageSceneLabel`. Product recommendations use `hasSome` across scenes.

**Tech Stack:** Next.js 16, React 19, Prisma, Zod, TypeScript.

---

### Task 1: Add usage-scene utilities + tests (TDD)

**Files:**
- Create: `tests/usage-scenes.test.ts`
- Modify: `src/types/solution.ts`
- Create (if needed): `src/lib/usage-scenes.ts`

**Step 1: Write the failing test**
```ts
import assert from 'node:assert'
import { formatUsageSceneLabel, mapIndustryToUsageScenes } from '../src/lib/usage-scenes'

assert.equal(formatUsageSceneLabel('height-work'), 'Height Work')
assert.deepEqual(mapIndustryToUsageScenes('CONSTRUCTION'), [
  'construction',
  'height-work',
  'steel-work',
  'falling-objects',
  'fall-protection',
  'heavy-duty',
  'impact-resistant',
  'slip-resistant',
])
```

**Step 2: Run test to verify it fails**
Run: `npx tsx tests/usage-scenes.test.ts`  
Expected: FAIL (module not found or missing exports)

**Step 3: Write minimal implementation**
- Add `USAGE_SCENES` const and `type UsageScene = typeof USAGE_SCENES[number]`
- Implement `formatUsageSceneLabel(scene: UsageScene): string`
- Implement `mapIndustryToUsageScenes(industry: string): UsageScene[]` using the mapping table below

**Step 4: Run test to verify it passes**
Run: `npx tsx tests/usage-scenes.test.ts`  
Expected: PASS

**Mapping table (auto-migration)**
```
CONSTRUCTION   → construction, height-work, steel-work, falling-objects, fall-protection, heavy-duty, impact-resistant, slip-resistant
FACTORY        → heavy-duty, impact-resistant, cut-resistant, eye-protection, steel-work
MINING         → heavy-duty, dusty-work, impact-resistant, slip-resistant
ELECTRICAL     → eye-protection, cut-resistant, impact-resistant
WAREHOUSE      → heavy-duty, slip-resistant, impact-resistant
CHEMICAL       → eye-protection, cut-resistant, impact-resistant, dusty-work
FOOD_PROCESSING→ wet-ground, slip-resistant, cut-resistant, eye-protection
LOGISTICS      → heavy-duty, slip-resistant, impact-resistant
```

---

### Task 2: Update Prisma schema + migrate data

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/solutions-data.json`
- Modify: `prisma/seed.ts` / `prisma/seed-solutions.ts` (if used)
- Create: `scripts/migrate-usage-scenes.ts`

**Step 1: Update schema**
- Remove `enum Industry` and `Solution.industry`
- Add `usageScenes String[] @default([])` to `Solution`
- Remove `@@index([industry])` if present

**Step 2: Add migration script**
- Script reads all `Solution` and `Product` records
- For Solutions: map old `industry` to `usageScenes` via mapping table
- For Products: replace any old enum strings in `usageScenes` with mapped tags (dedupe)

**Step 3: Update seed data**
- Replace `industry` with `usageScenes` in `prisma/solutions-data.json`
- Ensure seed uses new field names

**Step 4: Run migration**
Run: `npm run db:migrate`  
Expected: Prisma migration created + applied

---

### Task 3: Update server actions (solutions/products)

**Files:**
- Modify: `src/actions/solutions.ts`
- Modify: `src/actions/products.ts` (usageScenes validation)

**Step 1: Adjust Zod schema**
- Replace `industry` with `usageScenes: z.array(z.string()).min(1)`

**Step 2: Update filters**
- `getSolutions({ usageScene })` → `where: { usageScenes: { has: usageScene } }`

**Step 3: Update product matching**
- `getProductsBySolution(usageScenes, { limit })` → `usageScenes: { hasSome: usageScenes }`

---

### Task 4: Update types + constants

**Files:**
- Modify: `src/types/solution.ts`

**Steps:**
- Remove `INDUSTRY_LABELS`
- Add `USAGE_SCENES`, `UsageScene` type, and `formatUsageSceneLabel`
- Update `SolutionFormData`, `SolutionListItem`, and any `Industry` usage to `usageScenes: UsageScene[]`
- Remove re-export of `Industry`

---

### Task 5: Admin UI updates

**Files:**
- Modify: `src/components/admin/solution-form.tsx`
- Modify: `src/app/admin/solutions/page.tsx`

**Steps:**
- Replace industry `<Select>` with multi-checkbox `usageScenes` list
- Update filter param from `industry` to `usageScene`
- Display `usageScenes` labels in table (join first 2, show `+n`)

---

### Task 6: Store UI updates

**Files:**
- Modify: `src/app/(store)/solutions/page.tsx`
- Modify: `src/app/(store)/solutions/[slug]/page.tsx`
- Modify: `src/components/store/solution-detail/hero.tsx`

**Steps:**
- Replace industry tabs with usage-scene tabs
- Update query param to `scene` (or `usageScene`) consistently
- Update metadata to use usage-scene labels
- Update badges/hero to show usage-scene labels

---

### Task 7: Product form update

**Files:**
- Modify: `src/components/admin/product-form.tsx`

**Steps:**
- Replace `INDUSTRY_LABELS` with `USAGE_SCENES`
- Use `formatUsageSceneLabel` for labels

---

### Task 8: Verification

**Steps:**
- Run `npx tsx tests/usage-scenes.test.ts`
- Optional: `npm run lint` (expect existing baseline failures)

---

## Notes / Open Questions
- UI test coverage is not available in repo; plan includes only unit tests for mapping utilities.
- If you want different mapping for any Industry → Usage Scenes, update the table before execution.

