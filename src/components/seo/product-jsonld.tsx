import { ProductImage, Category } from "@prisma/client";

interface ProductForJsonLd {
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: number;
  comparePrice: number | null;
  stock: number;
  images: ProductImage[];
  category: Category | null;
}

interface ProductJsonLdProps {
  product: ProductForJsonLd;
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
      price: product.price,
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
  if (product.comparePrice && product.comparePrice > product.price) {
    (jsonLd.offers as Record<string, unknown>).priceSpecification = {
      "@type": "PriceSpecification",
      price: product.price,
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
