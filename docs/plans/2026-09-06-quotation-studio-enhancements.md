# Quotation studio enhancements

## Scope and isolation

Customer directory, reusable product fields/catalog copy, independent company contact fields,
dated company seal, and a built-in customer Excel layout. Local implementation only; no production
DB connection, migration, deletion, deployment, or live AI call. Storefront Product/Order/User/Quote
tables are never written. Formal prior versions and files remain unchanged.

## Contracts

- Customer form: name required, country/email/phone-or-WhatsApp/gender/company/notes optional.
  Existing BusinessCustomer.companyName stores the display name, countryCode stores the optional
  country text. Extra company/gender use Setting `quotation.customer-profile.<id>` (no schema
  migration). Old records use their existing display names; no inferred names/genders. Existing
  contact children/address are preserved. Updates require id plus expectedUpdatedAt, updateMany
  guard, metadata upsert and audit in one transaction. Separate from storefront user accounts.
- Common products: specifications, description and packaging are independent fields. Existing
  specifications JSON stores specification lines; `quotation.product-defaults.<id>` stores selling
  price, currency, optional unitCost, description and packaging. Old specifications remain readable.
  Common-product fill combines all three visible text fields, preserves selected images and copies
  cost only into internal quote valuation fields. Different currencies do not silently convert.
- Catalog search/import: ADMIN + feature gate, 20 active search results. Input productId,
  expected source updatedAt and includeImages. Copy source name/specifications/description/price/cost
  (storefront USD), default unit pcs explicitly reviewable, packaging blank. No invented facts.
  Copy up to eight source images via read-only S3 GetObject from the configured public R2 bucket,
  never fetch arbitrary URL hosts. Bound reads to 5 MiB/image and 20 seconds, validate/decode and
  normalize PNG, store in quotation-private storage. Source rows/images/product/defaults/audit
  committed together; failed/duplicate attempts clean their new private objects. Quote-only advisory
  lock serializes imports for the same catalog product; repeat import opens existing record, never
  overwrites manual edits. Does not update catalog data, variants, stock, or pricing.
- Brand: address (left), contactLine/website/email (right), separate validated fields. Uploaded seal
  auto-selects useSeal, explicit checkbox can disable it. Existing disabled seals remain disabled
  with a warning. Snapshot on draft save; new formal generation refreshes saved brand settings once.
  Preview still omits seal, formal PDF/Excel include seal and
  quote date under the image plus a readable date caption. Transparent PNG recommended. Settings
  changes do not mutate finalized files.
- Excel studio template: landscape A4, company header, customer/quote metadata, photo/specification
  blocks, exact locked amounts, right-aligned summary, terms, dated seal. Private costs/supplier data
  never enter customer output. Formal decimal strings intentionally preserve authoritative snapshot
  precision (not an editable recalculating financial model). Legacy stage-a format is retained.

## Validation matrix

| Case | Expected |
| --- | --- |
| Name-only customer | saves with optional blank fields |
| Invalid optional email / stale customer or product timestamp | explicit error, no partial updates |
| Repeat catalog import | open existing, no overwrite |
| Foreign image URL / oversize/corrupt source | reject, no catalog write |
| Private-storage or DB failure | no successful partial import; clean new staging objects |
| Cost filled | internal valuation only, unchanged customer amounts |
| Quotation text contains quotes or formula prefix | literal safe cells; validation accepts exact text |
| Enabled seal, formal generation | PDF and Excel contain image plus snapshot date |
| Preview / disabled seal | no seal |

## Verification boundary

Unit/schema/artifact checks and isolated action/UI tests do not prove production database locking,
R2 permissions, reverse-proxy limits, or deployed environment configuration. Native Excel read-only
PDF export is used for visual verification of the generated workbook, without saving it or touching
user workbooks. Production remains a separate, explicitly authorized deployment.

## Local verification (2026-09-06)

- `npm run test:quotation`: 47/47 pass (includes new schema, cost privacy and formal artifact cases).
- `node scripts/test-quotation-studio-actions.mjs`: real action functions with isolated transaction,
  public-read/private-write fixtures; optional customer fields, optimistic locking, import idempotency,
  rollback cleanup, administrator/feature gates pass. No external I/O.
- `node scripts/test-quotation-ai-finalize.mjs` and `node scripts/test-quotation-write-boundaries.mjs`:
  finalizer/idempotency/error restoration and eight existing write-boundary scenarios pass; mocked AI.
- `node scripts/test-quotation-studio-ui.mjs`: actual React forms in headless Edge; name-only and full
  customer, separate product fields, company settings, 1 MiB brand-image limit, automatic seal enable,
  import confirmation/cancel, and 390px layouts pass. Server actions and upload endpoint are fixtures.
- Changed-file ESLint and `git diff --check` pass. Full TypeScript check still reports the seven
  pre-existing errors in `output/s1p-high-cut-safety-shoes/upload-assets.ts`,
  `src/lib/body-link-map.test.ts`, and `src/lib/embeddings.test.ts`; no quotation errors reported.
- Actual PDF/XLSX generators produce `output/pdf/quotation-studio-review.pdf` and `.xlsx` using
  synthetic product/customer data and a SAMPLE / NOT VALID seal. Both PDF pages visually inspected;
  XLSX opened read-only in native Microsoft Excel, exported to PDF and both printed pages inspected.
  No real customer document was generated or sent. Review fixtures do not invoke the configured API.

Brand image upload now shows/enforces the existing one-image / 1 MiB server snapshot contract;
ordinary product uploads retain their existing eight-image / 5 MiB-per-image limits.

## Brand export correction

New studio finalizations refresh brand assets from saved workbench settings once, after the
idempotency/state claim and before AI/PDF/Excel generation. `refreshFinalizationBrand(snapshot)`
returns a new snapshot with the current validated brand; no settings row preserves the draft brand,
and legacy stage-a snapshots bypass the refresh. All renderers consume that one frozen snapshot.
Explicit useSeal=false removes the seal; enabled but missing/invalid assets fail and restore READY.
Successful idempotent replays and downloads never refresh brand or rewrite existing formal files.
No changes to customer/product/money snapshots, environment configuration or database schema.

Excel embeds the current Logo and seal as real image drawings, validates both alongside product
images, and uses a normal worksheet view (no frozen/split rows). Print-title rows are independent
of scrolling and remain for printed multipage readability. PDF image validation includes brand
assets. UI explicitly says previews omit seals; use formal generation for customer delivery.

Regression cases: old draft without seal + newly saved enabled seal; disabled seal; missing image;
corrupt image hash; unchanged idempotent replay after settings edits; no settings row; Excel Logo,
seal, exact monetary strings and absence of frozen panes. External I/O remains mocked in tests.

Verified correction: 47 quotation tests and expanded isolated finalization tests pass. Real form
browser harness passes. Native Excel read-only inspection reports FreezePanes=False and five
drawings in the synthetic review (three product photos + Logo + seal). Both printed Excel pages
and PDF seal page visually inspected. No live customer data, production API, DB or R2 calls.

## Text styling refinement

Product names, visible description/specification notes and public quotation terms use the navy
theme color (#193F66) in studio PDF/Excel. Brand values receive display-only Address:, Contact:,
Website: and Email: prefixes; blank values are omitted and existing matching prefixes are not
duplicated. Address stays left, contact/site/email stay right. Labels participate in wrapping and
Excel header height calculations. Stored field values, monetary data and formal history are unchanged.
`preview-simple-quotation.ts --studio-review --text-review` adds synthetic Chinese name/terms and
a long address for visual regression; no real customer or external API is used.

Verified refinement: all 48 quotation tests and scoped ESLint pass. Both PDF pages and both
native Excel print-export pages were visually inspected, including Chinese names/terms and
long labeled addresses. PDF text-color readback confirms Chinese text uses #193F66.
