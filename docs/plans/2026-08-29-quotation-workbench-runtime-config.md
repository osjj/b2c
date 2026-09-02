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
QUOTATION_PDF_FONT_PATH=C:\Windows\Fonts\NotoSansSC-VF.ttf
```

Local storage is rejected in production. The configured root must be dedicated to quotation files; never use a workspace root, home directory, or public static directory.

## Private R2 provider

```dotenv
QUOTATION_PRIVATE_STORAGE_PROVIDER=r2-private
QUOTATION_PRIVATE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
QUOTATION_PRIVATE_R2_ACCESS_KEY_ID=<private-bucket-key>
QUOTATION_PRIVATE_R2_SECRET_ACCESS_KEY=<private-bucket-secret>
QUOTATION_PRIVATE_R2_BUCKET=<private-bucket-name>
QUOTATION_PDF_FONT_PATH=<absolute-server-font-path>
```

Use a dedicated private bucket and credentials. Do not reuse the storefront public-image bucket or expose an R2 public URL. Secrets are runtime-only and must not be committed.

## Production upload safety

Stage A production uploads intentionally fail closed until an approved malware-scanner adapter is implemented and verified. Enabling the workbench or configuring R2 does not override that safeguard.

## Activation sequence

1. Review and back up the production database.
2. Validate the additive migration on a disposable anonymized database.
3. Configure private storage and the Unicode PDF font.
4. Verify scanner, upload, download, hash, retention, and artifact samples.
5. Apply the migration during an approved maintenance workflow.
6. Keep `QUOTATION_WORKBENCH_ENABLED=false` until post-migration smoke checks pass.
7. Enable for ADMIN users only and verify existing Product, Quote, Order, authentication, and storefront routes.

Rollback uses the database backup and feature gate. Do not use `prisma db push` or remove quotation tables while formal documents are retained.
