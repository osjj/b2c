CREATE TABLE "product_slug_redirects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_slug_redirects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_slug_redirects_slug_key" ON "product_slug_redirects"("slug");

CREATE INDEX "product_slug_redirects_product_id_idx" ON "product_slug_redirects"("product_id");

ALTER TABLE "product_slug_redirects"
ADD CONSTRAINT "product_slug_redirects_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
