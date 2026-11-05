import { getCategories } from "@/actions/categories"
import { buildProductCategoryNavigation } from "@/lib/product-category-navigation"
import { NewHomeNav } from "./NewHomeNav"

export async function StorefrontNav() {
  let categories: ReturnType<typeof buildProductCategoryNavigation> = []

  try {
    categories = buildProductCategoryNavigation(await getCategories())
  } catch {
    console.error("Unable to load product categories for storefront navigation")
  }

  return <NewHomeNav categories={categories} />
}
