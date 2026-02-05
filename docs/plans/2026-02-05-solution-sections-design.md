# Solution Sections v2 Alignment (9 Types Only)

Date: 2026-02-05
Status: Accepted

## Goal
Align Solution pages to exactly nine section types and remove all legacy section types and renderers. Existing pages will require manual reconfiguration.

## In Scope
- Section types: `hero`, `intro`, `hazard-table`, `task-ppe`, `ppe-categories`, `products`, `standards`, `faq`, `final-cta`.
- Admin editors and selectors for the nine types only.
- Store renderers for the nine types only.
- Detail page logic updated to use the new types.
- Legacy types removed: `rich-text`, `table`, `product-list`, `ppe-grid`, `materials-grid`, `cta`.

## Out of Scope
- Data migration from legacy types.
- Automated tests beyond lightweight verification.

## Data Model
- `SolutionSection.type` is constrained to the nine types above.
- `SolutionSection.data` follows per-type interfaces in `src/types/solution-section.ts`.
- `SolutionProductLink` is used only for `products` sections in `manual` mode.

## Admin UX
- Section type selector lists only the nine types.
- Editors:
  - `hero`: subtitle + CTA buttons + TOC toggle.
  - `intro`: EditorJS content.
  - `hazard-table`: editable columns and rows.
  - `task-ppe`: tasks with PPE items (required/recommended/optional).
  - `ppe-categories`: category cards with per-category description.
  - `products`: `manual` or `auto` mode; manual uses product search + ordering; auto uses rule fields + max.
  - `standards`: structured list of code/name/description/region.
  - `faq`: list of question/answer pairs.
  - `final-cta`: heading/description + CTA buttons + `showContactForm` toggle.

## Store Rendering
- `SectionRenderer` switches only on the nine types.
- Each renderer returns `null` if required data is missing.
- `products` rendering:
  - `manual`: uses linked products from `SolutionProductLink`.
  - `auto`: uses `usageScenes` + optional `filterBy` and `filterValue`.
- `final-cta` renders CTA buttons; if no contact form component exists, ignore `showContactForm` without error.

## Detail Page Data Flow
- Fetch solution + sections + product links.
- Build `productsByBlock` keyed by section `key`.
- Pass section data, categories, and products into renderers.
- Hero remains a page-level section but consumes the `hero` section data (subtitle, CTA buttons, TOC toggle).

## Error Handling
- Missing/empty data results in section not rendering.
- No implicit fallback from manual to auto for `products` (empty section if no linked products).

## Verification
- `rg` search ensures no legacy type strings remain in app code.
- Manual checklist:
  - Create solution, add all nine sections, save, reload, and verify store rendering.
  - Validate `products` manual and auto modes.
  - Validate `intro` EditorJS render output.

## Acceptance
- Only nine section types exist in admin UI and store renderers.
- Legacy renderers and types are removed or unused.
- Existing solutions with legacy sections do not render those legacy sections.
