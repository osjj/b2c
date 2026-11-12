# Fast RFQ Notifications Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Execute within this authorized task without another approval pause.

**Goal:** Durably capture fast RFQs before mail and expose notification status for manual handling.

**Architecture:** Individual private Setting records with atomic leased delivery, bounded SMTP2GO transport, one initial notification attempt and ADMIN status/manual retry. Keep existing product quote logic and old history intact. No scheduled tasks or automatic retries.

**Tech Stack:** Next.js 16, Prisma/PostgreSQL, Zod, Node test/tsx and existing esbuild isolation patterns.

**Spec:** `.trellis/spec/backend/fast-rfq-notifications.md`.

## Global constraints
- No production DB/mail verification, schema migration, added queue dependency or unrelated form flow changes.
- No automatic git commit, deployment or remote scheduler installation.
- Public acceptance means durable save; provider notification is separately tracked.

## Review focus
- Repeated IDs with changed payload, concurrent/expired leases, uncertain provider checkpoint, false provider success, admin authorization before side effects.

## Task 1: Persistence and delivery service
Files: `src/lib/quote-email-outbox.ts`, `src/lib/quote-email-history.ts`, and focused tests. Implement the exact service interfaces in the spec; preserve legacy pagination. Write/run failing tests first, then implement and verify persistence-before-send, manual-only recovery, replay, claims and provider response validation.

## Task 2: Request and operational integration
Files: existing quote-email route/form, admin history/action/page, test package command and operations guide. Make POST enqueue before after(), return saved acceptance, preserve a browser submission ID until acknowledgement, and expose admin state/manual retry. No CLI or host task is required. Run the tests and focused lint.

## Task 3: Independent review and verification
Review the combined diff against the contract and fix concrete findings. Run focused lifecycle/route/UI tests, lint and typecheck without enabling live mail/DB side effects. Report actual local/deployment state; no host scheduler configuration is required.

## Execution ledger
- Ruling: reuse per-request Setting rows rather than introduce a new table — supported by current private Setting patterns and avoids requiring a live schema migration.
- User scope correction: no scheduled task or automatic retry. Remove the CLI and batch drain/backoff; preserve one initial attempt, visible saved/failed statuses and optional manual retry, including expired claims.
- Completed: persistence/notification and request/form/admin integration. Updated lifecycle tests observed RED (failure still pending) before changing to failed/manual handling; prior capture-before-notification and fingerprint regressions remain covered.
- Independent review complete with no remaining blockers; focused lint and isolated-database production build passed. Full typecheck retains five existing test errors; full lint includes existing source and generated/output artifact violations. No commit or deployment performed.
- Manual-only amendment: 11 lifecycle scenarios plus route/UI/action tests and focused lint pass; independent focused review found no issues. Prior build result applies to the previous revision; no scheduler deployment step remains.
