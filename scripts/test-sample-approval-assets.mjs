import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const slug = 'ppe-sample-approval-pre-shipment-checklist'
const origin = 'https://shop.laifappe.com'
const imageKeys = ['hero', 'record-the-approved-sample-and-document-baseline', 'use-a-pre-shipment-verification-record']
const outputPath = resolve('prisma', `blog-images.${slug}.generated.json`)
const source = await readFile(new URL(`../prisma/generate-blog-images.${slug}.ts`, import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText.replace('main().catch(', 'globalThis.completion = main().catch(')

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const imageBytes = (key) => Buffer.from(`reviewed-image:${key}`)
const objectKey = (key) => `blog/${slug}/${key}-${digest(imageBytes(key)).slice(0, 12)}.webp`
const missing = () => Object.assign(new Error('not found'), { code: 'ENOENT', $metadata: { httpStatusCode: 404 } })

async function run(args = [], options = {}) {
  const files = new Map(imageKeys.map((key) => [resolve('public/blog', slug, `${key}.webp`), imageBytes(key)]))
  files.set(resolve('public/downloads', `${slug}.txt`), Buffer.from('PPE blank worksheet '.repeat(60)))
  if (options.manifest !== undefined) files.set(outputPath, JSON.stringify(options.manifest))
  if (options.missingImage) files.delete(resolve('public/blog', slug, `${options.missingImage}.webp`))
  const objects = new Map(options.objects ?? [])
  const requests = []
  const fileWrites = []
  const events = []
  let errorOutput = ''
  const processStub = {
    argv: ['node', 'upload-assets.ts', ...args], exitCode: 0,
    env: { R2_PUBLIC_URL: origin, QUOTATION_PRIVATE_R2_BUCKET: 'quotation-private', ...options.env },
    stdout: { write: (text) => events.push(JSON.parse(text)) },
    stderr: { write: (text) => { errorOutput += text } },
  }
  class HeadObjectCommand { constructor(input) { this.input = input } }
  class GetObjectCommand { constructor(input) { this.input = input } }
  class PutObjectCommand { constructor(input) { this.input = input } }
  const fileSystem = {
    readFile: async (path, encoding) => {
      if (!files.has(path)) throw missing()
      const value = files.get(path)
      return encoding ? String(value) : Buffer.from(value)
    },
    writeFile: async (path, value, settings) => {
      assert.equal(settings.flag, 'wx')
      assert.ok(path.startsWith(`${outputPath}.`) && path.endsWith('.tmp'))
      fileWrites.push(path)
      files.set(path, value)
    },
    rename: async (from, to) => { assert.equal(to, outputPath); files.set(to, files.get(from)); files.delete(from) },
    rm: async (path) => { files.delete(path) },
  }
  const storage = {
    r2BucketName: options.bucket ?? 'medusa',
    assertR2Configured: () => {},
    r2Client: { send: async (command, settings) => {
      assert.ok(settings.abortSignal instanceof AbortSignal)
      const { Key, Bucket } = command.input
      assert.equal(Bucket, 'medusa')
      assert.ok(Key.startsWith(`blog/${slug}/`))
      requests.push({ type: command.constructor.name, input: command.input })
      if (options.remoteFailure) throw new Error('secret-key-do-not-print')
      if (command instanceof HeadObjectCommand) {
        if (!objects.has(Key)) throw missing()
        return {}
      }
      if (command instanceof GetObjectCommand) return { Body: { transformToByteArray: async () => objects.get(Key) } }
      assert.equal(command.input.IfNoneMatch, '*')
      if (objects.has(Key) || options.concurrentConflict) throw Object.assign(new Error('conflict'), { $metadata: { httpStatusCode: 412 } })
      objects.set(Key, command.input.Body)
      return {}
    } },
  }
  const context = vm.createContext({
    exports: {}, Buffer, Uint8Array, process: processStub,
    AbortSignal: { timeout: (ms) => { assert.equal(ms, 30_000); return AbortSignal.timeout(ms) } },
    require: (name) => {
      if (name === 'dotenv/config') return {}
      if (name === 'node:fs/promises') return fileSystem
      if (name === '@aws-sdk/client-s3') return { HeadObjectCommand, GetObjectCommand, PutObjectCommand }
      if (name === 'sharp') return () => ({ metadata: async () => ({ format: options.format ?? 'webp', width: 1600, height: 900 }) })
      if (name === '../src/lib/r2') return storage
      if (name.startsWith('node:')) return require(name)
      throw new Error(`Unexpected module ${name}`)
    },
    fetch: async (url, settings) => {
      requests.push({ type: 'fetch', url })
      assert.ok(settings.signal instanceof AbortSignal)
      assert.equal(settings.redirect, 'error')
      assert.ok(url.startsWith(`${origin}/blog/${slug}/`))
      if (options.failReadbackKey && url.includes(options.failReadbackKey)) return new Response('wrong bytes', { headers: { 'content-type': 'image/webp' } })
      const bytes = objects.get(url.slice(origin.length + 1))
      return new Response(bytes, { headers: { 'content-type': url.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'image/webp' } })
    },
  })
  vm.runInContext(compiled, context)
  await context.completion
  assert.ok(!errorOutput.includes('secret-key-do-not-print'))
  return { files, objects, requests, fileWrites, events, errorOutput, exitCode: processStub.exitCode }
}

test('local inspect and invalid arguments never call remote services or write files', async () => {
  const inspect = await run()
  assert.equal(inspect.exitCode, 0)
  assert.equal(inspect.events[0].mode, 'inspect')
  const invalid = await run(['--force'])
  assert.equal(invalid.exitCode, 1)
  for (const result of [inspect, invalid]) {
    assert.equal(result.requests.length, 0)
    assert.equal(result.fileWrites.length, 0)
  }
})

test('missing or malformed inputs and untrusted destinations fail before remote access', async () => {
  for (const options of [
    { missingImage: 'hero' }, { format: 'png' }, { bucket: 'quotation-private' }, { bucket: 'another-public-bucket' },
    { env: { R2_PUBLIC_URL: 'https://example.invalid' } }, { env: { QUOTATION_PRIVATE_R2_BUCKET: 'medusa' } },
    { manifest: { unrelated: 'https://example.invalid/asset.webp' } },
  ]) {
    const result = await run(['--apply'], options)
    assert.equal(result.exitCode, 1)
    assert.equal(result.requests.length, 0)
    assert.equal(result.fileWrites.length, 0)
  }
})

test('apply verifies all assets and repeat apply performs zero object writes', async () => {
  const first = await run(['--apply'])
  assert.equal(first.exitCode, 0)
  const writes = first.requests.filter((request) => request.type === 'PutObjectCommand')
  assert.equal(writes.length, 4)
  assert.ok(writes.slice(0, 3).every(({ input }) => input.CacheControl.includes('immutable')))
  assert.match(writes[3].input.ContentDisposition, /attachment; filename=/)
  assert.equal(first.events.at(-1).complete, true)
  const manifest = JSON.parse(first.files.get(outputPath))
  assert.deepEqual(Object.keys(manifest), imageKeys)
  const second = await run(['--apply'], { objects: first.objects, manifest })
  assert.equal(second.exitCode, 0)
  assert.equal(second.requests.filter((request) => request.type === 'PutObjectCommand').length, 0)
  assert.ok(second.events.filter((event) => event.objectWrites !== undefined).every((event) => event.objectWrites === 0))
})

test('remote content conflicts and concurrent object creation never overwrite an object', async () => {
  const key = objectKey('hero')
  const conflicting = Buffer.from('different remote asset')
  const result = await run(['--apply'], { objects: [[key, conflicting]] })
  assert.equal(result.exitCode, 1)
  assert.equal(result.requests.filter((request) => request.type === 'PutObjectCommand').length, 0)
  assert.deepEqual(result.objects.get(key), conflicting)
  assert.equal(result.fileWrites.length, 0)
  const concurrent = await run(['--apply'], { concurrentConflict: true })
  assert.equal(concurrent.exitCode, 1)
  assert.equal(concurrent.fileWrites.length, 0)
  assert.equal(concurrent.objects.size, 0)
})

test('later readback failure preserves existing mappings and verified progress', async () => {
  const oldKey = imageKeys[2]
  const oldUrl = `${origin}/blog/${slug}/${oldKey}-0123456789ab.webp`
  const result = await run(['--apply'], { manifest: { [oldKey]: oldUrl }, failReadbackKey: imageKeys[1] })
  assert.equal(result.exitCode, 1)
  const manifest = JSON.parse(result.files.get(outputPath))
  assert.equal(manifest[oldKey], oldUrl)
  assert.equal(manifest.hero, `${origin}/${objectKey('hero')}`)
  assert.equal(manifest[imageKeys[1]], undefined)
  assert.ok(!result.events.some((event) => event.complete))
  assert.equal([...result.files.keys()].filter((path) => path.endsWith('.tmp')).length, 0)
})

test('provider failures emit only a fixed safe diagnostic and never retry blindly', async () => {
  const result = await run(['--apply'], { remoteFailure: true })
  assert.equal(result.exitCode, 1)
  assert.match(result.errorOutput, /^SAMPLE_APPROVAL_ASSET_UPLOAD_FAILED:/)
  assert.equal(result.requests.length, 1)
  assert.equal(result.fileWrites.length, 0)
})
