// Real preparation action with auth/DB/media doubles; never loads .env or writes live data.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const nodeRequire = createRequire(import.meta.url)
const caseId = `c${'1'.repeat(24)}`
const foreignId = `c${'2'.repeat(24)}`
const sourceUrl = `/api/admin/case-images/${caseId}/${'a'.repeat(64)}.png`
const unknownUrl = `/api/admin/case-images/${caseId}/${'b'.repeat(64)}.jpg`
const state = { authorized: true, row: null, reads: 0, copies: [], dbFails: false, copyFails: false }
const built = await build({
  stdin: { contents: 'export { prepareCasePublicationImage } from "./src/actions/admin/case-publication"; export { emptyCaseInput } from "./src/lib/cases/types";', resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'case-publication-action-isolation', setup(plugin) {
    const mocks = {
      '@/lib/auth-utils': 'export async function requireAdmin() { if (!require("case-publication-action-state").authorized) throw new Error("Denied"); }',
      '@/lib/prisma': 'export const prisma = { caseStudy: { findUnique: async () => { const state=require("case-publication-action-state"); state.reads++; if(state.dbFails) throw new Error("SECRET DB"); return structuredClone(state.row); } } };',
      '@/lib/cases/publication-images': 'export async function publishCasePrivateImage(id, sourceUrl) { const state=require("case-publication-action-state"); state.copies.push({id,sourceUrl}); if(state.copyFails) throw new Error("SECRET SDK credentials"); return `https://shop.laifappe.com/cases/${id}/${sourceUrl.split("/").at(-1)}`; }',
    }
    plugin.onResolve({ filter: /.*/ }, ({ path }) => {
      if (path in mocks) return { path, namespace: 'mock' }
      if (path === 'case-publication-action-state') return { path, external: true }
      if (/r2|indexnow|email|pusher/i.test(path)) throw new Error('Unexpected external integration in action test')
    })
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }))
  } }],
})
const testModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(name => name === 'case-publication-action-state' ? state : nodeRequire(name), testModule, testModule.exports)
const { prepareCasePublicationImage, emptyCaseInput } = testModule.exports
const input = {
  ...emptyCaseInput(), title: 'Reviewed order', slug: 'reviewed-order', summary: 'Documented order.', country: 'Central Asia', industry: 'Oil and gas',
  status: 'PUBLISHED', publicationApproved: false, coverImage: sourceUrl, coverAlt: 'Reviewed coat',
  procurement: [{ name: 'Coats', quantity: 310, unit: 'garments', note: '', href: '/categories/body-protection' }],
  sections: [{ key: 'review', title: 'Review', body: 'Source-backed facts.' }],
  gallery: [{ url: sourceUrl, alt: 'Reviewed coat', caption: 'Existing anonymization', kind: 'photo', placement: 'section:review' }],
}
state.row = { version: 2, coverImage: sourceUrl, sections: input.sections, gallery: input.gallery, procurement: input.procurement }
const call = (candidate = input, url = sourceUrl, id = caseId, version = 2) => prepareCasePublicationImage(candidate, url, id, version)
const snapshot = structuredClone({ input, row: state.row })
state.authorized = false
await assert.rejects(call(), /Denied/)
assert.equal(state.reads, 0)
assert.equal(state.copies.length, 0)
state.authorized = true
for (const candidate of [
  { ...input, title: '' }, { ...input, cooperationDate: '2026-02-30' }, { ...input, status: 'DRAFT' },
  { ...input, slug: '../unsafe' }, { ...input, coverAlt: null },
]) assert.equal((await call(candidate)).success, false)
for (const [url, id, version] of [[sourceUrl, '../foreign', 2], [sourceUrl, caseId, 0], [sourceUrl, caseId, 1.2], ['https://foreign.invalid/pic.jpg', caseId, 2]]) {
  assert.equal((await call(input, url, id, version)).success, false)
}
assert.equal(state.reads, 0, 'Invalid publication requests stop before database/private reads')
assert.equal(state.copies.length, 0)
assert.equal((await call(input, sourceUrl, caseId, 1)).success, false)
const row = state.row
state.row = null
assert.equal((await call()).success, false)
state.row = row
for (const url of [unknownUrl, sourceUrl.replace(caseId, foreignId)]) {
  const candidate = { ...input, gallery: [...input.gallery, { url, alt: 'Unapproved reference', caption: '' }] }
  assert.equal((await call(candidate)).success, false, 'Whole candidate ownership/membership checked before first copy')
}
assert.equal((await call(input, unknownUrl)).success, false)
assert.equal((await call({ ...input, coverImage: '', gallery: [] })).success, false, 'Requested saved source must still be in candidate')
const omittedLayout = { ...input, gallery: input.gallery.map(({url,alt,caption}) => ({url,alt,caption})) }
const layoutResult = await call(omittedLayout)
assert.equal(layoutResult.success, false)
assert.ok(layoutResult.errors['gallery.0.placement'])
assert.ok(layoutResult.errors['gallery.0.kind'])
assert.equal(state.copies.length, 0, 'All rejected candidates perform no storage work')
const result = await call()
assert.equal(result.success, true)
assert.equal(result.sourceUrl, sourceUrl)
assert.equal(result.url, `https://shop.laifappe.com/cases/${caseId}/${'a'.repeat(64)}.png`)
assert.deepEqual(state.copies, [{id:caseId,sourceUrl}])
assert.deepEqual({input,row:state.row}, snapshot, 'Preparation never mutates candidate or saved record')
state.copyFails = true
const failed = await call()
assert.equal(failed.success, false)
assert.equal(JSON.stringify(failed).includes('SECRET'), false)
state.copyFails = false
state.dbFails = true
const unavailable = await call()
assert.equal(unavailable.success, false)
assert.equal(JSON.stringify(unavailable).includes('SECRET'), false)
state.dbFails = false
state.row.version++
const copiesBeforeRace = state.copies.length
assert.equal((await call()).success, false, 'A later image step detects a concurrent editor')
assert.equal(state.copies.length, copiesBeforeRace)
state.row.version = 2
const minimal = {
  ...input, publicationApproved: undefined, summary: '', country: '', industry: '', procurement: [], sections: [],
  gallery: input.gallery.map(image => ({ ...image, placement: '' })),
}
assert.equal((await call(minimal)).success, true, 'No editorial flag or optional content is required for media preparation')
assert.deepEqual({input,row:state.row}, snapshot)
console.log('PASS: direct-publication image preparation without editorial gates, auth, technical validation, saved ownership/membership/layout/version guards, no DB writes and safe failures. No live DB/storage/network calls.')
