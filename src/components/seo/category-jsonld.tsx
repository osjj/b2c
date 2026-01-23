import { Category, Product } from "@prisma/client";

interface CategoryJsonLdProps {
  category: Category;
  products: Product[];
  baseUrl: string;
}

export function CategoryJsonLd({ category, products, baseUrl }: CategoryJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description,
    url: `${baseUrl}/categories/${category.slug}`,
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
            price: Number(product.price),
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
