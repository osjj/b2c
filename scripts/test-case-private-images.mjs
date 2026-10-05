// Real storage and route code with isolated credentials/auth/DB/S3 doubles.
// Never loads .env, sends network requests, uploads objects or writes a DB.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

import { build } from 'esbuild'
import sharp from 'sharp'

const nodeRequire = createRequire(import.meta.url)
const caseId = 'c123456789012345678901234'
const secondCaseId = 'c223456789012345678901234'
const environment = {
  QUOTATION_PRIVATE_STORAGE_PROVIDER: 'r2-private',
  QUOTATION_PRIVATE_R2_ENDPOINT: 'https://private.invalid',
  QUOTATION_PRIVATE_R2_ACCESS_KEY_ID: 'isolated-key',
  QUOTATION_PRIVATE_R2_SECRET_ACCESS_KEY: 'isolated-secret',
  QUOTATION_PRIVATE_R2_BUCKET: 'isolated-private',
  R2_BUCKET_NAME: 'isolated-public',
}
const state = { calls: [], objects: new Map(), user: { role: 'ADMIN' }, record: null, dbReads: 0, storageReads: 0, storageFail: false, sdkFail: false, hang: false, forceTimeout: false, dbFail: false }
const mockSdk = `
export class PutObjectCommand { constructor(input) { this.input = input; this.kind = 'put'; } }
export class GetObjectCommand { constructor(input) { this.input = input; this.kind = 'get'; } }
export class S3Client {
  constructor(configuration) { this.configuration = configuration; }
  destroy() {}
  async send(command, options) {
    const state = require('case-private-test-state').state;
    state.calls.push({ kind: command.kind, input: command.input, options, configuration: this.configuration });
    if (state.hang) return new Promise((_, reject) => options.abortSignal.addEventListener('abort', () => reject(new Error('SECRET SDK timeout'))));
    if (state.sdkFail) throw new Error('SECRET SDK bucket/object error must never leak');
    if (command.kind === 'put') { state.objects.set(command.input.Key, { bytes: command.input.Body, type: command.input.ContentType }); return {}; }
    const item = state.objects.get(command.input.Key);
    if (!item) throw new Error('SECRET SDK missing key');
    return { ContentType: item.type, ContentLength: item.length ?? item.bytes.length, Body: { transformToByteArray: async () => item.bytes } };
  }
}`
async function load(entryPoints, mocks) {
  const built = await build({
    entryPoints, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    define: { 'process.env': '__privateImageEnvironment', setTimeout: '__caseTestSetTimeout', clearTimeout: '__caseTestClearTimeout' },
    plugins: [{ name: 'isolated-case-images', setup(plugin) {
      plugin.onResolve({ filter: /.*/ }, ({ path }) => {
        if (path in mocks) return { path, namespace: 'mock' }
        if (path === 'case-private-test-state') return { path, external: true }
      })
      plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }))
    } }],
  })
  const testModule = { exports: {} }
  new Function('require', 'module', 'exports', '__privateImageEnvironment', '__caseTestSetTimeout', '__caseTestClearTimeout', built.outputFiles[0].text)(
    (name) => name === 'case-private-test-state' ? { state } : nodeRequire(name), testModule, testModule.exports, environment,
    (callback, milliseconds) => setTimeout(callback, state.forceTimeout ? 0 : milliseconds), clearTimeout,
  )
  return testModule.exports
}

const media = await load(['src/lib/cases/private-media.ts'], { 'server-only': '', '@aws-sdk/client-s3': mockSdk })
const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#ffffff' } }).png().toBuffer()
const jpg = await sharp(png).jpeg().toBuffer()
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const file = `${hash(png)}.png`
const url = `/api/admin/case-images/${caseId}/${file}`
await media.putCasePrivateImage(caseId, file, png, 'image/png')
assert.equal(state.calls[0].input.Bucket, environment.QUOTATION_PRIVATE_R2_BUCKET)
assert.equal(state.calls[0].input.Key, `cases/${caseId}/${file}`)
assert.ok(state.calls[0].options.abortSignal instanceof AbortSignal)
assert.equal(state.calls[0].configuration.endpoint, environment.QUOTATION_PRIVATE_R2_ENDPOINT)
assert.deepEqual((await media.getCasePrivateImage(caseId, file)).bytes, png)
await media.putCasePrivateImage(caseId, `${hash(jpg)}.jpg`, jpg, 'image/jpeg')
assert.equal((await media.getCasePrivateImage(caseId, `${hash(jpg)}.jpg`)).contentType, 'image/jpeg')

const writesBefore = state.calls.filter(({ kind }) => kind === 'put').length
await assert.rejects(media.putCasePrivateImage('../foreign', file, png, 'image/png'))
await assert.rejects(media.putCasePrivateImage(caseId, '../path.png', png, 'image/png'))
await assert.rejects(media.putCasePrivateImage(caseId, file, png, 'image/jpeg'))
await assert.rejects(media.putCasePrivateImage(caseId, `${'a'.repeat(64)}.png`, png, 'image/png'))
const oversized = Buffer.alloc(10 * 1024 * 1024 + 1)
await assert.rejects(media.putCasePrivateImage(caseId, `${hash(oversized)}.png`, oversized, 'image/png'))
const truncated = png.subarray(0, Math.floor(png.length / 2))
await assert.rejects(media.putCasePrivateImage(caseId, `${hash(truncated)}.png`, truncated, 'image/png'))
assert.equal(state.calls.filter(({ kind }) => kind === 'put').length, writesBefore)

const object = state.objects.get(`cases/${caseId}/${file}`)
object.bytes = Buffer.concat([png, Buffer.from('tampered')])
await assert.rejects(media.getCasePrivateImage(caseId, file))
object.bytes = png
object.type = 'text/html'
await assert.rejects(media.getCasePrivateImage(caseId, file))
object.type = 'image/png'
object.length = 10 * 1024 * 1024 + 1
await assert.rejects(media.getCasePrivateImage(caseId, file))
delete object.length

const callsBeforeConfigTests = state.calls.length
for (const provider of [undefined, 'local', 'unknown']) {
  environment.QUOTATION_PRIVATE_STORAGE_PROVIDER = provider
  await assert.rejects(media.getCasePrivateImage(caseId, file))
}
environment.QUOTATION_PRIVATE_STORAGE_PROVIDER = 'r2-private'
const privateBucket = environment.QUOTATION_PRIVATE_R2_BUCKET
environment.QUOTATION_PRIVATE_R2_BUCKET = environment.R2_BUCKET_NAME
await assert.rejects(media.getCasePrivateImage(caseId, file))
environment.QUOTATION_PRIVATE_R2_BUCKET = privateBucket
const privateKey = environment.QUOTATION_PRIVATE_R2_ACCESS_KEY_ID
delete environment.QUOTATION_PRIVATE_R2_ACCESS_KEY_ID
await assert.rejects(media.getCasePrivateImage(caseId, file))
environment.QUOTATION_PRIVATE_R2_ACCESS_KEY_ID = privateKey
assert.equal(state.calls.length, callsBeforeConfigTests)
state.sdkFail = true
await assert.rejects(media.getCasePrivateImage(caseId, file), (error) => !error.message.includes('SECRET SDK'))
state.sdkFail = false
state.hang = true
state.forceTimeout = true
await assert.rejects(media.getCasePrivateImage(caseId, file), (error) => !error.message.includes('SECRET SDK'))
assert.equal(state.calls.at(-1).options.abortSignal.aborted, true)
state.hang = false
state.forceTimeout = false

const { GET } = await load(['src/app/api/admin/case-images/[caseId]/[image]/route.ts'], {
  '@/lib/auth-utils': `export async function getCurrentUser() { return require('case-private-test-state').state.user; }`,
  '@/lib/prisma': `export const prisma = { caseStudy: { findUnique: async () => { const state = require('case-private-test-state').state; state.dbReads++; if (state.dbFail) throw new Error('SECRET DB must not leak'); return state.record; } } };`,
  '@/lib/cases/private-media': `export async function getCasePrivateImage() { const state = require('case-private-test-state').state; state.storageReads++; if (state.storageFail) throw new Error('SECRET SDK must not leak'); return { bytes: Buffer.from([137,80,78,71]), contentType: 'image/png' }; }`,
})
const request = (caseValue = caseId, imageValue = file, suffix = '') => GET(new Request(`http://isolated.test/api/admin/case-images/${caseValue}/${imageValue}${suffix}`), { params: Promise.resolve({ caseId: caseValue, image: imageValue }) })
state.user = null
assert.equal((await request()).status, 401)
state.user = { role: 'CUSTOMER' }
assert.equal((await request()).status, 403)
assert.equal(state.dbReads, 0)
assert.equal(state.storageReads, 0)
state.user = { role: 'ADMIN' }
assert.equal((await request('../other')).status, 404)
assert.equal((await request(caseId, file, '?signed=x')).status, 404)
assert.equal(state.dbReads, 0)
state.record = null
assert.equal((await request()).status, 404)
state.record = { coverImage: '', gallery: [{ url: url.replace(caseId, secondCaseId) }] }
assert.equal((await request()).status, 404)
assert.equal(state.storageReads, 0)
state.record = { coverImage: '', gallery: [{ url }] }
const response = await request()
assert.equal(response.status, 200)
assert.equal(response.headers.get('cache-control'), 'private, no-store')
assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow')
assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
assert.equal(response.headers.get('content-disposition'), `inline; filename="${file}"`)
assert.equal(response.headers.get('content-type'), 'image/png')
state.record = { coverImage: url, gallery: [] }
assert.equal((await request()).status, 200)
state.storageFail = true
const failed = await request()
assert.equal(failed.status, 503)
assert.equal((await failed.text()).includes('SECRET'), false)
state.storageFail = false
state.dbFail = true
const dbFailed = await request()
assert.equal(dbFailed.status, 503)
assert.equal((await dbFailed.text()).includes('SECRET'), false)
process.stdout.write('PASS: isolated private case image validation, R2 namespace/config isolation, hash/MIME/size integrity, complete decode, abort timeout, auth-before-read, exact membership, cache/noindex headers and safe storage/DB failure. No real DB/storage/network calls.\n')
