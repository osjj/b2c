import { Category } from "@prisma/client";

interface ProductForJsonLd {
  name: string;
  slug: string;
  price: number;
}

interface CategoryJsonLdProps {
  category: Category;
  products: ProductForJsonLd[];
  baseUrl: string;
  // Optional canonical path override — nested subcategory pages pass
  // `/categories/{parent}/{slug}` so JSON-LD matches the actual canonical
  // URL instead of the flat path that would 301-redirect.
  url?: string;
}

export function CategoryJsonLd({ category, products, baseUrl, url }: CategoryJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description,
    url: url ?? `${baseUrl}/categories/${category.slug}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 10).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.name,
          url: `${baseUrl}/products/${product.slug}`,
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: "USD",
          },
        },
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
