-- Quotation Workbench Stage A foundation.
-- Additive only: this migration creates new enum types, tables, indexes, and
-- foreign keys from the new tables. It does not alter or backfill existing
-- business tables.

CREATE TYPE "QuotationProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE "SalesQuotationOutcomeStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'CANCELLED');
CREATE TYPE "SalesQuotationRevisionState" AS ENUM ('DRAFT', 'READY', 'FINALIZING', 'FINALIZED', 'ISSUED', 'SUPERSEDED', 'VOID');
CREATE TYPE "QuotationDocumentType" AS ENUM ('SNAPSHOT_JSON', 'CUSTOMER_PDF', 'CUSTOMER_EXCEL', 'INTERNAL_EXCEL');
CREATE TYPE "QuotationDocumentLanguage" AS ENUM ('CHINESE', 'ENGLISH', 'BILINGUAL');
CREATE TYPE "QuotationRoundingMode" AS ENUM ('HALF_UP', 'HALF_EVEN', 'DOWN', 'UP');
CREATE TYPE "QuotationAssetType" AS ENUM ('PRODUCT_IMAGE', 'LOGO', 'SIGNATURE', 'SEAL');
CREATE TYPE "QuotationAuditAction" AS ENUM ('CREATE', 'UPDATE', 'STATE_CHANGE', 'FINALIZE', 'ISSUE', 'VOID', 'ARCHIVE', 'DOWNLOAD');
CREATE TYPE "QuotationFileSecurityStatus" AS ENUM ('PENDING', 'CLEAN', 'REJECTED', 'SCAN_FAILED');
CREATE TYPE "QuotationFinalizationStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "business_customers" (
  "id" TEXT NOT NULL,
  "company_name" TEXT NOT NULL,
  "country_code" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_customer_contacts" (
  "id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "title" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_customer_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quotation_products" (
  "id" TEXT NOT NULL,
  "internal_number" TEXT NOT NULL,
  "product_id" TEXT,
  "name_zh" TEXT,
  "name_en" TEXT,
  "sku" TEXT,
  "model" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'pcs',
  "moq" DECIMAL(18,4),
  "specifications" JSONB,
  "standards" JSONB,
  "certificates" JSONB,
  "internal_notes" TEXT,
  "status" "QuotationProductStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quotation_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quotation_products_name_check" CHECK (NULLIF(BTRIM("name_zh"), '') IS NOT NULL OR NULLIF(BTRIM("name_en"), '') IS NOT NULL),
  CONSTRAINT "quotation_products_moq_check" CHECK ("moq" IS NULL OR "moq" > 0)
);

CREATE TABLE "sales_quotations" (
  "id" TEXT NOT NULL,
  "quotation_number" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "outcome_status" "SalesQuotationOutcomeStatus" NOT NULL DEFAULT 'OPEN',
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_quotations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sales_quotation_revisions" (
  "id" TEXT NOT NULL,
  "sales_quotation_id" TEXT NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "state" "SalesQuotationRevisionState" NOT NULL DEFAULT 'DRAFT',
  "document_language" "QuotationDocumentLanguage" NOT NULL DEFAULT 'ENGLISH',
  "template_version" TEXT NOT NULL DEFAULT 'stage-a-v1',
  "quotation_date" DATE NOT NULL,
  "valid_until" DATE,
  "currency" VARCHAR(3) NOT NULL,
  "currency_minor_unit" INTEGER NOT NULL DEFAULT 2,
  "rounding_mode" "QuotationRoundingMode" NOT NULL DEFAULT 'HALF_UP',
  "customer_snapshot" JSONB NOT NULL,
  "public_terms" JSONB,
  "internal_notes" TEXT,
  "subtotal" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "discount_percent" DECIMAL(9,6),
  "shipping_fee" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "other_fee" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(9,6) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "rounding_adjustment" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "total_cost" DECIMAL(18,6),
  "profit" DECIMAL(18,6),
  "finalized_at" TIMESTAMP(3),
  "issued_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_quotation_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sales_quotation_revisions_number_check" CHECK ("revision_number" > 0 AND "version" > 0),
  CONSTRAINT "sales_quotation_revisions_minor_unit_check" CHECK ("currency_minor_unit" BETWEEN 0 AND 4),
  CONSTRAINT "sales_quotation_revisions_money_check" CHECK ("subtotal" >= 0 AND "discount_amount" >= 0 AND "shipping_fee" >= 0 AND "other_fee" >= 0 AND "tax_rate" >= 0 AND "tax_rate" <= 100 AND "tax_amount" >= 0 AND "total" >= 0),
  CONSTRAINT "sales_quotation_revisions_discount_check" CHECK ("discount_percent" IS NULL OR ("discount_amount" = 0 AND "discount_percent" >= 0 AND "discount_percent" <= 100)),
  CONSTRAINT "sales_quotation_revisions_validity_check" CHECK ("valid_until" IS NULL OR "valid_until" >= "quotation_date")
);

CREATE TABLE "sales_quotation_items" (
  "id" TEXT NOT NULL,
  "revision_id" TEXT NOT NULL,
  "quotation_product_id" TEXT,
  "product_id" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "name_zh" TEXT,
  "name_en" TEXT,
  "model" TEXT,
  "sku" TEXT,
  "specifications" JSONB,
  "unit" TEXT NOT NULL DEFAULT 'pcs',
  "quantity" DECIMAL(18,4) NOT NULL,
  "unit_price" DECIMAL(18,6) NOT NULL,
  "discount_amount" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "discount_percent" DECIMAL(9,6),
  "line_total" DECIMAL(18,6) NOT NULL,
  "unit_cost" DECIMAL(18,6),
  "cost_currency" VARCHAR(3),
  "exchange_rate" DECIMAL(18,8),
  "line_cost" DECIMAL(18,6),
  "internal_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_quotation_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sales_quotation_items_name_check" CHECK (NULLIF(BTRIM("name_zh"), '') IS NOT NULL OR NULLIF(BTRIM("name_en"), '') IS NOT NULL),
  CONSTRAINT "sales_quotation_items_source_check" CHECK (NOT ("quotation_product_id" IS NOT NULL AND "product_id" IS NOT NULL)),
  CONSTRAINT "sales_quotation_items_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "sales_quotation_items_money_check" CHECK ("unit_price" >= 0 AND "discount_amount" >= 0 AND "line_total" >= 0 AND ("unit_cost" IS NULL OR "unit_cost" >= 0) AND ("line_cost" IS NULL OR "line_cost" >= 0) AND ("exchange_rate" IS NULL OR "exchange_rate" > 0)),
  CONSTRAINT "sales_quotation_items_discount_check" CHECK ("discount_percent" IS NULL OR ("discount_amount" = 0 AND "discount_percent" >= 0 AND "discount_percent" <= 100)),
  CONSTRAINT "sales_quotation_items_cost_check" CHECK (("unit_cost" IS NULL AND "cost_currency" IS NULL) OR ("unit_cost" IS NOT NULL AND "cost_currency" IS NOT NULL))
);

CREATE TABLE "quotation_source_files" (
  "id" TEXT NOT NULL,
  "sales_quotation_id" TEXT,
  "display_name" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "storage_provider" TEXT NOT NULL,
  "object_key" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "security_status" "QuotationFileSecurityStatus" NOT NULL DEFAULT 'PENDING',
  "uploaded_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "quotation_source_files_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quotation_source_files_size_check" CHECK ("size_bytes" > 0)
);

CREATE TABLE "quotation_product_images" (
  "id" TEXT NOT NULL,
  "quotation_product_id" TEXT NOT NULL,
  "source_file_id" TEXT,
  "display_name" TEXT,
  "object_key" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_customer_visible" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotation_product_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quotation_product_sources" (
  "id" TEXT NOT NULL,
  "quotation_product_id" TEXT NOT NULL,
  "source_file_id" TEXT,
  "source_type" TEXT NOT NULL,
  "supplier_name" TEXT,
  "source_url" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotation_product_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quotation_product_cost_records" (
  "id" TEXT NOT NULL,
  "quotation_product_id" TEXT NOT NULL,
  "amount" DECIMAL(18,6) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "exchange_rate" DECIMAL(18,8),
  "effective_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotation_product_cost_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quotation_product_cost_records_amount_check" CHECK ("amount" >= 0 AND ("exchange_rate" IS NULL OR "exchange_rate" > 0))
);

CREATE TABLE "sales_quotation_item_assets" (
  "id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "source_file_id" TEXT,
  "asset_type" "QuotationAssetType" NOT NULL DEFAULT 'PRODUCT_IMAGE',
  "display_name" TEXT,
  "object_key" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sales_quotation_item_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quotation_finalization_attempts" (
  "id" TEXT NOT NULL,
  "revision_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "status" "QuotationFinalizationStatus" NOT NULL DEFAULT 'PENDING',
  "lease_owner" TEXT,
  "lease_expires_at" TIMESTAMP(3),
  "heartbeat_at" TIMESTAMP(3),
  "failure_code" TEXT,
  "failure_summary" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quotation_finalization_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sales_quotation_documents" (
  "id" TEXT NOT NULL,
  "revision_id" TEXT NOT NULL,
  "attempt_id" TEXT NOT NULL,
  "document_type" "QuotationDocumentType" NOT NULL,
  "language" "QuotationDocumentLanguage" NOT NULL,
  "template_version" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "storage_provider" TEXT NOT NULL,
  "object_key" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sales_quotation_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quotation_audit_logs" (
  "id" TEXT NOT NULL,
  "sales_quotation_id" TEXT,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "action" "QuotationAuditAction" NOT NULL,
  "actor_id" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotation_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quotation_brand_assets" (
  "id" TEXT NOT NULL,
  "asset_type" "QuotationAssetType" NOT NULL,
  "display_name" TEXT NOT NULL,
  "object_key" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "security_status" "QuotationFileSecurityStatus" NOT NULL DEFAULT 'PENDING',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "uploaded_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quotation_brand_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quotation_number_counters" (
  "period" TEXT NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quotation_number_counters_pkey" PRIMARY KEY ("period")
);

CREATE UNIQUE INDEX "quotation_products_internal_number_key" ON "quotation_products"("internal_number");
CREATE UNIQUE INDEX "sales_quotations_quotation_number_key" ON "sales_quotations"("quotation_number");
CREATE UNIQUE INDEX "sales_quotation_revisions_sales_quotation_id_revision_number_key" ON "sales_quotation_revisions"("sales_quotation_id", "revision_number");
CREATE UNIQUE INDEX "quotation_source_files_object_key_key" ON "quotation_source_files"("object_key");
CREATE UNIQUE INDEX "quotation_finalization_attempts_idempotency_key_key" ON "quotation_finalization_attempts"("idempotency_key");
CREATE UNIQUE INDEX "sales_quotation_documents_object_key_key" ON "sales_quotation_documents"("object_key");
CREATE UNIQUE INDEX "sales_quotation_documents_revision_id_document_type_key" ON "sales_quotation_documents"("revision_id", "document_type");
CREATE UNIQUE INDEX "quotation_brand_assets_object_key_key" ON "quotation_brand_assets"("object_key");

CREATE INDEX "business_customers_company_name_idx" ON "business_customers"("company_name");
CREATE INDEX "business_customers_country_code_idx" ON "business_customers"("country_code");
CREATE INDEX "business_customers_email_idx" ON "business_customers"("email");
CREATE INDEX "business_customers_updated_at_idx" ON "business_customers"("updated_at");
CREATE INDEX "business_customer_contacts_customer_id_idx" ON "business_customer_contacts"("customer_id");
CREATE INDEX "business_customer_contacts_email_idx" ON "business_customer_contacts"("email");
CREATE INDEX "quotation_products_product_id_idx" ON "quotation_products"("product_id");
CREATE INDEX "quotation_products_name_zh_idx" ON "quotation_products"("name_zh");
CREATE INDEX "quotation_products_name_en_idx" ON "quotation_products"("name_en");
CREATE INDEX "quotation_products_model_idx" ON "quotation_products"("model");
CREATE INDEX "quotation_products_status_updated_at_idx" ON "quotation_products"("status", "updated_at");
CREATE INDEX "sales_quotations_customer_id_idx" ON "sales_quotations"("customer_id");
CREATE INDEX "sales_quotations_outcome_status_created_at_idx" ON "sales_quotations"("outcome_status", "created_at");
CREATE INDEX "sales_quotations_created_at_idx" ON "sales_quotations"("created_at");
CREATE INDEX "sales_quotation_revisions_sales_quotation_id_idx" ON "sales_quotation_revisions"("sales_quotation_id");
CREATE INDEX "sales_quotation_revisions_state_quotation_date_idx" ON "sales_quotation_revisions"("state", "quotation_date");
CREATE INDEX "sales_quotation_revisions_valid_until_idx" ON "sales_quotation_revisions"("valid_until");
CREATE INDEX "sales_quotation_items_revision_id_sort_order_idx" ON "sales_quotation_items"("revision_id", "sort_order");
CREATE INDEX "sales_quotation_items_quotation_product_id_idx" ON "sales_quotation_items"("quotation_product_id");
CREATE INDEX "sales_quotation_items_product_id_idx" ON "sales_quotation_items"("product_id");
CREATE INDEX "sales_quotation_items_name_zh_idx" ON "sales_quotation_items"("name_zh");
CREATE INDEX "sales_quotation_items_name_en_idx" ON "sales_quotation_items"("name_en");
CREATE INDEX "quotation_product_images_quotation_product_id_sort_order_idx" ON "quotation_product_images"("quotation_product_id", "sort_order");
CREATE INDEX "quotation_product_images_source_file_id_idx" ON "quotation_product_images"("source_file_id");
CREATE INDEX "quotation_product_images_sha256_idx" ON "quotation_product_images"("sha256");
CREATE INDEX "quotation_product_sources_quotation_product_id_idx" ON "quotation_product_sources"("quotation_product_id");
CREATE INDEX "quotation_product_sources_source_file_id_idx" ON "quotation_product_sources"("source_file_id");
CREATE INDEX "quotation_product_cost_records_quotation_product_id_effective_at_idx" ON "quotation_product_cost_records"("quotation_product_id", "effective_at");
CREATE INDEX "sales_quotation_item_assets_item_id_sort_order_idx" ON "sales_quotation_item_assets"("item_id", "sort_order");
CREATE INDEX "sales_quotation_item_assets_source_file_id_idx" ON "sales_quotation_item_assets"("source_file_id");
CREATE INDEX "sales_quotation_item_assets_sha256_idx" ON "sales_quotation_item_assets"("sha256");
CREATE INDEX "quotation_source_files_sales_quotation_id_idx" ON "quotation_source_files"("sales_quotation_id");
CREATE INDEX "quotation_source_files_sha256_idx" ON "quotation_source_files"("sha256");
CREATE INDEX "quotation_source_files_security_status_created_at_idx" ON "quotation_source_files"("security_status", "created_at");
CREATE INDEX "quotation_finalization_attempts_revision_id_status_idx" ON "quotation_finalization_attempts"("revision_id", "status");
CREATE INDEX "quotation_finalization_attempts_status_lease_expires_at_idx" ON "quotation_finalization_attempts"("status", "lease_expires_at");
CREATE INDEX "sales_quotation_documents_revision_id_idx" ON "sales_quotation_documents"("revision_id");
CREATE INDEX "sales_quotation_documents_attempt_id_idx" ON "sales_quotation_documents"("attempt_id");
CREATE INDEX "sales_quotation_documents_sha256_idx" ON "sales_quotation_documents"("sha256");
CREATE INDEX "quotation_audit_logs_sales_quotation_id_idx" ON "quotation_audit_logs"("sales_quotation_id");
CREATE INDEX "quotation_audit_logs_entity_type_entity_id_created_at_idx" ON "quotation_audit_logs"("entity_type", "entity_id", "created_at");
CREATE INDEX "quotation_audit_logs_actor_id_created_at_idx" ON "quotation_audit_logs"("actor_id", "created_at");
CREATE INDEX "quotation_brand_assets_asset_type_is_active_idx" ON "quotation_brand_assets"("asset_type", "is_active");
CREATE INDEX "quotation_brand_assets_sha256_idx" ON "quotation_brand_assets"("sha256");

ALTER TABLE "business_customer_contacts" ADD CONSTRAINT "business_customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotation_products" ADD CONSTRAINT "quotation_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_quotations" ADD CONSTRAINT "sales_quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_quotation_revisions" ADD CONSTRAINT "sales_quotation_revisions_sales_quotation_id_fkey" FOREIGN KEY ("sales_quotation_id") REFERENCES "sales_quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_quotation_items" ADD CONSTRAINT "sales_quotation_items_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "sales_quotation_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_quotation_items" ADD CONSTRAINT "sales_quotation_items_quotation_product_id_fkey" FOREIGN KEY ("quotation_product_id") REFERENCES "quotation_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_quotation_items" ADD CONSTRAINT "sales_quotation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotation_source_files" ADD CONSTRAINT "quotation_source_files_sales_quotation_id_fkey" FOREIGN KEY ("sales_quotation_id") REFERENCES "sales_quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotation_product_images" ADD CONSTRAINT "quotation_product_images_quotation_product_id_fkey" FOREIGN KEY ("quotation_product_id") REFERENCES "quotation_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotation_product_images" ADD CONSTRAINT "quotation_product_images_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "quotation_source_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotation_product_sources" ADD CONSTRAINT "quotation_product_sources_quotation_product_id_fkey" FOREIGN KEY ("quotation_product_id") REFERENCES "quotation_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotation_product_sources" ADD CONSTRAINT "quotation_product_sources_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "quotation_source_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotation_product_cost_records" ADD CONSTRAINT "quotation_product_cost_records_quotation_product_id_fkey" FOREIGN KEY ("quotation_product_id") REFERENCES "quotation_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_quotation_item_assets" ADD CONSTRAINT "sales_quotation_item_assets_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "sales_quotation_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_quotation_item_assets" ADD CONSTRAINT "sales_quotation_item_assets_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "quotation_source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotation_finalization_attempts" ADD CONSTRAINT "quotation_finalization_attempts_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "sales_quotation_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_quotation_documents" ADD CONSTRAINT "sales_quotation_documents_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "sales_quotation_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_quotation_documents" ADD CONSTRAINT "sales_quotation_documents_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "quotation_finalization_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotation_audit_logs" ADD CONSTRAINT "quotation_audit_logs_sales_quotation_id_fkey" FOREIGN KEY ("sales_quotation_id") REFERENCES "sales_quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
