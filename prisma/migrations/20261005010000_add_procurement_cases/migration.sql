-- Additive procurement case module; no existing business tables are altered.
CREATE TYPE "CaseStudyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "case_studies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "cooperation_date" DATE,
    "buyer_profile" TEXT NOT NULL DEFAULT '',
    "cover_image" TEXT NOT NULL DEFAULT '',
    "cover_alt" TEXT NOT NULL DEFAULT '',
    "procurement" JSONB NOT NULL DEFAULT '[]',
    "customization" TEXT NOT NULL DEFAULT '',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "gallery" JSONB NOT NULL DEFAULT '[]',
    "related_links" JSONB NOT NULL DEFAULT '[]',
    "status" "CaseStudyStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "seo_title" TEXT NOT NULL DEFAULT '',
    "seo_description" TEXT NOT NULL DEFAULT '',
    "private_notes" TEXT NOT NULL DEFAULT '',
    "publication_approved" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "case_studies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_studies_slug_key" ON "case_studies"("slug");
CREATE INDEX "case_studies_status_featured_sort_order_published_at_idx" ON "case_studies"("status", "featured", "sort_order", "published_at");
