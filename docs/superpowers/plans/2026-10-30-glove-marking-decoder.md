# Glove Marking Decoder Implementation Plan

> **For agentic workers:** Follow frozen spec interfaces and approved scope. Use red/green meaningful tests. No git commits or pushes.

**Goal:** Implement a complete non-AI EN388/EN407 glove marking workflow from interpretation to editable RFQ.
**Architecture:** Pure reference/parser/report modules, client decoder in a server metadata shell, independent session-scoped RFQ handoff. Extend existing directory/guides without changing footwear functionality.
**Tech Stack:** Existing Next16/React19/TypeScript/CSS modules/Zod/node:test. No dependencies added.
**Spec:** `.trellis/spec/frontend/glove-marking-decoder.md`; requirements and verified primary sources in `.trellis/tasks/10-30-glove-marking-decoder/prd.md`.

## Global constraints
English store copy, no AI/runtimeexternalAPI, no certification/fit/safety-use judgment, no ANSI conversion, no database mutation, commit/push or deployment. Work in existing user workspace; preserve previous uncommitted allocator changes.

## Review focus
- Ambiguous missing editions and unsupported amendments never silently become a supported edition.
- F in TDMposition is distinct from terminalF; X,0,missingimpact and passP remain separate.
- Unknownstandards/longtokens/prefixes and multiple headers cannot leak into a nearby standard.
- Copied and RFQ reports retain all warnings/unresolvedinput; oversize/denied/expired drafts recover without truncation.
- Mobile codewrap/controls, clipboardpermission failure, case and allocator RFQ remain usable.

### Task1: Reference, parser and complete report
Coreworker owns `src/lib/glove-marking-{reference,decoder}.ts` and parser tests. Consume exact frozen interfaces; implement bounded token/standard scopes, fieldvalidation, sources and original short descriptions. Write tests first, observeRED, implementGREEN. Verify `npx tsx --test src/lib/glove-marking-decoder.test.ts` and scopedlint.

### Task2: Public decoder workbench
UIworker owns only `src/app/(store)/tools/glove-marking-decoder/*`. Consume reference/parser and saveGloveMarkingInquiry interface. Build empty/examples, rawlabeltextarea, optional explicit codecontext, grouped per-field results, warnings/unknown, complete report copy with visible fallback, sources/coverage/buyerchecks, products/guide/RFQ paths. Servermetadata canonical/OG/Breadcrumb/WebApplication. Root browserchecks runtime and responsive behavior.

### Task3: RFQ and discoverability
Integrationworker owns glove inquiry helpers/tests/clientwrapper plus existing quote page, toolshub/frame/sitemap/relatedguides and footweardecoderpage contextual link. Strict2h/versioned opaque draft, regeneratedreport,6000limit, case/allocator precedence. Unit tests firstRED/GREEN. Preserve previous allocator source and tests. Minimal integration only; no recommendation catalog expansion.

### Task4: Verify and review
Root combines tests with existing56regressions, scopedlint/types/build, realbrowser desktop/mobile and production checks including copiedreport/RFQinvalidrecovery. Independent fresh reviewer checks fieldscoping/claimbounds/state/report. Fix concrete findings, distinguish local and deployed state in final.

## Verified result (2026-10-31)
All four tasks implemented locally, preserving previous uncommitted footwear allocation work. Combined74tests (including prior56), scopedESLint, diffcheck and productionbuild (91pages) passed. FullnonincrementalTypeScript retains exactlyfivepre-existing testerrors in body-link-map.test.ts and embeddings.test.ts, with no glovefeaturediagnostics.

Independent review found two parser boundary classes (foreign/malformedstandard scopes and CE/body/size metadata digitruns); both corrected through RED/GREEN regressions and browser verification. Reported AS/NZS/JIS/GB/ANSI/EN407A and metadata cases do not leak protection fields; unresolved text remains visible.

Realbrowser evidence covers desktop/mobile390px, combined12fields, legacy/TDMF/terminalF, explicitcontext, unsupportededitionprecedence,2001char retention/error, longunresolvedwrapping, clipboard-denial manualselection and successpayload (complete4415chars), and exact4593charRFQmessage reporttail. Browserclipboard API was instrumented for QA and restored; no userclipboard read/write. Missing/expired drafts recover to emptyform. Productionmode verifies2sections/12fields/nohorizontaloverflow/canonical and full4418charRFQwithbuyerchecks andlablimits. HTTP /tools7items, footweardecoderbacklink, newpageprimarysources andsitemap all200/pass.

No inquiry emails, newdependencies, databasechanges, commits, pushes or deployment. QA browser and temporaryproductionserver closed; localdev preview remains on3100.
