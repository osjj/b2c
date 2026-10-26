// Real publication-media helper and image decoder; all storage/config/network are isolated doubles.
// Never loads .env, sends a network request, writes a database or uploads a real object.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

import { build } from 'esbuild'
import sharp from 'sharp'

const nodeRequire = createRequire(import.meta.url)
const caseId = 'c123456789012345678901234'
const environment = { R2_PUBLIC_URL: 'https://public.invalid', QUOTATION_PRIVATE_R2_BUCKET: 'isolated-private' }
const state = {}
const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#f28a3a' } }).png().toBuffer()
const jpg = await sharp(png).jpeg().toBuffer()
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const sourceUrl = (bytes = png, extension = 'png') => `/api/admin/case-images/${caseId}/${hash(bytes)}.${extension}`
const objectKey = (bytes = png, extension = 'png') => `cases/${caseId}/${hash(bytes)}.${extension}`
const publicUrl = (bytes = png, extension = 'png') => `https://public.invalid/${objectKey(bytes, extension)}`

function reset() {
  for (const key of Object.keys(state)) delete state[key]
  Object.assign(state, { calls: [], privateCalls: [], httpCalls: [], objects: new Map(), private: { bytes: png, contentType: 'image/png' }, cancelled: 0 })
  environment.R2_PUBLIC_URL = 'https://public.invalid'
  environment.QUOTATION_PRIVATE_R2_BUCKET = 'isolated-private'
}
reset()

const mockSdk = `
export class GetObjectCommand { constructor(input) { this.input=input; this.kind='get'; } }
export class PutObjectCommand { constructor(input) { this.input=input; this.kind='put'; } }
`
const mockR2 = `
export const r2BucketName = 'isolated-public';
export function assertR2Configured() { if (require('case-publication-media-state').state.configFail) throw new Error('SECRET configuration details'); }
export const r2Client = { async send(command, options) {
  const state=require('case-publication-media-state').state;
  state.calls.push({kind:command.kind,input:command.input,options});
  if (state.sdkHang) { queueMicrotask(()=>state.expire()); return new Promise((_,reject)=>options.abortSignal.addEventListener('abort',()=>reject(new Error('SECRET SDK timeout')))); }
  if (state.sdkFail) throw new Error('SECRET SDK credentials');
  if (command.kind==='put') {
    if (state.putFail) throw new Error('SECRET SDK upload failed');
    if (state.race) {
      state.objects.set(command.input.Key,{bytes:state.race==='same'?Buffer.from(command.input.Body):Buffer.from('different object'),type:command.input.ContentType});
      throw Object.assign(new Error('SECRET concurrent object'),{name:'PreconditionFailed'});
    }
    if(state.objects.has(command.input.Key)) throw new Error('Conditional overwrite attempted');
    state.objects.set(command.input.Key,{bytes:state.corruptAfterPut?Buffer.from('corrupt copy'):Buffer.from(command.input.Body),type:command.input.ContentType});
    return {};
  }
  const item=state.objects.get(command.input.Key);
  if (!item) throw Object.assign(new Error('SECRET missing storage object'),{name:state.missingName||'NoSuchKey'});
  return {ContentType:state.sdkMime||item.type,ContentLength:state.omitSdkLength?undefined:(state.sdkLength??item.bytes.length),Body:{transformToWebStream:()=>new ReadableStream({
    start(controller){if(state.sdkBodyHang){queueMicrotask(()=>state.expire());return;}controller.enqueue(item.bytes);controller.close();},
    cancel(){state.cancelled++;}
  })}};
} };
`
const mockPrivate = `
export async function getCasePrivateImage(caseId,filename) {
  const state=require('case-publication-media-state').state;
  state.privateCalls.push({caseId,filename});
  if(state.privateFail)throw new Error('SECRET private storage details');
  if(state.privateHang){queueMicrotask(()=>state.expire());return new Promise(resolve=>{state.releasePrivate=()=>resolve(state.private);});}
  return state.private;
}
`
const built = await build({
  entryPoints: ['src/lib/cases/publication-images.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  define: { 'process.env': '__publicationEnvironment', fetch: '__publicationFetch', setTimeout: '__publicationSetTimeout', clearTimeout: '__publicationClearTimeout' },
  plugins: [{ name: 'isolated-case-publication-media', setup(plugin) {
    const mocks = { 'server-only': '', '@aws-sdk/client-s3': mockSdk, '../r2': mockR2, './private-media': mockPrivate }
    plugin.onResolve({ filter: /.*/ }, ({ path }) => {
      if (path in mocks) return { path, namespace: 'mock' }
      if (path === 'case-publication-media-state') return { path, external: true }
    })
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }))
  } }],
})
const testModule = { exports: {} }
const fakeFetch = async (url, options) => {
  state.httpCalls.push({ url, options })
  if (state.httpFail) throw new Error('SECRET HTTP transport failure')
  if (state.httpHang) {
    queueMicrotask(() => state.expire())
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('SECRET HTTP timeout'))))
  }
  const item = state.objects.get(new URL(url).pathname.slice(1))
  const bytes = state.httpBytes ?? item?.bytes ?? Buffer.from('missing object')
  const headers = { 'content-type': state.httpMime || item?.type || 'text/plain' }
  if (!state.omitHttpLength) headers['content-length'] = String(state.httpLength ?? bytes.length)
  const body = state.httpBodyHang
    ? new ReadableStream({ start() { queueMicrotask(() => state.expire()) }, cancel() { state.cancelled++ } })
    : bytes
  return new Response(body, { status: state.httpStatus ?? (item ? 200 : 404), headers })
}
new Function('require', 'module', 'exports', '__publicationEnvironment', '__publicationFetch', '__publicationSetTimeout', '__publicationClearTimeout', built.outputFiles[0].text)(
  name => name === 'case-publication-media-state' ? { state } : nodeRequire(name), testModule, testModule.exports, environment, fakeFetch,
  (callback, milliseconds) => { assert.equal(milliseconds, 45000); state.expire = callback; return setTimeout(callback, milliseconds) }, clearTimeout,
)
const { publishCasePrivateImage } = testModule.exports
const rejectedSafely = async (operation) => assert.rejects(operation, error => error instanceof Error
  && error.message.startsWith('This image could not be prepared for publication.') && !error.message.includes('SECRET'))
const writes = () => state.calls.filter(call => call.kind === 'put')

// New copies use the exact approved bytes, separate public namespace, conditional create,
// SDK readback, anonymous GET and the same bounded signal throughout the operation.
assert.equal(await publishCasePrivateImage(caseId, sourceUrl()), publicUrl())
assert.deepEqual(state.privateCalls, [{ caseId, filename: `${hash(png)}.png` }])
assert.equal(writes().length, 1)
assert.equal(writes()[0].input.IfNoneMatch, '*')
assert.equal(writes()[0].input.Bucket, 'isolated-public')
assert.equal(writes()[0].input.Key, objectKey())
assert.equal(writes()[0].input.ContentType, 'image/png')
assert.equal(writes()[0].input.Metadata.sha256, hash(png))
assert.deepEqual(writes()[0].input.Body, png)
assert.deepEqual(state.calls.map(call => call.kind), ['get', 'put', 'get'])
assert.equal(state.httpCalls[0].url, publicUrl())
assert.equal(state.httpCalls[0].options.credentials, 'omit')
assert.equal(state.httpCalls[0].options.redirect, 'error')
assert.equal(state.httpCalls[0].options.cache, 'no-store')
assert.ok(state.calls.every(call => call.options.abortSignal === state.httpCalls[0].options.signal))

const putsBeforeRetry = writes().length
assert.equal(await publishCasePrivateImage(caseId, sourceUrl()), publicUrl())
assert.equal(writes().length, putsBeforeRetry, 'Retry reuses an identical verified public original')

reset()
state.private = { bytes: jpg, contentType: 'image/jpeg' }
assert.equal(await publishCasePrivateImage(caseId, sourceUrl(jpg, 'jpg')), publicUrl(jpg, 'jpg'))
assert.deepEqual(state.objects.get(objectKey(jpg, 'jpg')).bytes, jpg)

for (const url of ['/other/image.png', sourceUrl().replace(caseId, 'c223456789012345678901234'), `${sourceUrl()}?signed=secret`]) {
  reset()
  await rejectedSafely(publishCasePrivateImage(caseId, url))
  assert.equal(state.privateCalls.length + state.calls.length + state.httpCalls.length, 0)
}
for (const invalidOrigin of ['http://public.invalid', 'https://user:secret@public.invalid', 'https://public.invalid/other', 'https://public.invalid?secret=1', 'https://public.invalid/#secret', 'not-a-url']) {
  reset()
  environment.R2_PUBLIC_URL = invalidOrigin
  await rejectedSafely(publishCasePrivateImage(caseId, sourceUrl()))
  assert.equal(state.privateCalls.length + state.calls.length, 0)
}
for (const privateBucket of [undefined, '', 'isolated-public']) {
  reset()
  environment.QUOTATION_PRIVATE_R2_BUCKET = privateBucket
  await rejectedSafely(publishCasePrivateImage(caseId, sourceUrl()))
  assert.equal(state.privateCalls.length + state.calls.length, 0)
}
reset()
state.configFail = true
await rejectedSafely(publishCasePrivateImage(caseId, sourceUrl()))
assert.equal(state.privateCalls.length + state.calls.length, 0)

// Correct file hashes alone cannot make an invalid or truncated image publishable.
for (const { bytes, contentType, extension = 'png', url } of [
  { bytes: png, contentType: 'image/jpeg' },
  { bytes: jpg, contentType: 'image/png' },
  { bytes: Buffer.alloc(0), contentType: 'image/png' },
  { bytes: Buffer.alloc(10 * 1024 * 1024 + 1), contentType: 'image/png' },
  { bytes: png.subarray(0, Math.floor(png.length / 2)), contentType: 'image/png' },
  { bytes: Buffer.concat([png, Buffer.from('modified')]), contentType: 'image/png', url: sourceUrl() },
]) {
  reset()
  state.private = { bytes, contentType }
  await rejectedSafely(publishCasePrivateImage(caseId, url ?? sourceUrl(bytes, extension)))
  assert.equal(state.calls.length, 0, 'Invalid original fails before any public storage calls')
}
reset()
state.privateFail = true
await rejectedSafely(publishCasePrivateImage(caseId, sourceUrl()))
assert.equal(state.calls.length, 0)

// Existing different objects, wrong MIME/length and unclassified SDK failures never overwrite.
for (const configure of [
  () => state.objects.set(objectKey(), { bytes: Buffer.from('different object'), type: 'image/png' }),
  () => { state.objects.set(objectKey(), { bytes: png, type: 'text/html' }) },
  () => { state.objects.set(objectKey(), { bytes: png, type: 'image/png' }); state.sdkLength = png.length + 1 },
  () => { state.objects.set(objectKey(), { bytes: png, type: 'image/png' }); state.sdkLength = 10 * 1024 * 1024 + 1 },
  () => { state.objects.set(objectKey(), { bytes: Buffer.alloc(10 * 1024 * 1024 + 1), type: 'image/png' }); state.omitSdkLength = true },
  () => { state.sdkFail = true },
  () => { state.missingName = 'AccessDenied' },
]) {
  reset()
  configure()
  await rejectedSafely(publishCasePrivateImage(caseId, sourceUrl()))
  assert.equal(writes().length, 0)
}
reset()
state.missingName = 'NotFound'
assert.equal(await publishCasePrivateImage(caseId, sourceUrl()), publicUrl())
reset()
state.race = 'same'
assert.equal(await publishCasePrivateImage(caseId, sourceUrl()), publicUrl())
assert.equal(writes().length, 1)
reset()
state.race = 'different'
await rejectedSafely(publishCasePrivateImage(caseId, sourceUrl()))
assert.equal(writes().length, 1)
assert.equal(state.httpCalls.length, 0)
for (const configure of [() => { state.putFail = true }, () => { state.corruptAfterPut = true }]) {
  reset()
  configure()
  await rejectedSafely(publishCasePrivateImage(caseId, sourceUrl()))
  assert.equal(writes().length, 1)
  assert.equal(state.httpCalls.length, 0)
}

// Public verification failures retain the copied object for retry but never report success.
for (const configure of [
  () => { state.httpStatus = 404 },
  () => { state.httpMime = 'text/html' },
  () => { state.httpBytes = Buffer.from('tampered public response') },
  () => { state.httpLength = png.length + 1 },
  () => { state.httpLength = 10 * 1024 * 1024 + 1 },
  () => { state.httpFail = true },
  () => { state.omitHttpLength = true; state.httpBytes = Buffer.alloc(10 * 1024 * 1024 + 1) },
]) {
  reset()
  configure()
  await rejectedSafely(publishCasePrivateImage(caseId, sourceUrl()))
  assert.equal(writes().length, 1)
  assert.equal(state.objects.size, 1)
}
reset()
state.omitHttpLength = true
state.omitSdkLength = true
assert.equal(await publishCasePrivateImage(caseId, sourceUrl()), publicUrl(), 'Lengthless valid streams remain supported')

// The single deadline bounds stalled SDK responses and both streaming bodies.
for (const configure of [
  () => { state.sdkHang = true },
  () => { state.objects.set(objectKey(), { bytes: png, type: 'image/png' }); state.sdkBodyHang = true },
  () => { state.httpHang = true },
  () => { state.httpBodyHang = true },
]) {
  reset()
  configure()
  await rejectedSafely(publishCasePrivateImage(caseId, sourceUrl()))
  await new Promise(resolve => setImmediate(resolve))
  assert.ok(state.calls[0].options.abortSignal.aborted)
  if (state.sdkBodyHang || state.httpBodyHang) assert.equal(state.cancelled, 1)
}
reset()
state.privateHang = true
await rejectedSafely(publishCasePrivateImage(caseId, sourceUrl()))
state.releasePrivate()
await new Promise(resolve => setImmediate(resolve))
assert.equal(state.calls.length, 0, 'A private read resolving after the deadline cannot start public writes')

process.stdout.write('PASS: isolated case publication-media ownership/config, full decode and integrity, conditional byte-preserving copy/reuse/conflict, SDK+anonymous verification, bounded streams/deadline and no late writes. No real DB/storage/network calls.\n')
