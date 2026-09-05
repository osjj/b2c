// Real upload handler and image validation, isolated DB/storage/auth doubles.
// No .env loading, real credentials, database, storage network or scanner calls.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import sharp from 'sharp'

const nodeRequire = createRequire(import.meta.url)
const environment = { NODE_ENV: 'production', QUOTATION_WORKBENCH_ENABLED: 'true' }
const state = { authorized: true, failCreate: false, duplicate: null, puts: [], deletes: [], rows: [], audits: [], reads: 0 }
const storage = {
  provider: 'r2-private',
  put: async (...args) => { state.puts.push(args) },
  delete: async (key) => { state.deletes.push(key) },
}
const db = {
  quotationSourceFile: {
    findFirst: async () => { state.reads++; return state.duplicate },
    create: async ({ data }) => {
      if (state.failCreate) throw new Error('Isolated database failure')
      state.rows.push(data)
      return { id: data.id, displayName: data.displayName, contentType: data.contentType, sizeBytes: data.sizeBytes, securityStatus: data.securityStatus }
    },
  },
  quotationAuditLog: { create: async ({ data }) => { state.audits.push(data) } },
  $transaction: async (work) => work(db),
}
const mocks = {
  '@/lib/prisma': 'export const prisma = require("quotation-upload-test-state").db;',
  '@/lib/auth-utils': 'export async function requireAdmin() { if (!require("quotation-upload-test-state").state.authorized) throw new Error("Denied"); return { id: "isolated-admin" }; }',
  '@/lib/quotation/private-storage': 'export function getQuotationPrivateStorage() { return require("quotation-upload-test-state").storage; }',
  'next/navigation': 'export function unstable_rethrow() {}',
}
const built = await build({
  entryPoints: ['src/app/api/admin/quotation-files/upload/route.ts'],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  define: { 'process.env': '__quotationTestEnvironment' },
  plugins: [{ name: 'isolated-upload', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path }) => {
      if (path in mocks) return { path, namespace: 'mock' }
      if (path === 'quotation-upload-test-state') return { path, external: true }
    })
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }))
  } }],
})
const routeModule = { exports: {} }
new Function('require', 'module', 'exports', '__quotationTestEnvironment', built.outputFiles[0].text)(
  (name) => {
    assert.ok(!['child_process', 'node:child_process'].includes(name), 'Upload must not load a scanner process')
    return name === 'quotation-upload-test-state' ? { state, db, storage } : nodeRequire(name)
  }, routeModule, routeModule.exports, environment,
)
const { POST } = routeModule.exports
const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer()
function request(content = bytes, name = 'product.png', type = 'image/png', headers) {
  const form = new FormData()
  form.set('file', new File([content], name, { type }))
  return new Request('http://isolated.test/api/admin/quotation-files/upload', { method: 'POST', body: form, headers })
}

// Authorized production upload: no scanner variables or executable needed.
const uploaded = await POST(request())
assert.equal(uploaded.status, 201)
const uploadedBody = await uploaded.json()
assert.equal(uploadedBody.success, true)
assert.equal(uploadedBody.data.securityStatus, 'CLEAN')
assert.equal('objectKey' in uploadedBody.data, false)
assert.equal(state.rows.length, 1)
assert.equal(state.audits.length, 1)
assert.deepEqual(state.puts[0][1], bytes)

// Stale scanner configuration is ignored too.
environment.QUOTATION_CLAMSCAN_PATH = '/missing-scanner'
assert.equal((await POST(request())).status, 201)

const effects = () => [state.puts.length, state.rows.length, state.audits.length, state.reads]
const baseline = effects()
state.authorized = false
assert.equal((await (await POST(request())).json()).success, false)
state.authorized = true
environment.QUOTATION_WORKBENCH_ENABLED = 'false'
assert.equal((await (await POST(request())).json()).code, 'FEATURE_DISABLED')
environment.QUOTATION_WORKBENCH_ENABLED = 'true'
assert.deepEqual(effects(), baseline)

assert.equal((await POST(request(bytes, 'product.jpg'))).status, 400)
assert.equal((await POST(request(Buffer.from('not an image')))).status, 400)
assert.equal((await POST(request(bytes, 'product.png', 'image/jpeg'))).status, 400)
assert.equal((await POST(request(bytes, 'product.png', 'image/png', { 'content-length': String(14 * 1024 * 1024) }))).status, 413)
assert.deepEqual(effects(), baseline)

state.duplicate = uploadedBody.data
assert.equal((await POST(request())).status, 200)
assert.equal(state.puts.length, baseline[0])
state.duplicate = null

state.failCreate = true
assert.equal((await POST(request())).status, 500)
assert.equal(state.deletes.length, 1)
assert.equal(state.deletes[0], state.puts.at(-1)[0])
assert.equal(state.rows.length, baseline[1])
process.stdout.write('PASS: 10 isolated upload cases (production without scanner, stale scanner config, auth, feature gate, extension, image, MIME, size, duplicate, failed-write cleanup). No database or R2 contacted.\n')
