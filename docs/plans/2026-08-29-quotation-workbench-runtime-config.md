# Quotation Workbench Stage A Runtime Configuration

This file documents configuration only. Creating the migration and code does not authorize a database migration, production enablement, or deployment.

## Feature gate

```dotenv
# Production remains disabled unless this value is exactly true.
QUOTATION_WORKBENCH_ENABLED=false
```

Development and test are enabled unless the value is exactly `false`. Production must keep the value `false` until the additive migration, private storage, malware scanner, artifact samples, and rollback plan are separately approved.

## Development/test private storage

```dotenv
QUOTATION_PRIVATE_STORAGE_PROVIDER=local
# Optional. Defaults to an OS temporary directory outside the repository.
QUOTATION_PRIVATE_LOCAL_ROOT=D:\private-data\quotation-workbench
# Optional override; system Chinese TrueType fonts are detected automatically.
QUOTATION_PDF_FONT_PATH=C:\Windows\Fonts\simhei.ttf
```

Local storage is rejected in production. The configured root must be dedicated to quotation files; never use a workspace root, home directory, or public static directory.

## Private R2 provider

```dotenv
QUOTATION_PRIVATE_STORAGE_PROVIDER=r2-private
QUOTATION_PRIVATE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
QUOTATION_PRIVATE_R2_ACCESS_KEY_ID=<private-bucket-key>
QUOTATION_PRIVATE_R2_SECRET_ACCESS_KEY=<private-bucket-secret>
QUOTATION_PRIVATE_R2_BUCKET=<private-bucket-name>
# Optional override if the server has no suitable system font.
QUOTATION_PDF_FONT_PATH=<absolute-server-font-path>
```

Use a dedicated private bucket and credentials. Do not reuse the storefront public-image bucket or expose an R2 public URL. Secrets are runtime-only and must not be committed.

## PDF fonts

Font selection inspects the exact strings rendered in the PDF, not the entire snapshot. English
output (including specification bullets) uses built-in Helvetica without any font file. Hidden
Chinese alternate names, addresses and contact details do not trigger font loading. Visible
Chinese names, specifications, terms or bilingual headings do.

For visible Unicode text, a readable `QUOTATION_PDF_FONT_PATH` takes priority, followed by
common system TrueType paths. Windows searches `%WINDIR%/Fonts` for SimHei, Noto Sans SC and
DengXian; Linux searches `/usr/share/fonts/truetype/noto`, `/usr/share/fonts/truetype/wqy`,
`/usr/local/share/fonts` and `~/.local/share/fonts`; macOS searches `/Library/Fonts` and
`~/Library/Fonts`. Detection is a bounded list of common filenames, not a recursive scan.

Candidates must be standalone TrueType files with coverage for all displayed characters.
TTC collections, CFF OTF fonts, missing glyphs and unreadable files are skipped. No remote
download occurs. If no candidate is usable, generation returns `DOCUMENT_GENERATION_FAILED`
with a font installation/configuration message. Minimal Linux containers may have no Chinese
TTF; install one or include a compatible font in the deployment and set its runtime path.

## Finalization troubleshooting

Revision action results are displayed inline, including pending, failed and successful requests;
they do not depend on a global toast provider. Failed requests refresh revision state/version,
since a failed finalization can increment the version while restoring READY. Lost network
responses never trigger automatic retries; check current status and formal documents first.

Generation errors identify the failed step (PDF, Excel, images, storage, validation or database).
R2 credential, permission, missing-bucket/file and timeout failures use fixed safe messages.
Failures after claiming the revision include an attempt reference and store the safe explanation
in the existing attempt record. Raw SDK messages, secrets and object keys are never exposed.

For an isolated frontend regression check, run `node scripts/test-quotation-revision-actions.mjs`
and open its printed loopback URL. This harness bundles the real revision-actions component with
mock Server Actions and navigation; it reads no `.env` and performs no database/R2 operations.
Test pending/disabled buttons, font and R2 failures, failed-request version refresh, network
rejection without auto-retry, and successful transition to FINALIZED. Harness styling is minimal;
it is an interaction test, not a full production page or storage integration test.

## Production upload safety

Stage A production uploads intentionally fail closed until an approved malware-scanner adapter is implemented and verified. Enabling the workbench or configuring R2 does not override that safeguard.

## Activation sequence

1. Review and back up the production database.
2. Validate the additive migration on a disposable anonymized database.
3. Configure private storage; for Chinese/Unicode PDFs, verify a compatible system font or configure the optional font path.
4. Verify scanner, upload, download, hash, retention, and artifact samples.
5. Apply the migration during an approved maintenance workflow.
6. Keep `QUOTATION_WORKBENCH_ENABLED=false` until post-migration smoke checks pass.
7. Enable for ADMIN users only and verify existing Product, Quote, Order, authentication, and storefront routes.

Rollback uses the database backup and feature gate. Do not use `prisma db push` or remove quotation tables while formal documents are retained.
