import Link from 'next/link'
import { Metadata } from 'next'
import { getCategoryTree } from '@/actions/categories'

export const metadata: Metadata = {
  title: 'Product Categories',
  description: 'Browse our complete range of PPE products organized by category. Find safety gloves, shoes, workwear, and more protective equipment.',
  openGraph: {
    title: 'Product Categories',
    description: 'Browse our complete range of PPE products organized by category.',
    type: 'website',
  },
}

export default async function CategoriesPage() {
  const categories = await getCategoryTree()

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative py-20 bg-secondary/30">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm tracking-[0.2em] uppercase text-primary mb-2 animate-fade-up">
              Browse
            </p>
            <h1 className="font-serif text-4xl md:text-6xl mb-4 animate-fade-up stagger-1">
              Categories
            </h1>
            <p className="text-muted-foreground animate-fade-up stagger-2">
              Explore our collections organized by category.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 lg:px-8 py-12">
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group opacity-0 animate-fade-up"
                style={{ animationDelay: `${0.05 + index * 0.05}s` }}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted mb-4">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <h2 className="font-serif text-2xl mb-2 group-hover:text-primary transition-colors">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="text-sm text-white/80 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Subcategories */}
                {category.children && category.children.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {category.children.slice(0, 4).map((child) => (
                      <span
                        key={child.id}
                        className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded"
                      >
                        {child.name}
                      </span>
                    ))}
                    {category.children.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{category.children.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No categories found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
