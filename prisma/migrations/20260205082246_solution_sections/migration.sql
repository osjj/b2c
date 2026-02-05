/*
  Warnings:

  - You are about to drop the column `coverImage` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `faqContent` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `hazardsContent` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `materials` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `meta_description` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `meta_keywords` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `meta_title` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `ppeCategories` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `standardsContent` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `subtitle` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `solutions` table. All the data in the column will be lost.
  - You are about to drop the column `usageScenes` on the `solutions` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `solutions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "solutions_isActive_idx";

-- AlterTable
ALTER TABLE "solutions" DROP COLUMN "coverImage",
DROP COLUMN "createdAt",
DROP COLUMN "faqContent",
DROP COLUMN "hazardsContent",
DROP COLUMN "isActive",
DROP COLUMN "materials",
DROP COLUMN "meta_description",
DROP COLUMN "meta_keywords",
DROP COLUMN "meta_title",
DROP COLUMN "ppeCategories",
DROP COLUMN "sortOrder",
DROP COLUMN "standardsContent",
DROP COLUMN "subtitle",
DROP COLUMN "updatedAt",
DROP COLUMN "usageScenes",
ADD COLUMN     "cover_image" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "seo_description" TEXT,
ADD COLUMN     "seo_keywords" TEXT,
ADD COLUMN     "seo_title" TEXT,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usage_scenes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "solution_sections" (
    "id" TEXT NOT NULL,
    "solution_id" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solution_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solution_product_links" (
    "id" TEXT NOT NULL,
    "solution_id" TEXT NOT NULL,
    "block_key" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solution_product_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solution_sections_solution_id_sort_idx" ON "solution_sections"("solution_id", "sort");

-- CreateIndex
CREATE INDEX "solution_sections_solution_id_type_idx" ON "solution_sections"("solution_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "solution_sections_solution_id_key_key" ON "solution_sections"("solution_id", "key");

-- CreateIndex
CREATE INDEX "solution_product_links_solution_id_block_key_sort_idx" ON "solution_product_links"("solution_id", "block_key", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "solution_product_links_solution_id_block_key_product_id_key" ON "solution_product_links"("solution_id", "block_key", "product_id");

-- AddForeignKey
ALTER TABLE "solution_sections" ADD CONSTRAINT "solution_sections_solution_id_fkey" FOREIGN KEY ("solution_id") REFERENCES "solutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution_product_links" ADD CONSTRAINT "solution_product_links_solution_id_fkey" FOREIGN KEY ("solution_id") REFERENCES "solutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
