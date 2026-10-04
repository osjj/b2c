import { revalidatePath, revalidateTag } from 'next/cache'

export const HOME_CACHE_SECONDS = 300
export const HOME_CACHE_TAGS = {
  products: 'home-products',
  solutions: 'home-solutions',
} as const

/** Call after persistence, from either a Server Action or a Route Handler. */
export function invalidateHomeCache(section: keyof typeof HOME_CACHE_TAGS) {
  // Expire data as well as HTML: the next render must not reuse an old price.
  revalidateTag(HOME_CACHE_TAGS[section], { expire: 0 })
  revalidatePath('/')
}
