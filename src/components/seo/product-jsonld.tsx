import { Product, ProductImage, Category } from "@prisma/client";

type ProductWithRelations = Product & {
  images: ProductImage[];
  category: Category | null;
};

interface ProductJsonLdProps {
  product: ProductWithRelations;
  baseUrl: string;
}

export function ProductJsonLd({ product, baseUrl }: ProductJsonLdProps) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((img) => img.url),
    sku: product.sku,
    mpn: product.sku,
    brand: {
      "@type": "Brand",
      name: "PPE Pro",
    },
    category: product.category?.name,
    url: `${baseUrl}/products/${product.slug}`,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/products/${product.slug}`,
      priceCurrency: "USD",
      price: Number(product.price),
      priceValidUntil: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString().split("T")[0],
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "PPE Pro",
      },
    },
  };

  // 如果有原价，添加折扣信息
  if (product.comparePrice && Number(product.comparePrice) > Number(product.price)) {
    (jsonLd.offers as Record<string, unknown>).priceSpecification = {
      "@type": "PriceSpecification",
      price: Number(product.price),
      priceCurrency: "USD",
      valueAddedTaxIncluded: false,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
