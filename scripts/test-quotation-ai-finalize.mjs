// Real finalization, AI adapter, snapshot and PDF/Excel renderers with isolated I/O.
// No .env, actual API, PrismaClient, database, R2 or user data.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const nodeRequire = createRequire(import.meta.url)
const initialRevision = () => ({
  id: 'cmockrevision0000000000000', salesQuotationId: 'cmockquotation000000000000', state: 'DRAFT', version: 1,
  revisionNumber: 1, documentLanguage: 'ENGLISH', templateVersion: 'jordan-ai-v1', quotationDate: new Date('2026-09-06T00:00:00Z'), validUntil: null,
  currency: 'USD', currencyMinorUnit: 2, roundingMode: 'HALF_UP', customerSnapshot: { companyName: 'Isolated Buyer', contacts: [] },
  publicTerms: {}, subtotal: '3.00', discountAmount: '0', discountPercent: null, shippingFee: '0', otherFee: '0', taxRate: '0', taxAmount: '0', roundingAdjustment: '0', total: '3.00', totalCost: null, profit: null,
  salesQuotation: { quotationNumber: 'QT-ISOLATED' },
  items: [{ id: 'cmockitem00000000000000000', sortOrder: 0, quotationProductId: null, productId: null, nameEn: 'Sample', nameZh: null, model: null, sku: null, specifications: ['Material: Cotton'], unit: 'pcs', quantity: '3', unitPrice: '1', discountAmount: '0', discountPercent: null, unitCost: null, costCurrency: null, exchangeRate: null, internalNotes: null, lineTotal: '3', lineCost: null, assets: [] }],
})
let revision = initialRevision()
let attempts = []
let documents = []
const objects = new Map()
let apiCalls = 0
let failAi = false
const applyUpdate = (row, data) => {
  for (const [key, value] of Object.entries(data)) row[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : value
  return row
}
const matches = (row, where) => Object.entries(where).every(([key, value]) => value && typeof value === 'object' && 'in' in value ? value.in.includes(row[key]) : row[key] === value)
const db = {
  salesQuotationRevision: {
    findUnique: async () => structuredClone(revision),
    update: async ({ data }) => applyUpdate(revision, data),
    updateMany: async ({ where, data }) => { if (!matches(revision, where)) return { count: 0 }; applyUpdate(revision, data); return { count: 1 } },
  },
  salesQuotationItem: { update: async ({ where, data }) => applyUpdate(revision.items.find((item) => item.id === where.id), data) },
  salesQuotationItemAsset: { update: async () => { throw new Error('Unexpected asset update') } },
  salesQuotationDocument: { createMany: async ({ data }) => { documents.push(...data) } },
  quotationAuditLog: { create: async () => ({}) },
  quotationFinalizationAttempt: {
    findUnique: async ({ where }) => {
      const attempt = attempts.find((entry) => entry.idempotencyKey === where.idempotencyKey)
      return attempt ? { ...attempt, revision, documents: documents.filter((doc) => doc.attemptId === attempt.id) } : null
    },
    create: async ({ data }) => { attempts.push(data); return data },
    update: async ({ where, data }) => applyUpdate(attempts.find((entry) => matches(entry, where)), data),
    updateMany: async ({ where, data }) => { const rows = attempts.filter((entry) => matches(entry, where)); rows.forEach((row) => applyUpdate(row, data)); return { count: rows.length } },
  },
  $transaction: async (work) => {
    const backup = structuredClone({ revision, attempts, documents })
    try { return await work(db) } catch (error) { ({ revision, attempts, documents } = backup); throw error }
  },
}
const storage = { provider: 'r2-private', put: async (key, bytes) => { objects.set(key, bytes) }, move: async (from, to) => { objects.set(to, objects.get(from)); objects.delete(from) }, delete: async (key) => { objects.delete(key) } }
const mocks = {
  '@/lib/prisma': 'export const prisma=require("quotation-finalize-test-state").db;',
  '../private-storage': 'export function getQuotationPrivateStorage(){return require("quotation-finalize-test-state").storage;}',
  'next/navigation': 'export function unstable_rethrow(){}',
}
const built = await build({ entryPoints: ['src/lib/quotation/services/finalize.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  define: { 'process.env': '__quotationTestEnvironment' },
  plugins: [{ name: 'isolate-finalize', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path }) => {
      if (path in mocks) return { path, namespace: 'mock' }
      if (path === 'quotation-finalize-test-state') return { path, external: true }
    })
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }))
  } }],
})
const fixtureFetch = async (url) => {
  assert.equal(url, 'https://chat.glarivoglass.com/v1/chat/completions')
  apiCalls++
  if (failAi) return new Response('private upstream diagnostic', { status: 503 })
  return Response.json({ choices: [{ message: { content: JSON.stringify({ items: [{ position: 1, imageColumns: 1, labelPrefixes: ['Material:'], noteIndices: [] }] }) }, finish_reason: 'stop' }] })
}
const finalizerModule = { exports: {} }
new Function('require', 'module', 'exports', '__quotationTestEnvironment', 'fetch', built.outputFiles[0].text)(
  (name) => name === 'quotation-finalize-test-state' ? { db, storage } : nodeRequire(name), finalizerModule, finalizerModule.exports,
  { NODE_ENV: 'test', OPENAI_API_ENDPOINT: 'https://chat.glarivoglass.com', OPENAI_API_KEY: 'test-only' }, fixtureFetch,
)
const input = { revisionId: revision.id, expectedVersion: 1, idempotencyKey: 'ae7bff72-6290-4a65-9e60-8ddba178715c' }
const result = await finalizerModule.exports.finalizeQuotationRevision(input, 'isolated-admin')
assert.equal(result.status, 'FINALIZED')
assert.equal(apiCalls, 1)
assert.equal(documents.length, 4)
const snapshotFile = documents.find((doc) => doc.documentType === 'SNAPSHOT_JSON')
const snapshot = JSON.parse(objects.get(snapshotFile.objectKey).toString())
assert.equal(snapshot.layout.model, 'gpt-5.4')
assert.equal(snapshot.money.total, '3.00')
assert.deepEqual(snapshot.items[0].specifications, ['Material: Cotton'])
assert.equal((await finalizerModule.exports.finalizeQuotationRevision(input, 'isolated-admin')).status, 'FINALIZED')
assert.equal(apiCalls, 1, 'An idempotent replay must not call AI again')

revision = initialRevision(); attempts = []; documents = []; objects.clear(); failAi = true
await assert.rejects(finalizerModule.exports.finalizeQuotationRevision({ ...input, idempotencyKey: '68671528-1146-4d72-b0c2-d748985699e2' }, 'isolated-admin'), /AI quotation layout.*HTTP 503/)
assert.equal(apiCalls, 2)
assert.equal(revision.state, 'READY')
assert.equal(attempts[0].status, 'FAILED')
assert.equal(documents.length, 0)
assert.equal(objects.size, 0)
process.stdout.write('PASS: real finalizer stores AI layout in immutable snapshot, idempotent replay calls AI once, and AI failure restores draft without formal files. All external I/O mocked.\n')
