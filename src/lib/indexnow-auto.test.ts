import assert from 'node:assert/strict'
import test from 'node:test'

import {
  collectBlogIndexNowUrls,
  collectCategoryIndexNowUrls,
  collectProductIndexNowUrls,
  collectSolutionIndexNowUrls,
  isIndexNowAutoEnabled,
  scheduleIndexNowUrls,
} from './indexnow-auto'

const productionEnvironment = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_SITE_URL: 'https://www.laifappe.com/',
  VERCEL_ENV: 'production',
}

test('product and blog transitions include active updates, slug changes, and removals', () => {
  assert.deepEqual(
    collectProductIndexNowUrls(
      { slug: 'same-product', isPublic: true },
      { slug: 'same-product', isPublic: true }
    ),
    ['https://www.laifappe.com/products/same-product']
  )
  assert.deepEqual(
    collectProductIndexNowUrls(
      { slug: 'old-product', isPublic: true },
      { slug: 'new-product', isPublic: true }
    ),
    [
      'https://www.laifappe.com/products/old-product',
      'https://www.laifappe.com/products/new-product',
    ]
  )
  assert.deepEqual(
    collectBlogIndexNowUrls(
      { slug: 'old-article', isPublic: true },
      { slug: 'new-article', isPublic: true }
    ),
    [
      'https://www.laifappe.com/blog/old-article',
      'https://www.laifappe.com/blog/new-article',
    ]
  )
  assert.deepEqual(
    collectBlogIndexNowUrls(
      { slug: 'article', isPublic: true },
      { slug: 'article', isPublic: false }
    ),
    ['https://www.laifappe.com/blog/article']
  )
})

test('drafts that remain non-public do not produce URLs', () => {
  assert.deepEqual(
    collectProductIndexNowUrls(
      { slug: 'draft-old', isPublic: false },
      { slug: 'draft-new', isPublic: false }
    ),
    []
  )
  assert.deepEqual(
    collectBlogIndexNowUrls(null, { slug: 'draft', isPublic: false }),
    []
  )
})

test('category transitions use effective parent visibility and nested canonical paths', () => {
  assert.deepEqual(
    collectCategoryIndexNowUrls(
      {
        slug: 'helmets',
        isActive: true,
        parent: { slug: 'old-head-protection', isActive: true },
      },
      {
        slug: 'safety-helmets',
        isActive: true,
        parent: { slug: 'head-protection', isActive: true },
      }
    ),
    [
      'https://www.laifappe.com/categories/old-head-protection/helmets',
      'https://www.laifappe.com/categories/head-protection/safety-helmets',
    ]
  )
  assert.deepEqual(
    collectCategoryIndexNowUrls(null, {
      slug: 'hidden-child',
      isActive: true,
      parent: { slug: 'inactive-parent', isActive: false },
    }),
    []
  )
  assert.deepEqual(
    collectCategoryIndexNowUrls(
      {
        slug: 'helmets',
        isActive: true,
        parent: { slug: 'head-protection', isActive: true },
      },
      {
        slug: 'helmets',
        isActive: true,
        parent: { slug: 'head-protection', isActive: true },
      }
    ),
    []
  )
  assert.deepEqual(
    collectCategoryIndexNowUrls(
      {
        slug: 'helmets',
        isActive: true,
        parent: { slug: 'head-protection', isActive: true },
      },
      {
        slug: 'helmets',
        isActive: true,
        parent: { slug: 'head-protection', isActive: false },
      }
    ),
    ['https://www.laifappe.com/categories/head-protection/helmets']
  )
})

test('solution transitions notify state and canonical changes but skip stable public updates', () => {
  assert.deepEqual(
    collectSolutionIndexNowUrls(null, { slug: 'mining', isPublic: true }),
    ['https://www.laifappe.com/solutions/mining']
  )
  assert.deepEqual(
    collectSolutionIndexNowUrls(
      { slug: 'mining', isPublic: true },
      { slug: 'mining', isPublic: true }
    ),
    []
  )
  assert.deepEqual(
    collectSolutionIndexNowUrls(
      { slug: 'old-mining', isPublic: true },
      { slug: 'new-mining', isPublic: true }
    ),
    [
      'https://www.laifappe.com/solutions/old-mining',
      'https://www.laifappe.com/solutions/new-mining',
    ]
  )
})

test('automatic submissions only run in the canonical production environment', () => {
  assert.equal(isIndexNowAutoEnabled(productionEnvironment), true)
  assert.equal(
    isIndexNowAutoEnabled({ ...productionEnvironment, VERCEL_ENV: undefined }),
    true
  )
  assert.equal(
    isIndexNowAutoEnabled({ ...productionEnvironment, NODE_ENV: 'development' }),
    false
  )
  assert.equal(
    isIndexNowAutoEnabled({ ...productionEnvironment, VERCEL_ENV: 'preview' }),
    false
  )
  assert.equal(
    isIndexNowAutoEnabled({
      ...productionEnvironment,
      NEXT_PUBLIC_SITE_URL: 'https://laifappe.com',
    }),
    true
  )
  assert.equal(
    isIndexNowAutoEnabled({
      ...productionEnvironment,
      NEXT_PUBLIC_SITE_URL: 'laifappe.com',
    }),
    true
  )
  assert.equal(
    isIndexNowAutoEnabled({
      ...productionEnvironment,
      NEXT_PUBLIC_SITE_URL: 'https://example.com',
    }),
    false
  )
})

test('scheduler deduplicates URLs and submits once from the after callback', async () => {
  const callbacks: Array<() => Promise<void>> = []
  const submissions: string[][] = []

  const didSchedule = scheduleIndexNowUrls(
    [
      'https://www.laifappe.com/products/helmet',
      'https://www.laifappe.com/products/helmet',
      'https://www.laifappe.com/blog/guide',
    ],
    {
      environment: productionEnvironment,
      schedule: (callback) => callbacks.push(callback),
      submit: async (urls) => {
        submissions.push([...urls])
        return { status: 202, submittedUrlCount: urls.length }
      },
    }
  )

  assert.equal(didSchedule, true)
  assert.equal(callbacks.length, 1)
  assert.deepEqual(submissions, [])

  const callback = callbacks[0]
  assert.ok(callback)
  await callback()
  assert.deepEqual(submissions, [
    [
      'https://www.laifappe.com/products/helmet',
      'https://www.laifappe.com/blog/guide',
    ],
  ])
})

test('scheduler contains submission, logging, and after registration failures', async () => {
  let callback: (() => Promise<void>) | undefined
  let loggedMessage = ''

  assert.equal(
    scheduleIndexNowUrls(['https://www.laifappe.com/products/helmet'], {
      environment: productionEnvironment,
      schedule: (scheduledCallback) => {
        callback = scheduledCallback
      },
      submit: async () => {
        throw new Error('network unavailable')
      },
      logError: (message) => {
        loggedMessage = message
        throw new Error('logger unavailable')
      },
    }),
    true
  )

  assert.ok(callback)
  await assert.doesNotReject(callback())
  assert.equal(loggedMessage, 'indexnow_auto_submission_failed')

  assert.doesNotThrow(() => {
    assert.equal(
      scheduleIndexNowUrls(['https://www.laifappe.com/products/helmet'], {
        environment: productionEnvironment,
        schedule: () => {
          throw new Error('after unavailable')
        },
        logError: () => {
          throw new Error('logger unavailable')
        },
      }),
      false
    )
  })
})

test('scheduler skips empty or non-production submissions without registering after work', () => {
  let scheduleCount = 0
  const schedule = () => {
    scheduleCount += 1
  }

  assert.equal(
    scheduleIndexNowUrls([], { environment: productionEnvironment, schedule }),
    false
  )
  assert.equal(
    scheduleIndexNowUrls(['https://www.laifappe.com/products/helmet'], {
      environment: { ...productionEnvironment, VERCEL_ENV: 'preview' },
      schedule,
    }),
    false
  )
  assert.equal(scheduleCount, 0)
})
