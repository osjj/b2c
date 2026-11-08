import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import type { buildProductCategoryNavigation } from '@/lib/product-category-navigation'
import styles from './catalog-listing.module.css'

export function ProductCategoryNavigation({
  categories,
  activeHref = '/products',
}: {
  categories: ReturnType<typeof buildProductCategoryNavigation>
  activeHref?: string
}) {
  const entries = [{ name: 'All Products', href: '/products' }, ...categories]
  const activeEntry = entries
    .filter(({ href }) => activeHref === href || activeHref.startsWith(`${href}/`))
    .reduce<(typeof entries)[number] | undefined>(
      (current, entry) => !current || entry.href.length > current.href.length ? entry : current,
      undefined,
    )

  const links = (
    <ul className={styles.categoryNavLinks}>
      {entries.map(({ href, name }) => (
        <li key={href}>
          <Link href={href} aria-current={href === activeEntry?.href ? 'page' : undefined}>
            {name}
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <aside className={styles.categoryRail}>
      <nav className={styles.desktopCategoryNav} aria-label="Product categories">
        <p className={styles.categoryNavHeading}>Product Categories</p>
        {links}
      </nav>
      <details className={styles.mobileCategoryNav} open>
        <summary>
          <span className={styles.categoryNavHeading}>Product Categories</span>
          <span className={styles.currentCategory}>
            {activeEntry?.name}
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </summary>
        <nav aria-label="Product categories">{links}</nav>
      </details>
    </aside>
  )
}
