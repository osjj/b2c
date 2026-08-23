import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STORE_BLOG_PAGE_SIZE,
  getStoreBlogPageConfig,
  getStoreBlogPageRange,
  getStoreBlogTotalPages,
  normalizeBlogPage,
  splitFeaturedBlogPost,
} from './store-blog-pagination'

test('normalizeBlogPage falls back to page 1 for missing or invalid values', () => {
  assert.equal(normalizeBlogPage(undefined), 1)
  assert.equal(normalizeBlogPage(''), 1)
  assert.equal(normalizeBlogPage('abc'), 1)
  assert.equal(normalizeBlogPage('0'), 1)
  assert.equal(normalizeBlogPage('-3'), 1)
  assert.equal(normalizeBlogPage('1.5'), 1)
  assert.equal(normalizeBlogPage('1e2'), 1)
  assert.equal(normalizeBlogPage('0x10'), 1)
  assert.equal(normalizeBlogPage(' 2 '), 1)
  assert.equal(normalizeBlogPage('9007199254740992'), 1)
  assert.equal(normalizeBlogPage(['2']), 1)
})

test('normalizeBlogPage keeps valid positive integer page values', () => {
  assert.equal(normalizeBlogPage('1'), 1)
  assert.equal(normalizeBlogPage('3'), 3)
})

test('getStoreBlogPageConfig keeps twelve posts on every page', () => {
  assert.deepEqual(getStoreBlogPageConfig(1), {
    page: 1,
    skip: 0,
    take: 12,
    showFeatured: true,
  })
  assert.deepEqual(getStoreBlogPageConfig(2), {
    page: 2,
    skip: 12,
    take: 12,
    showFeatured: false,
  })
  assert.deepEqual(getStoreBlogPageConfig(-1), {
    page: 1,
    skip: 0,
    take: 12,
    showFeatured: true,
  })
  assert.deepEqual(getStoreBlogPageConfig(Number.MAX_SAFE_INTEGER + 1), {
    page: 1,
    skip: 0,
    take: 12,
    showFeatured: true,
  })
})

test('getStoreBlogTotalPages covers empty, exact, and partial pages', () => {
  assert.equal(getStoreBlogTotalPages(0), 0)
  assert.equal(getStoreBlogTotalPages(12), 1)
  assert.equal(getStoreBlogTotalPages(13), 2)
  assert.equal(getStoreBlogTotalPages(24), 2)
  assert.equal(getStoreBlogTotalPages(Number.NaN), 0)
})

test('splitFeaturedBlogPost features only the first post on page 1', () => {
  const posts = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]

  assert.deepEqual(splitFeaturedBlogPost(posts, 1), {
    featuredPost: { id: 'p1' },
    regularPosts: [{ id: 'p2' }, { id: 'p3' }],
  })
  assert.deepEqual(splitFeaturedBlogPost(posts, 2), {
    featuredPost: undefined,
    regularPosts: posts,
  })
  assert.deepEqual(splitFeaturedBlogPost([], 1), {
    featuredPost: undefined,
    regularPosts: [],
  })
})

test('getStoreBlogPageRange reports the visible article range', () => {
  assert.deepEqual(getStoreBlogPageRange(1, 12, 31), { start: 1, end: 12 })
  assert.deepEqual(getStoreBlogPageRange(2, 12, 31), { start: 13, end: 24 })
  assert.deepEqual(getStoreBlogPageRange(3, 7, 31), { start: 25, end: 31 })
  assert.deepEqual(getStoreBlogPageRange(4, 0, 31), { start: 0, end: 0 })
})

test('store blog page size stays aligned with the index layout', () => {
  assert.equal(STORE_BLOG_PAGE_SIZE, 12)
})
