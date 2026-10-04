import { unstable_cache } from 'next/cache'
import { getCollectionProducts } from '@/actions/collections'
import { getSolutions } from '@/actions/solutions'
import { HOME_CACHE_SECONDS, HOME_CACHE_TAGS } from '@/lib/home-cache'

// Let query failures reject. Returning a timeout/null fallback here would cache
// a missing section and could replace the last successful ISR page.
export const getHomeFeaturedProducts = unstable_cache(
  () => getCollectionProducts('best-sellers', 5),
  ['home-featured-products-v1'],
  { revalidate: HOME_CACHE_SECONDS, tags: [HOME_CACHE_TAGS.products] },
)

export const getHomeSolutions = unstable_cache(
  () => getSolutions({ activeOnly: true, limit: 5 }),
  ['home-solutions-v1'],
  { revalidate: HOME_CACHE_SECONDS, tags: [HOME_CACHE_TAGS.solutions] },
)
