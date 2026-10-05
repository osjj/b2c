// Execute real case actions against a transaction double, never the shared DB.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const nodeRequire = createRequire(import.meta.url)
const { Prisma } = nodeRequire('@prisma/client')
const state = { authorized: true, writes: 0, transactions: 0, race: false, rows: [], invalidations: [], reads: [] }
const selected = (row, select) => row && Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]))
const matches = (row, where) => (!where.id || row.id === where.id) && (!where.slug || row.slug === where.slug)
  && (!where.status || row.status === where.status)
  && (where.publicationApproved === undefined || row.publicationApproved === where.publicationApproved)
  && (!where.publishedAt || (row.publishedAt && row.publishedAt <= where.publishedAt.lte))
const db = {
  caseStudy: {
    create: async ({ data, select }) => {
      if (state.rows.some((row) => row.slug === data.slug)) {
        throw new Prisma.PrismaClientKnownRequestError('Duplicate slug', { code: 'P2002', clientVersion: 'test' })
      }
      const row = { id: `c${String(state.rows.length + 1).padStart(24, '0')}`, version: 1, ...data }
      state.rows.push(row)
      state.writes++
      return selected(row, select)
    },
    findUnique: async ({ where, select }) => {
      state.reads.push({ where, select })
      const row = state.rows.find((entry) => matches(entry, where))
      return select ? selected(row, select) : row
    },
    findFirst: async ({ where, select }) => {
      state.reads.push({ where, select })
      return selected(state.rows.find((row) => matches(row, where)), select)
    },
    findMany: async ({ where = {}, select }) => {
      state.reads.push({ where, select })
      return state.rows.filter((row) => matches(row, where)).map((row) => select ? selected(row, select) : row)
    },
    updateMany: async ({ where, data }) => {
      const row = state.rows.find((entry) => entry.id === where.id && entry.version === where.version)
      if (!row || state.race) return { count: 0 }
      if (state.rows.some((entry) => entry.id !== row.id && entry.slug === data.slug)) {
        throw new Prisma.PrismaClientKnownRequestError('Duplicate slug', { code: 'P2002', clientVersion: 'test' })
      }
      Object.assign(row, data, { version: row.version + data.version.increment })
      state.writes++
      return { count: 1 }
    },
  },
  $transaction: async (work) => {
    state.transactions++
    const backup = structuredClone(state)
    try { return await work(db) } catch (error) { Object.assign(state, backup); throw error }
  },
}
const built = await build({
  stdin: {
    contents: 'export { saveCaseStudy } from "./src/actions/admin/cases"; export { emptyCaseInput } from "./src/lib/cases/types"; export { listPublishedCases, getPublishedCase, getAdminCase } from "./src/lib/cases/data";',
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'case-boundary-isolation', setup(plugin) {
    plugin.onResolve({ filter: /^@\/lib\/prisma$/ }, () => ({ path: 'db', namespace: 'mock' }))
    plugin.onResolve({ filter: /^@\/lib\/auth-utils$/ }, () => ({ path: 'auth', namespace: 'mock' }))
    plugin.onResolve({ filter: /^next\/cache$/ }, () => ({ path: 'cache', namespace: 'mock' }))
    plugin.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'mock' }))
    plugin.onResolve({ filter: /indexnow|r2|email|pusher/i }, () => { throw new Error('Cases must not invoke external mutation hooks') })
    plugin.onResolve({ filter: /^case-test-state$/ }, () => ({ path: 'case-test-state', external: true }))
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({
      loader: 'js', resolveDir: process.cwd(),
      contents: path === 'server-only' ? '' : path === 'db'
        ? 'export const prisma = require("case-test-state").db;'
        : path === 'auth'
          ? 'export async function requireAdmin() { if (!require("case-test-state").state.authorized) throw new Error("Denied"); return { id: "test-admin" }; }'
          : 'export function revalidatePath(path) { require("case-test-state").state.invalidations.push(path); }',
    }))
  } }],
})
const bundledModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(
  (name) => name === 'case-test-state' ? { state, db } : nodeRequire(name), bundledModule, bundledModule.exports,
)
const { saveCaseStudy, emptyCaseInput, listPublishedCases, getPublishedCase, getAdminCase } = bundledModule.exports
const input = {
  ...emptyCaseInput(), title: 'Confirmed procurement record', slug: 'confirmed-procurement-record',
  summary: 'A source-backed PPE order.', country: 'South Africa', industry: 'Mining', cooperationDate: '2026-08-02',
  procurement: [{ name: 'Safety helmets', quantity: 500, unit: 'pieces', note: 'Blue logo' }],
  sections: [{ title: 'Procurement context', body: 'Documented sample review.' }], privateNotes: 'PRIVATE_REVIEW_MARKER',
}
const privateImage = `/api/admin/case-images/c${'9'.repeat(24)}/${'a'.repeat(64)}.png`
const privateInput = { ...input, coverImage: privateImage, coverAlt: 'Private original', gallery: [{ url: privateImage, alt: 'Private original', caption: 'Draft evidence' }] }
state.authorized = false
await assert.rejects(saveCaseStudy(input), /Denied/)
assert.equal(state.transactions, 0)
state.authorized = true
assert.equal((await saveCaseStudy({ ...input, cooperationDate: '2026-02-30' })).success, false)
assert.equal((await saveCaseStudy({ ...input, procurement: [{ ...input.procurement[0], quantity: -1 }] })).success, false)
assert.equal((await saveCaseStudy({ ...input, relatedLinks: [{ label: 'Unsafe', href: 'javascript:alert(1)' }] })).success, false)
assert.equal((await saveCaseStudy({ ...input, status: 'PUBLISHED' })).success, false)
assert.equal((await saveCaseStudy(privateInput)).success, false, 'Private refs require an existing case')
assert.equal((await saveCaseStudy({ ...privateInput, status: 'PUBLISHED', publicationApproved: true })).success, false, 'Private images cannot be published')
assert.equal(state.transactions, 0)

const created = await saveCaseStudy({ ...input, status: 'PUBLISHED', publicationApproved: true })
assert.equal(created.success, true)
assert.equal(state.rows[0].status, 'DRAFT', 'Creation never publishes')
assert.equal(state.rows[0].publicationApproved, false)
assert.equal(state.rows[0].publishedAt, null)
assert.equal(state.rows[0].privateNotes, input.privateNotes)
assert.equal((await saveCaseStudy(input)).success, false, 'Duplicate slug rejected')
assert.equal(state.rows.length, 1)
const transactionsBeforePrivate = state.transactions
assert.equal((await saveCaseStudy(privateInput, created.id, 1)).success, false, 'Cross-case image references rejected')
assert.equal(state.transactions, transactionsBeforePrivate, 'Foreign private images rejected before DB access')
const ownPrivateImage = privateImage.replace(`c${'9'.repeat(24)}`, created.id)
const ownPrivate = { ...privateInput, coverImage: ownPrivateImage, gallery: [{ ...privateInput.gallery[0], url: ownPrivateImage }] }

assert.equal((await saveCaseStudy(input, created.id)).success, false, 'Version required')
assert.equal((await saveCaseStudy(input, 'missing-id', 1)).success, false)
const saved = await saveCaseStudy(ownPrivate, created.id, 1)
assert.equal(saved.success, true)
assert.equal(saved.version, 2)
assert.equal(state.rows[0].gallery[0].url, ownPrivateImage, 'Same-case draft images survive a save')
assert.equal((await saveCaseStudy({ ...ownPrivate, status: 'PUBLISHED', publicationApproved: true }, created.id, 2)).success, false)
assert.equal((await saveCaseStudy(input, created.id, 1)).success, false, 'Stale editor rejected')
state.race = true
assert.equal((await saveCaseStudy(input, created.id, 2)).success, false, 'Atomic update prevents a race')
state.race = false
assert.equal(state.rows[0].version, 2)

const published = await saveCaseStudy({ ...input, status: 'PUBLISHED', publicationApproved: true }, created.id, 2)
assert.equal(published.success, true)
assert.equal(state.rows[0].status, 'PUBLISHED')
assert.ok(state.rows[0].publishedAt instanceof Date)
const withdrawn = await saveCaseStudy(input, created.id, 3)
assert.equal(withdrawn.success, true)
assert.equal(state.rows[0].status, 'DRAFT')
assert.equal(state.rows[0].publishedAt, null)
assert.ok(state.invalidations.includes('/cases'))
assert.ok(state.invalidations.includes('/sitemap.xml'))

// An outdated editor may have loaded the current version while stripping newly
// added JSON fields. Version locking alone must not allow that metadata loss.
const layoutInput = {
  ...input, slug: 'contextual-layout-record',
  sections: [
    { key: 'visit', title: 'Buyer visit', body: 'Recorded sample review.' },
    { key: 'packing', title: 'Packing', body: 'Recorded packing progress.' },
  ],
  gallery: [
    { url: '/cases/visit.png', alt: 'Buyer visit', caption: 'Original visit', placement: 'section:visit' },
    { url: '/cases/packing.png', alt: 'Packing', caption: 'Original packing', placement: 'section:packing' },
  ],
}
const layoutCreated = await saveCaseStudy(layoutInput)
assert.equal(layoutCreated.success, true)
const layoutRecord = state.rows.find((row) => row.id === layoutCreated.id)
assert.ok(layoutRecord)
const writesBeforeOmission = state.writes
const invalidationsBeforeOmission = state.invalidations.length
const metadataSnapshot = structuredClone({ sections: layoutRecord.sections, gallery: layoutRecord.gallery })
const omittedLayout = {
  ...layoutInput,
  sections: layoutInput.sections.map(({ title, body }) => ({ title, body })),
  gallery: layoutInput.gallery.map(({ url, alt, caption }) => ({ url, alt, caption })),
}
const omittedResult = await saveCaseStudy(omittedLayout, layoutCreated.id, 1)
assert.equal(omittedResult.success, false, 'Old editor metadata omissions are rejected')
assert.match(omittedResult.reason, /Reload the case before saving/)
assert.deepEqual(Object.keys(omittedResult.errors), ['sections.0.key', 'sections.1.key', 'gallery.0.placement', 'gallery.1.placement'])
assert.equal(state.writes, writesBeforeOmission, 'Missing layout metadata does not reach updateMany')
assert.equal(state.invalidations.length, invalidationsBeforeOmission, 'Rejected layout does not invalidate routes')
assert.equal(layoutRecord.version, 1)
assert.deepEqual({ sections: layoutRecord.sections, gallery: layoutRecord.gallery }, metadataSnapshot)
const omittedGallery = await saveCaseStudy({ ...layoutInput, gallery: omittedLayout.gallery }, layoutCreated.id, 1)
assert.equal(omittedGallery.success, false, 'Retained gallery URLs require explicit layout information')
assert.deepEqual(Object.keys(omittedGallery.errors), ['gallery.0.placement', 'gallery.1.placement'])
assert.equal(state.writes, writesBeforeOmission)

const rearrangedLayout = {
  ...layoutInput,
  sections: [...layoutInput.sections].reverse().map((section) => ({ ...section, title: `Updated ${section.title}`, body: `Updated ${section.body}` })),
  gallery: [...layoutInput.gallery].reverse(),
}
assert.equal((await saveCaseStudy(rearrangedLayout, layoutCreated.id, 1)).success, true, 'Stable keys support reorder and rename')
const removedSection = {
  ...rearrangedLayout,
  sections: rearrangedLayout.sections.filter(({ key }) => key !== 'visit'),
  gallery: rearrangedLayout.gallery.map((image) => ({ ...image, placement: image.placement === 'section:visit' ? '' : image.placement })),
}
assert.equal((await saveCaseStudy(removedSection, layoutCreated.id, 2)).success, true, 'Explicit deletion and image unassignment remain available')
assert.equal(layoutRecord.version, 3)
assert.equal(layoutRecord.gallery.find(({ url }) => url === '/cases/visit.png').placement, '')

// Read boundaries: real query predicates, not a hand-written public fallback.
const now = new Date()
const baseRecord = { ...input, version: 1, createdAt: now, updatedAt: now, cooperationDate: new Date('2026-08-02'), publicationApproved: true, publishedAt: new Date(now.getTime() - 1000) }
state.rows = [
  { ...baseRecord, id: 'draft', slug: 'draft', status: 'DRAFT', publishedAt: null },
  { ...baseRecord, id: 'published', slug: 'published', status: 'PUBLISHED' },
  { ...baseRecord, id: 'unapproved', slug: 'unapproved', status: 'PUBLISHED', publicationApproved: false },
  { ...baseRecord, id: 'future', slug: 'future', status: 'PUBLISHED', publishedAt: new Date(now.getTime() + 60000) },
  { ...baseRecord, id: 'archived', slug: 'archived', status: 'ARCHIVED' },
  { ...baseRecord, id: 'private-published', slug: 'private-published', status: 'PUBLISHED', coverImage: privateImage, coverAlt: 'Private original' },
]
state.authorized = false
const publicCases = await listPublishedCases()
assert.deepEqual(publicCases.map((entry) => entry.slug), ['published'])
assert.equal('privateNotes' in publicCases[0], false)
assert.equal('publicationApproved' in publicCases[0], false)
assert.equal('status' in publicCases[0], false)
assert.equal(state.reads.at(-1).select.privateNotes, undefined)
for (const slug of ['draft', 'unapproved', 'future', 'archived', 'private-published']) assert.equal(await getPublishedCase(slug), null)
assert.equal((await getPublishedCase('published')).id, 'published')
const readCount = state.reads.length
await assert.rejects(getAdminCase('draft'), /Denied/)
assert.equal(state.reads.length, readCount, 'Unauthorized private reads do not reach the database')
state.authorized = true
assert.equal((await getAdminCase('draft')).privateNotes, input.privateNotes)
process.stdout.write('PASS: real case actions and read queries; authorization, validation, draft creation, duplicate slug, optimistic race, layout omission protection, intentional reorder/delete, publish/withdraw, invalidation, public filtering and private projection verified with mocks. No database or storage contacted.\n')
