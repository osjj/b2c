# Safety Footwear Bulk Size Allocator Implementation Plan

> **For agentic workers:** Follow the approved scope, frozen interfaces below and red/green tests. No commits or pushes.

**Goal:** Deliver a complete non-AI safety-footwear size allocation workflow through Excel and editable RFQ.
**Architecture:** Pure typed aggregation and file modules, client workbench UI, server metadata shell, and session-scoped validated RFQ handoff. Keep existing case inquiry behavior.
**Tech Stack:** Existing Next16/React19/TypeScript, CSS modules/Tailwind, exceljs, node:test/tsx. No dependency additions.
**Spec:** `.trellis/spec/frontend/footwear-size-allocation.md` and `.trellis/tasks/10-30-footwear-size-allocation/prd.md`.

## Global Constraints
English public copy; no AI calls, automatic fit conversion, database changes or external publication. Work in the clean existing user project on b2cOrB2b; preserve concurrent edits. No git commits/push. Use validated external data, no any/non-null assertions or ignored type errors.

## Review Focus
- Duplicate rows merge before spare rounding; different model/color/system never merge.
- Invalid inputs/imports block actions without erasing existing rows or silently dropping lines.
- Final overrides propagate identically into UI, real XLSX and RFQ; input changes clear stale overrides.
- Expired/denied/corrupted storage recovers visibly; message and entry URL limits remain within existing API.
- Narrow screens, keyboard navigation, download lifecycle and existing case RFQ remain usable.

### Task1: Pure allocation and file boundary
Owner: core worker. Files: `src/lib/footwear-size-allocation{,-files}.ts` plus corresponding tests.
Consumes/produces: exact interfaces in code-spec. Write node:test cases first; run to observe missing behavior, implement, rerun. Test base15 at10%=17, grouped rounding, model/color/system isolation, invalid numeric and limits, overrides, quoted CSV/TSV/Chinese headers, XLSX formulas and real workbook roundtrip. Verification: `npx tsx --test src/lib/footwear-size-allocation*.test.ts`.

### Task2: Public page and interactive workbench
Owner: UI worker. Files: new route `src/app/(store)/tools/footwear-size-allocation/*` only.
Consumes: Task1 frozen allocation/files and Task3 `saveFootwearInquiry` API. Produces server page metadata/breadcrumb/related content and accessible responsive client. Build editable input table, import defaults+preview+apply, reset/example/add/remove, spare percentage, result overrides, summary, template/XLSX downloads and RFQ action. Verify behavior in real browser after modules arrive, plus lint/typecheck; avoid tautological source-text tests.

### Task3: RFQ and discoverability integration
Owner: integration worker. Files: `src/lib/footwear-size-inquiry{,.test}.ts`, `src/components/store/footwear-allocation-inquiry.tsx`, existing quote page/form, tools directory/frame, size-guide page, sitemap, related-guides (and minimal required recommendation mappings if used).
Consumes Task1 typed plan. Produces exact saved-draft helper and safe quote wrapper contract. Write pure RFQ tests RED, implement and run GREEN. Short opaque draft URL, 2h expiry, no raw source data; message <=6000 without silent truncation, identity remounting and case precedence. Update directory counts dynamically and item metadata. Verify scoped tests plus existing case inquiry suite.

### Task4: Integration, browser QA and independent review
Owner: root. Run all scoped tests/lint/full TypeScript/build. Exercise desktop/mobile, invalid paste and workbook upload, grouping/rounding/manual quantities, actual XLSX download/readback, RFQ prefill and missing draft. Capture meaningful evidence and fix real defects. Fresh check agent reviews all task changes against PRD/spec. Final report distinguishes local implementation from deployed state and lists any pre-existing check failures.

## Verified result (2026-10-30)
All four tasks are implemented locally. Combined56 tests, scoped ESLint, diff check and final production build passed. Full nonincremental TypeScript retains exactly five pre-existing errors in body-link-map.test.ts and embeddings.test.ts; no new feature diagnostics.

Browser evidence covers desktop and390px production rendering, grouped spare rounding, manual final18 and total27 in real downloaded XLSX and RFQ, actual XLSX preview/application, formula/negative quantity rejection, read-only import previews, template download, missing/expired draft recovery,1,000,000-pair mobile summaries and1140px tool navigation. HTTP production checks confirm tools directory6items, shoe-guide backlink and sitemap entry all return200. No inquiry was sent.

Independent read-only review found no additional data-integrity/handoff defects. Root fixed a client/server barrel import discovered by real RFQ rendering, preserved manual quantities during import previews, stacked mobile summary cards for large totals and contained narrow desktop tabs. Changes are uncommitted, unpushed and undeployed. Local dev preview remains on3100; temporary production/QA browser sessions were closed.
