-- Private catalog source data is opt-in for admin reads.
CREATE TABLE "product_sources" (
    "product_id" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "product_sources_pkey" PRIMARY KEY ("product_id")
);

ALTER TABLE "product_sources" ADD CONSTRAINT "product_sources_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quotation_products" ADD COLUMN "product_source" TEXT;
