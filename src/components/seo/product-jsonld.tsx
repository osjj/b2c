import { ProductImage, Category } from "@prisma/client";

interface ProductForJsonLd {
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: number;
  comparePrice: number | null;
  images: ProductImage[];
  category: Category | null;
}

interface ProductJsonLdProps {
  product: ProductForJsonLd;
  baseUrl: string;
  priceValidUntil?: string;
}

const DEFAULT_PRICE_VALID_UNTIL = "2027-12-31";

export function ProductJsonLd({
  product,
  baseUrl,
  priceValidUntil = DEFAULT_PRICE_VALID_UNTIL,
}: ProductJsonLdProps) {
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
      name: "Laifappe",
    },
    category: product.category?.name,
    url: `${baseUrl}/products/${product.slug}`,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/products/${product.slug}`,
      priceCurrency: "USD",
      price: product.price,
      priceValidUntil,
      seller: {
        "@type": "Organization",
        name: "Laifappe",
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
