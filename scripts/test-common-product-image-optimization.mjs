// Real actions, service, retention and Sharp; isolated transactional DB/storage doubles and local adapter fixture.
// No .env loading, production connection, external request, or original-object overwrite.
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const MiB = 1024 * 1024
const output = resolve('output/verification/common-product-image-optimization')
await mkdir(output, { recursive: true })
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const cuid = number => `c${String(number).padStart(24, '0')}`
const productId = cuid(1), otherProductId = cuid(2), imageId = cuid(101), otherImageId = cuid(102), secondImageId = cuid(103)
const sourceId = '11111111-1111-4111-8111-111111111111'
const initialVersion = new Date('2026-10-22T01:00:00.000Z')
const originalKey = 'quotation/original/PRIVATE_SECRET_original.png'
const oldDocumentKey = 'quotation/frozen/PRIVATE_SECRET_document.pdf'
const operationPrefix = 'quotation.image-optimization.operation.'
const derivedPrefix = 'quotation.image-optimization.derived.'
const checkedPrefix = 'quotation.image-optimization.checked.'
const pinPrefix = 'quotation.image-original.'
const noise = Buffer.alloc(2600 * 1800 * 3)
let seed = 20261022
for (let index = 0; index < noise.length; index++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; noise[index] = seed & 255 }
const label = Buffer.from('<svg width="2600" height="1800" xmlns="http://www.w3.org/2000/svg"><rect x="80" y="80" width="2440" height="700" rx="30" fill="white"/><text x="140" y="230" fill="#134e4a" font-family="Arial" font-size="78">SAVED PRODUCT IMAGE QUALITY CHECK</text><text x="140" y="370" fill="#111827" font-family="Arial" font-size="50">Cotton glove | Size L | Product 0123456789</text><text x="140" y="470" fill="#111827" font-family="Arial" font-size="36">Fine label: ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789</text><text x="140" y="550" fill="#111827" font-family="Arial" font-size="24">Small text: abcdefghijklmnopqrstuvwxyz 0123456789</text><text x="140" y="610" fill="#111827" font-family="Arial" font-size="18">Tiny label 18px - preserved original is separately retained</text><path d="M140 680H2400 M140 695H2400 M140 710H2400" stroke="#111827" stroke-width="2"/><rect x="80" y="1000" width="300" height="300" fill="#ef4444"/><rect x="2220" y="1000" width="300" height="300" fill="#2563eb"/></svg>')
const base = sharp(noise, { raw: { width: 2600, height: 1800, channels: 3 } }).composite([{ input: label }])
const fixtures = {
  jpeg: { bytes: await base.clone().jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer(), contentType: 'image/jpeg', name: 'product.jpg' },
  png: { bytes: await base.clone().png().toBuffer(), contentType: 'image/png', name: 'product.png' },
  transparent: { bytes: await sharp(await base.clone().png().toBuffer()).extend({ top: 60, bottom: 60, left: 60, right: 60, background: '#00000000' }).png().toBuffer(), contentType: 'image/png', name: 'transparent.png' },
  orientation: { bytes: await base.clone().jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).withMetadata({ orientation: 6 }).toBuffer(), contentType: 'image/jpeg', name: 'orientation.jpg' },
  grayscale: { bytes: await base.clone().greyscale().jpeg({ quality: 100 }).toBuffer(), contentType: 'image/jpeg', name: 'grayscale.jpg' },
  small: { bytes: await sharp({ create: { width: 200, height: 160, channels: 4, background: '#0f766e80' } }).png().toBuffer(), contentType: 'image/png', name: 'small.png' },
  unchanged: { bytes: await sharp(noise, { raw: { width: 2600, height: 1800, channels: 3 } }).resize(1400, 970).jpeg({ quality: 40 }).toBuffer(), contentType: 'image/jpeg', name: 'optimized-before.jpg' },
}
// Ensure the no-benefit case reaches processing rather than the metadata-only small skip.
if (fixtures.unchanged.bytes.length <= 512 * 1024) fixtures.unchanged.bytes = await sharp(noise, { raw: { width: 2600, height: 1800, channels: 3 } }).resize(1900, 1315).jpeg({ quality: 55 }).toBuffer()
for (const [name, fixture] of Object.entries(fixtures)) {
  assert.ok(fixture.bytes.length <= 12 * MiB, `${name} fits server input bound`)
  await writeFile(resolve(output, `before-${name}.${fixture.contentType === 'image/jpeg' ? 'jpg' : 'png'}`), fixture.bytes)
}

let state, objects
const control = {}
let queue = Promise.resolve()
const report = { compression: [], cases: [] }
function reset(fixture = fixtures.jpeg) {
  Object.assign(control, { admin: true, enabled: true, dbCalls: [], storageCalls: [], paths: [], inTransaction: false, failAudit: false, failCreate: false, failSetting: false, putFailure: false, getFailure: false, transactionFailure: '', reconciliationFailure: false, failPinRead: false, onGet: null, onPut: null, onTransaction: null, onSourceLock: null, getOverride: null, locks: 0, requireBoundedRead: true })
  const source = { id: sourceId, salesQuotationId: null, displayName: fixture.name, originalFilename: fixture.name, contentType: fixture.contentType, sizeBytes: fixture.bytes.length, storageProvider: 'r2-private', objectKey: originalKey, sha256: hash(fixture.bytes), securityStatus: 'CLEAN', uploadedBy: 'original-admin', createdAt: new Date('2026-09-01T00:00:00.000Z'), deletedAt: null }
  const makeImage = (id, quotationProductId, sortOrder, isCustomerVisible) => ({ id, quotationProductId, sourceFileId: source.id, displayName: source.displayName, contentType: source.contentType, sizeBytes: source.sizeBytes, objectKey: source.objectKey, sha256: source.sha256, sortOrder, isCustomerVisible, createdAt: new Date('2026-09-01T00:00:00.000Z') })
  state = {
    products: [{ id: productId, nameEn: 'Selected work glove', nameZh: null, internalNumber: 'P-001', unit: 'pair', status: 'ACTIVE', productSource: 'Supplier original', costPriceText: '￥ 12', specifications: ['Original spec'], updatedAt: new Date(initialVersion) }, { id: otherProductId, nameEn: 'Shared source second product', status: 'INACTIVE', updatedAt: new Date(initialVersion) }],
    images: [makeImage(imageId, productId, 3, false), makeImage(otherImageId, otherProductId, 0, true), makeImage(secondImageId, productId, 1, true)],
    sources: [source], productSources: [], audits: [],
    settings: [{ key: `quotation.product-defaults.${productId}`, value: { unitPrice: '12.50', currency: 'USD', unitCost: '8.25' } }, { key: `quotation.product-category.${productId}`, value: { category: '手部防护' } }, { key: 'quotation.workbench.v2', value: { company: 'Original seller' } }],
    quotations: [{ id: cuid(201), quotationNumber: 'Q-KEEP-DRAFT' }, { id: cuid(202), quotationNumber: 'Q-KEEP-FINAL' }],
    revisions: [{ id: cuid(301), state: 'DRAFT', version: 4, total: '125.00', publicTerms: ['Saved draft terms'] }, { id: cuid(302), state: 'FINALIZED', version: 9, total: '999.00', publicTerms: ['Signed final terms'] }],
    items: [{ id: cuid(401), revisionId: cuid(301), quotationProductId: productId, nameEn: 'Saved draft product', unitPrice: '12.50', quantity: '10' }, { id: cuid(402), revisionId: cuid(302), quotationProductId: productId, nameEn: 'Saved final product', unitPrice: '99.90', quantity: '10' }],
    assets: [{ id: cuid(501), itemId: cuid(401), sourceFileId: sourceId, objectKey: originalKey, contentType: source.contentType, sizeBytes: source.sizeBytes, sha256: source.sha256, sortOrder: 0 }, { id: cuid(502), itemId: cuid(402), sourceFileId: sourceId, objectKey: originalKey, contentType: source.contentType, sizeBytes: source.sizeBytes, sha256: source.sha256, sortOrder: 0 }],
    documents: [{ id: cuid(601), revisionId: cuid(302), objectKey: oldDocumentKey, sha256: hash(Buffer.from('Frozen finalized PDF document')), sizeBytes: 29 }],
    catalog: [{ id: cuid(701), name: 'Live catalog unchanged', price: '15.00', isActive: true }],
  }
  objects = new Map([[originalKey, Buffer.from(fixture.bytes)], [oldDocumentKey, Buffer.from('Frozen finalized PDF document')]])
}
const relation = (model, row, key) => {
  if (model === 'quotationProduct' && key === 'images') return state.images.filter(image => image.quotationProductId === row.id)
  if (model === 'quotationProductImage' && key === 'sourceFile') return state.sources.find(source => source.id === row.sourceFileId) || null
  if (model === 'quotationProductImage' && key === 'quotationProduct') return state.products.find(product => product.id === row.quotationProductId) || null
  if (model === 'quotationSourceFile' && key === 'productImages') return state.images.filter(image => image.sourceFileId === row.id)
  if (model === 'quotationSourceFile' && key === 'productSources') return state.productSources.filter(source => source.sourceFileId === row.id)
  return row[key]
}
const relationModel = key => ({ images: 'quotationProductImage', sourceFile: 'quotationSourceFile', quotationProduct: 'quotationProduct', productImages: 'quotationProductImage', productSources: 'quotationProductSource' })[key]
function matches(model, row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'AND') return (Array.isArray(value) ? value : [value]).every(part => matches(model, row, part))
    if (key === 'OR') return value.some(part => matches(model, row, part))
    if (key === 'NOT') return !matches(model, row, value)
    const actual = relation(model, row, key)
    if (value instanceof Date) return actual instanceof Date && actual.getTime() === value.getTime()
    if (value && typeof value === 'object') {
      if ('some' in value) return actual.some(item => matches(relationModel(key), item, value.some))
      if ('is' in value) return value.is === null ? actual === null : actual && matches(relationModel(key), actual, value.is)
      return Object.entries(value).every(([operator, expected]) => {
        if (operator === 'in') return expected.includes(actual)
        if (operator === 'notIn') return !expected.includes(actual)
        if (operator === 'not') return actual !== expected
        if (operator === 'gt') return actual > expected
        if (operator === 'gte') return actual >= expected
        if (operator === 'lt') return actual < expected
        if (operator === 'lte') return actual <= expected
        if (operator === 'equals') return actual === expected
        if (operator === 'startsWith') return actual.startsWith(expected)
        throw new Error(`Unhandled fixture predicate ${model}.${key}.${operator}`)
      })
    }
    return actual === value
  })
}
function sorted(rows, orderBy) {
  const orders = !orderBy ? [] : Array.isArray(orderBy) ? orderBy : [orderBy]
  return [...rows].sort((a, b) => { for (const order of orders) for (const [key, direction] of Object.entries(order)) { if (a[key] !== b[key]) return (a[key] < b[key] ? -1 : 1) * (direction === 'desc' ? -1 : 1) }; return 0 })
}
function project(model, row, args = {}) {
  if (!row) return null
  const result = args.select ? {} : structuredClone(row)
  for (const [key, selection] of Object.entries(args.select || args.include || {})) {
    if (!selection) continue
    let value = relation(model, row, key)
    if (Array.isArray(value) && typeof selection === 'object') {
      value = sorted(value.filter(item => matches(relationModel(key), item, selection.where)), selection.orderBy)
      if (selection.take) value = value.slice(0, selection.take)
      value = value.map(item => project(relationModel(key), item, selection))
    } else if (value && typeof selection === 'object') value = project(relationModel(key), value, selection)
    result[key] = structuredClone(value)
  }
  return result
}
const modelTables = { quotationProduct: 'products', quotationProductImage: 'images', quotationSourceFile: 'sources', quotationProductSource: 'productSources', setting: 'settings', quotationAuditLog: 'audits', salesQuotationItemAsset: 'assets', salesQuotationItem: 'items', salesQuotationRevision: 'revisions', salesQuotationDocument: 'documents', salesQuotation: 'quotations', product: 'catalog' }
const permittedWrites = new Set(['quotationProduct', 'quotationProductImage', 'quotationSourceFile', 'setting', 'quotationAuditLog'])
const db = {}
for (const [model, table] of Object.entries(modelTables)) {
  const record = (method, args) => {
    control.dbCalls.push({ model, method, args: structuredClone(args), transaction: control.inTransaction })
    if (control.reconciliationFailure) throw new Error('PRIVATE_SECRET uncertain read failure')
    if (model === 'setting' && control.failPinRead && args.where?.key?.startsWith(pinPrefix)) throw new Error('PRIVATE_SECRET retention lookup failed')
  }
  const mutate = (method, args) => { record(method, args); assert.ok(permittedWrites.has(model), `Must not mutate historical table ${model}`); if (model === 'quotationAuditLog' && control.failAudit) throw new Error('PRIVATE_SECRET audit failed'); if (model === 'setting' && control.failSetting) throw new Error('PRIVATE_SECRET marker failed'); if (model === 'quotationSourceFile' && method === 'create' && control.failCreate) throw new Error('PRIVATE_SECRET source create failed') }
  db[model] = {
    findUnique: async args => { record('findUnique', args); return project(model, state[table].find(row => matches(model, row, args.where)), args) },
    findFirst: async (args = {}) => { record('findFirst', args); return project(model, sorted(state[table].filter(row => matches(model, row, args.where)), args.orderBy)[0], args) },
    findMany: async (args = {}) => { record('findMany', args); let rows = sorted(state[table].filter(row => matches(model, row, args.where)), args.orderBy); if (args.cursor) { const index = rows.findIndex(row => matches(model, row, args.cursor)); rows = rows.slice(index + (args.skip || 0)) }; if (args.take) rows = rows.slice(0, args.take); return rows.map(row => project(model, row, args)) },
    count: async (args = {}) => { record('count', args); return state[table].filter(row => matches(model, row, args.where)).length },
    create: async args => { mutate('create', args); if (model === 'setting') assert.equal(state.settings.some(row => row.key === args.data.key), false, 'Setting key unique'); const row = { id: randomUUID(), ...structuredClone(args.data) }; state[table].push(row); return project(model, row, args) },
    createMany: async args => { mutate('createMany', args); state[table].push(...structuredClone(args.data)); return { count: args.data.length } },
    update: async args => { mutate('update', args); const row = state[table].find(row => matches(model, row, args.where)); assert.ok(row, `Missing ${model} update row`); Object.assign(row, structuredClone(args.data)); return project(model, row, args) },
    updateMany: async args => { mutate('updateMany', args); const rows = state[table].filter(row => matches(model, row, args.where)); rows.forEach(row => Object.assign(row, structuredClone(args.data))); return { count: rows.length } },
    upsert: async args => { mutate('upsert', args); let row = state[table].find(row => matches(model, row, args.where)); if (row) Object.assign(row, structuredClone(args.update)); else { row = structuredClone(args.create); state[table].push(row) }; return project(model, row, args) },
    delete: async args => { mutate('delete', args); const row = state[table].find(row => matches(model, row, args.where)); state[table] = state[table].filter(item => item !== row); return project(model, row, args) },
    deleteMany: async args => { mutate('deleteMany', args); const before = state[table].length; state[table] = state[table].filter(row => !matches(model, row, args.where)); return { count: before - state[table].length } },
  }
}
db.$executeRaw = db.$queryRaw = async (...args) => {
  assert.equal(control.inTransaction, true); control.locks++
  const query = String(args[0]); control.dbCalls.push({ model: '$lock', method: 'raw', args: query, values: args.slice(1), transaction: true })
  if (query.includes('quotation_source_files') && query.includes('FOR UPDATE') && control.onSourceLock) {
    const hook = control.onSourceLock; control.onSourceLock = null; await hook()
  }
  return []
}
db.$transaction = async work => {
  const previous = queue; let release; queue = new Promise(resolve => { release = resolve }); await previous
  const backup = structuredClone(state)
  control.inTransaction = true
  try {
    if (control.onTransaction) { const hook = control.onTransaction; control.onTransaction = null; hook() }
    const result = await work(db)
    const failure = control.transactionFailure; control.transactionFailure = ''
    if (failure === 'rollback') throw new Error('PRIVATE_SECRET definite transaction failure')
    if (failure === 'committed') { control.inTransaction = false; throw Object.assign(new Error('PRIVATE_SECRET commit acknowledgement lost'), { fixtureCommitted: true }) }
    if (failure === 'unknown') { control.inTransaction = false; control.reconciliationFailure = true; throw Object.assign(new Error('PRIVATE_SECRET unknown commit'), { fixtureCommitted: true }) }
    return result
  } catch (error) { if (!error.fixtureCommitted) state = backup; throw error } finally { control.inTransaction = false; release() }
}
const storage = {
  provider: 'r2-private',
  get: async (key, contentType, options) => { assert.equal(control.inTransaction, false, 'Storage read outside transaction'); if (control.requireBoundedRead) assert.equal(options?.maxBytes, 12 * MiB, 'Storage read is explicitly bounded'); control.storageCalls.push({ method: 'get', key }); if (control.getFailure) throw new Error('PRIVATE_SECRET get failed'); const bytes = objects.get(key); assert.ok(bytes, 'Read only known private fixture objects'); if (control.onGet) { const hook = control.onGet; control.onGet = null; hook() }; return control.getOverride || { bytes: Buffer.from(bytes), contentType, sizeBytes: bytes.length, sha256: hash(bytes) } },
  put: async (key, bytes, contentType) => { assert.equal(control.inTransaction, false, 'Storage write outside transaction'); assert.equal(objects.has(key), false, 'Never overwrite any original or committed object'); control.storageCalls.push({ method: 'put', key, size: bytes.length, contentType }); if (control.putFailure) throw new Error('PRIVATE_SECRET put failed'); objects.set(key, Buffer.from(bytes)); if (control.onPut) { const hook = control.onPut; control.onPut = null; hook() }; return { bytes: Buffer.from(bytes), contentType, sizeBytes: bytes.length, sha256: hash(bytes) } },
  delete: async key => { assert.equal(control.inTransaction, false, 'Object deletion happens outside/after its transaction'); assert.notEqual(key, originalKey, 'Never delete root original'); assert.notEqual(key, oldDocumentKey, 'Never delete historical document'); control.storageCalls.push({ method: 'delete', key }); objects.delete(key) },
}
const mocks = {
  '@/lib/prisma': 'export const prisma=require("optimization-fixture").db',
  '@/lib/auth-utils': 'import {QuotationError} from "@/lib/quotation/errors";export async function requireAdmin(){if(!require("optimization-fixture").control.admin)throw new QuotationError("FORBIDDEN","Denied");return {id:"fixture-admin"}}',
  '@/lib/quotation/feature': 'import {QuotationError} from "@/lib/quotation/errors";export function assertQuotationWorkbenchEnabled(){if(!require("optimization-fixture").control.enabled)throw new QuotationError("FEATURE_DISABLED","Disabled")}',
  '@/lib/quotation/private-storage': 'export function getQuotationPrivateStorage(){return require("optimization-fixture").storage}',
  'next/cache': 'export function revalidatePath(path){require("optimization-fixture").control.paths.push(path)}',
  'next/navigation': 'export function unstable_rethrow(){}',
  'server-only': '',
}
const built = await build({
  stdin: { contents: 'export * from "./src/actions/admin/common-product-image-optimization";export {removeUnreferencedQuotationSourceFile} from "./src/lib/quotation/file-retention";export {GET as imageGET} from "./src/app/api/admin/quotation-images/[id]/route"', loader: 'ts', resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'process.env': '{}' },
  plugins: [{ name: 'optimization-isolation', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path }) => path in mocks ? { path, namespace: 'fixture' } : path.endsWith('/private-storage') || path === './private-storage' ? { path: '@/lib/quotation/private-storage', namespace: 'fixture' } : path === 'optimization-fixture' ? { path, external: true } : undefined)
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: mocks[path], loader: 'js', resolveDir: process.cwd() }))
  } }],
})
const actionModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(name => {
  if (name === 'optimization-fixture') return { db, control, storage }
  assert.ok(!name.includes('aws-sdk') && !['http', 'https', 'node:http', 'node:https', 'node:child_process'].includes(name), `No external I/O module: ${name}`)
  return require(name)
}, actionModule, actionModule.exports)
const { scanCommonProductImageOptimization: scan, optimizeCommonProductImage: optimize, removeUnreferencedQuotationSourceFile: retain, imageGET } = actionModule.exports
const input = (overrides = {}) => ({ requestId: randomUUID(), productId, imageId, sourceFileId: sourceId, expectedUpdatedAt: initialVersion.toISOString(), ...overrides })
const safe = result => { const serialized = JSON.stringify(result); assert.equal(serialized.includes('PRIVATE_SECRET'), false, 'No raw object keys or internal errors in action response'); assert.equal(serialized.includes('objectKey'), false); assert.equal(/sha256|storageProvider|credential/i.test(serialized), false, 'No hashes, provider, or credentials in browser result'); return result }
const immutableKeys = ['quotations', 'revisions', 'items', 'assets', 'documents', 'catalog', 'productSources']
const snapshot = () => ({ state: structuredClone(state), objects: new Map([...objects].map(([key, bytes]) => [key, Buffer.from(bytes)])) })
function assertHistory(before) {
  for (const key of immutableKeys) assert.deepEqual(state[key], before.state[key], `Retain saved ${key}`)
  for (const source of before.state.sources) assert.deepEqual(state.sources.find(row => row.id === source.id), source, 'Original source row is immutable')
  for (const [key, bytes] of before.objects) assert.deepEqual(objects.get(key), bytes, 'All pre-existing objects keep exact bytes')
  for (const setting of before.state.settings) assert.deepEqual(state.settings.find(row => row.key === setting.key), setting, 'Existing product settings remain unchanged')
  assert.deepEqual(state.products.find(row => row.id === otherProductId), before.state.products.find(row => row.id === otherProductId), 'Shared product unchanged')
  for (const image of before.state.images.filter(row => row.id !== imageId)) assert.deepEqual(state.images.find(row => row.id === image.id), image, 'Unselected image unchanged')
}
function passed(name) { report.cases.push(name); console.log(`PASS: ${name}`) }

for (const kind of ['jpeg', 'png', 'transparent', 'orientation', 'grayscale']) {
  reset(fixtures[kind]); const before = snapshot(); const request = input()
  const result = safe(await optimize(request))
  assert.equal(result.success, true, JSON.stringify(result)); assert.equal(result.data.status, 'optimized')
  assert.equal(result.data.originalSourceFileId, sourceId); assert.equal(result.data.beforeBytes, fixtures[kind].bytes.length)
  assert.ok(result.data.afterBytes <= 5 * MiB && result.data.afterBytes <= result.data.beforeBytes * .9)
  assert.notEqual(result.data.sourceFileId, sourceId); assert.ok(new Date(result.data.updatedAt) > initialVersion)
  assertHistory(before)
  const changedImage = state.images.find(row => row.id === imageId); const oldImage = before.state.images.find(row => row.id === imageId)
  for (const key of ['id', 'quotationProductId', 'sortOrder', 'isCustomerVisible', 'createdAt']) assert.deepEqual(changedImage[key], oldImage[key], `Keep image ${key}`)
  assert.deepEqual({ ...state.products[0], updatedAt: initialVersion }, before.state.products[0], 'Only parent version changes')
  const derived = state.sources.find(row => row.id === result.data.sourceFileId); const bytes = objects.get(derived.objectKey); const metadata = await sharp(bytes).metadata()
  assert.equal(hash(bytes), derived.sha256); assert.equal(bytes.length, derived.sizeBytes); assert.equal(derived.securityStatus, 'CLEAN'); assert.equal(derived.salesQuotationId, null)
  assert.equal(derived.contentType, metadata.format === 'jpeg' ? 'image/jpeg' : 'image/png')
  assert.match(derived.displayName, metadata.format === 'jpeg' ? /\.jpe?g$/i : /\.png$/i)
  assert.ok(Math.max(metadata.width, metadata.height) <= 2560)
  if (kind === 'png') assert.equal(derived.contentType, 'image/jpeg')
  if (kind === 'orientation') { assert.ok(metadata.height > metadata.width); assert.ok(!metadata.orientation || metadata.orientation === 1) }
  if (kind === 'transparent') {
    assert.equal(metadata.hasAlpha, true); assert.equal(derived.contentType, 'image/png')
    const { data } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); assert.equal(data[3], 0)
    assert.ok(data.some((value, index) => index % 4 === 3 && value > 0 && value < 255))
  }
  assert.ok(state.settings.some(row => row.key === pinPrefix + sourceId), 'Pin root original atomically')
  assert.ok(state.settings.some(row => row.key === derivedPrefix + derived.id), 'Durable lineage marker')
  assert.ok(state.settings.some(row => row.key === operationPrefix + request.requestId), 'Durable replay result')
  assert.equal(state.audits.length, 1); assert.equal(state.audits[0].action, 'UPDATE'); assert.equal(JSON.stringify(state.audits).includes('objectKey'), false); assert.equal(JSON.stringify(state.audits).includes('PRIVATE_SECRET'), false)
  assert.ok(control.locks > 0, 'Transaction has request advisory lock')
  assert.ok(control.dbCalls.filter(call => ['create', 'update', 'updateMany', 'upsert'].includes(call.method)).every(call => call.transaction), 'All replacement/lineage/audit writes atomic')
  await writeFile(resolve(output, `after-${kind}.${metadata.format === 'jpeg' ? 'jpg' : 'png'}`), bytes)
  report.compression.push({ kind, beforeBytes: result.data.beforeBytes, afterBytes: result.data.afterBytes, width: metadata.width, height: metadata.height, originalSha256: before.state.sources[0].sha256, retainedOriginalSha256: hash(objects.get(originalKey)) })

  const after = snapshot(); const writes = control.storageCalls.filter(call => call.method === 'put').length; const sourceCount = state.sources.length
  const replay = safe(await optimize(request)); assert.deepEqual(replay, result, 'Replay bypasses stale input timestamp'); assert.equal(state.sources.length, sourceCount)
  assert.equal(control.storageCalls.filter(call => call.method === 'put').length, writes); assert.deepEqual(state, after.state)
  const conflict = safe(await optimize({ ...request, imageId: secondImageId })); assert.equal(conflict.success, false); assert.deepEqual(state, after.state)
  assert.equal(control.storageCalls.filter(call => call.method === 'put').length, writes)

  const repeat = safe(await optimize(input({ sourceFileId: derived.id, expectedUpdatedAt: result.data.updatedAt })))
  assert.equal(repeat.success, true); assert.equal(repeat.data.sourceFileId, derived.id); assert.equal(repeat.data.originalSourceFileId, sourceId)
  assert.equal(control.storageCalls.filter(call => call.method === 'put').length, writes, 'No repeated lossy optimization')
  assertHistory(before)
  const scanned = safe(await scan({})); assert.equal(scanned.success, true)
  const scannedImage = scanned.data.products.flatMap(product => product.images).find(image => image.id === imageId)
  assert.equal(scannedImage.status, 'optimized'); assert.equal(scannedImage.originalSourceFileId, sourceId)
  passed(`${kind}: replace selected metadata only; immutable original/history; replay/conflict/lineage/no re-compress`)
}

// Small and already efficient images keep their original source and never write storage.
for (const kind of ['small', 'unchanged']) {
  reset(fixtures[kind]); const before = snapshot(); const request = input()
  const result = safe(await optimize(request)); assert.equal(result.success, true, JSON.stringify(result)); assert.equal(result.data.status, 'unchanged')
  assert.equal(result.data.sourceFileId, sourceId); assert.equal(result.data.beforeBytes, result.data.afterBytes)
  assert.deepEqual(state.images, before.state.images); assert.deepEqual(state.products, before.state.products); assertHistory(before)
  assert.equal(control.storageCalls.some(call => call.method === 'put'), false)
  if (kind === 'unchanged') assert.ok(state.settings.some(row => row.key === checkedPrefix + sourceId), 'No-benefit check marker prevents repeat work')
  const afterStorage = control.storageCalls.length
  const repeated = safe(await optimize(input())); assert.equal(repeated.success, true); assert.equal(repeated.data.sourceFileId, sourceId)
  assert.equal(control.storageCalls.length, afterStorage)
  const scanned = safe(await scan({})); const image = scanned.data.products.flatMap(product => product.images).find(image => image.id === imageId)
  assert.equal(image.status, kind === 'small' ? 'small' : 'unchanged')
  passed(`${kind}: original bytes and parent retained; no extra object/re-compression`)
}

// Retention still refuses root originals after every ordinary reference is absent.
reset(); assert.equal((await optimize(input())).success, true)
state.images = state.images.filter(row => row.sourceFileId !== sourceId); state.assets = []; state.productSources = []
const retainedOriginal = structuredClone(state.sources.find(row => row.id === sourceId)); const retainedBytes = Buffer.from(objects.get(originalKey))
const storageBeforeRetention = control.storageCalls.length
assert.equal(await retain(sourceId), false)
assert.deepEqual(state.sources.find(row => row.id === sourceId), retainedOriginal); assert.deepEqual(objects.get(originalKey), retainedBytes)
state.settings.find(row => row.key === pinPrefix + sourceId).value = { malformed: 'Still a retention pin' }
assert.equal(await retain(sourceId), false)
control.failPinRead = true
await assert.rejects(() => retain(sourceId))
assert.equal(control.storageCalls.length, storageBeforeRetention); assert.deepEqual(objects.get(originalKey), retainedBytes)
passed('Retention pin survives no references, malformed marker, and failed lookup without deleting original')

// Model an optimizer transaction committing a new pin while cleanup waits for the same source row lock.
// This controlled barrier verifies query ordering; it does not substitute for a real PostgreSQL lock test.
reset(); state.images = []; state.assets = []; state.productSources = []
let releaseSourceLock, signalSourceLock
const waitingForSource = new Promise(resolve => { signalSourceLock = resolve })
const sourceLockGate = new Promise(resolve => { releaseSourceLock = resolve })
control.onSourceLock = async () => { signalSourceLock(); await sourceLockGate }
const racingRetention = retain(sourceId)
await waitingForSource
assert.equal(control.dbCalls.length, 1, 'Cleanup attempts source FOR UPDATE before reading any references or pin')
assert.equal(control.dbCalls[0].model, '$lock'); assert.match(control.dbCalls[0].args, /quotation_source_files.*FOR UPDATE/s)
assert.deepEqual(control.dbCalls[0].values, [sourceId], 'Cleanup locks the exact source being checked')
state.settings.push({ id: cuid(9501), key: pinPrefix + sourceId, value: { version: 1, sourceFileId: sourceId, sha256: state.sources[0].sha256 } })
releaseSourceLock()
assert.equal(await racingRetention, false, 'Newly committed retention pin is re-read after the source lock is acquired')
assert.ok(state.sources.some(source => source.id === sourceId)); assert.deepEqual(objects.get(originalKey), fixtures.jpeg.bytes)
assert.equal(control.storageCalls.length, 0); assert.equal(control.dbCalls.some(call => call.method === 'delete'), false)
assert.ok(control.dbCalls.every(call => call.transaction), 'All retention checks happen under the source lock transaction')
const pinReadIndex = control.dbCalls.findIndex(call => call.model === 'setting' && call.method === 'findUnique')
assert.ok(pinReadIndex > 0); assert.equal(control.dbCalls[pinReadIndex].args.where.key, pinPrefix + sourceId)
passed('Retention race barrier: source lock precedes all reads; a concurrently committed new pin prevents deletion')

function addOrphan() {
  const id = cuid(9502), objectKey = 'quotation/orphan/fixture-cleanup.png'
  state.sources.push({ ...structuredClone(state.sources[0]), id, objectKey, displayName: 'orphan.png', originalFilename: 'orphan.png', contentType: 'image/png', sha256: hash(fixtures.small.bytes), sizeBytes: fixtures.small.bytes.length })
  objects.set(objectKey, Buffer.from(fixtures.small.bytes)); return { id, objectKey }
}
reset(); const orphan = addOrphan(); const orphanBefore = snapshot()
assert.equal(await retain(orphan.id), true)
assert.equal(state.sources.some(source => source.id === orphan.id), false); assert.equal(objects.has(orphan.objectKey), false)
assert.deepEqual(state.sources.find(source => source.id === sourceId), orphanBefore.state.sources[0]); assert.deepEqual(objects.get(originalKey), orphanBefore.objects.get(originalKey))
assert.equal(control.dbCalls[0].model, '$lock'); assert.deepEqual(control.dbCalls[0].values, [orphan.id])
assert.ok(control.dbCalls.every(call => call.transaction)); assert.equal(control.dbCalls.at(-1).method, 'delete')
assert.deepEqual(control.storageCalls, [{ method: 'delete', key: orphan.objectKey }])
passed('Unpinned orphan cleanup: locked checks and source deletion are atomic; object deletion follows commit')

reset(); const rollbackOrphan = addOrphan(); const rollbackBefore = snapshot(); control.transactionFailure = 'rollback'
await assert.rejects(() => retain(rollbackOrphan.id))
assert.deepEqual(state, rollbackBefore.state); assert.deepEqual([...objects], [...rollbackBefore.objects]); assert.equal(control.storageCalls.length, 0)
passed('Retention transaction rollback keeps source/object and never begins storage deletion')

// Scan metadata only, every page and every status, independent of product-list filters.
reset()
const imageTemplate = structuredClone(state.images[0]); const sourceTemplate = structuredClone(state.sources[0])
state.products = Array.from({ length: 113 }, (_, index) => ({ id: cuid(1000 + index), nameEn: `Product ${index}`, nameZh: null, internalNumber: `P-${index}`, status: ['ACTIVE', 'INACTIVE', 'DRAFT'][index % 3], updatedAt: new Date(initialVersion) }))
state.images = state.products.map((product, index) => ({ ...imageTemplate, id: cuid(2000 + index), quotationProductId: product.id }))
state.sources = [sourceTemplate]
const scanBefore = snapshot(); const all = []; let cursor
do { const result = safe(await scan(cursor ? { cursor } : {})); assert.equal(result.success, true); assert.ok(result.data.products.length <= 50); all.push(...result.data.products); cursor = result.data.nextCursor } while (cursor)
assert.deepEqual(all.map(product => product.id), state.products.map(product => product.id)); assert.equal(new Set(all.map(product => product.id)).size, 113)
assert.equal(control.storageCalls.length, 0); assert.deepEqual(state, scanBefore.state)
assert.equal(control.dbCalls.some(call => ['create', 'update', 'upsert', 'delete'].some(verb => call.method.startsWith(verb))), false)
reset(); const orderScan = safe(await scan({})); assert.deepEqual(orderScan.data.products.find(product => product.id === productId).images.map(image => image.id), [secondImageId, imageId]); assert.equal(control.storageCalls.length, 0)
reset(); state.images = []; const empty = safe(await scan({})); assert.deepEqual(empty.data, { products: [], nextCursor: null })
passed('Metadata scan: 113 products across 3 pages, all statuses, sorted images, empty result, no storage/writes')

for (const flag of ['enabled', 'admin']) {
  reset(); control[flag] = false; const before = snapshot()
  assert.equal(safe(await scan({})).success, false); assert.equal(safe(await optimize(input())).success, false)
  assert.equal(control.dbCalls.length, 0); assert.equal(control.storageCalls.length, 0); assert.deepEqual(state, before.state)
  passed(`${flag}: auth/feature precedes all reads and mutations`)
}
for (const bad of [{}, input({ imageId: 'invalid' }), input({ sourceFileId: 'bad' }), input({ expectedUpdatedAt: 'bad' }), { ...input(), objectKey: 'PRIVATE_SECRET guessed key' }]) {
  reset(); const before = snapshot(); const result = safe(await optimize(bad)); assert.equal(result.success, false); assert.equal(result.code, 'VALIDATION_FAILED'); assert.equal(control.storageCalls.length, 0); assert.deepEqual(state, before.state)
}
passed('Strict action input rejects invalid IDs/time and forged object metadata before storage')

for (const [name, setup, request] of [
  ['stale product version', () => { state.products[0].updatedAt = new Date(initialVersion.getTime() + 1) }],
  ['cross-product target image', () => {}, () => input({ imageId: otherImageId })],
  ['target source mismatch', () => {}, () => input({ sourceFileId: '22222222-2222-4222-8222-222222222222' })],
  ['missing source', () => { state.sources = [] }],
  ['foreign provider', () => { state.sources[0].storageProvider = 'foreign-private' }],
  ['unclean source', () => { state.sources[0].securityStatus = 'QUARANTINED' }],
  ['deleted source', () => { state.sources[0].deletedAt = new Date() }],
  ['quote-owned source', () => { state.sources[0].salesQuotationId = cuid(999) }],
  ['unsupported content type', () => { state.sources[0].contentType = 'image/webp'; state.images.filter(image => image.sourceFileId === sourceId).forEach(image => { image.contentType = 'image/webp' }) }],
  ['oversized source metadata', () => { state.sources[0].sizeBytes = 12 * MiB + 1; state.images.filter(image => image.sourceFileId === sourceId).forEach(image => { image.sizeBytes = 12 * MiB + 1 }) }],
  ['image/source hash mismatch', () => { state.images[0].sha256 = 'f'.repeat(64) }],
  ['image/source size mismatch', () => { state.images[0].sizeBytes-- }],
  ['image/source object mismatch', () => { state.images[0].objectKey = 'quotation/PRIVATE_SECRET_wrong-key.png' }],
  ['invalid derived marker', () => { state.settings.push({ key: derivedPrefix + sourceId, value: { invalid: true } }) }],
  ['invalid checked marker', () => { state.settings.push({ key: checkedPrefix + sourceId, value: { invalid: true } }) }],
]) {
  reset(); setup(); const before = snapshot(); const result = safe(await optimize(request ? request() : input()))
  assert.equal(result.success, false, `${name}: ${JSON.stringify(result)}`); assert.deepEqual(state, before.state)
  assert.equal(control.storageCalls.some(call => call.method === 'put'), false); assert.deepEqual([...objects], [...before.objects])
  passed(`${name}: rejected with original/history intact`)
}

for (const [name, setup] of [
  ['actual byte size mismatch', () => { const bytes = fixtures.jpeg.bytes.subarray(0, -16); control.getOverride = { bytes, contentType: 'image/jpeg', sizeBytes: bytes.length, sha256: hash(bytes) } }],
  ['actual SHA mismatch', () => { const bytes = Buffer.from(fixtures.jpeg.bytes); bytes[bytes.length - 10] ^= 1; control.getOverride = { bytes, contentType: 'image/jpeg', sizeBytes: bytes.length, sha256: hash(bytes) } }],
  ['actual MIME mismatch', () => { const fixture = fixtures.png; objects.set(originalKey, fixture.bytes); Object.assign(state.sources[0], { sizeBytes: fixture.bytes.length, sha256: hash(fixture.bytes) }); state.images.forEach(image => Object.assign(image, { sizeBytes: fixture.bytes.length, sha256: hash(fixture.bytes) })) }],
  ['undecodable bytes', () => { const bytes = Buffer.alloc(600 * 1024); Buffer.from([255,216,255,224]).copy(bytes); objects.set(originalKey, bytes); Object.assign(state.sources[0], { sizeBytes: bytes.length, sha256: hash(bytes) }); state.images.forEach(image => Object.assign(image, { sizeBytes: bytes.length, sha256: hash(bytes) })) }],
  ['storage read failure', () => { control.getFailure = true }],
  ['storage write failure', () => { control.putFailure = true }],
]) {
  reset(); setup(); const before = snapshot(); const result = safe(await optimize(input()))
  assert.equal(result.success, false, name); assert.deepEqual(state, before.state); assert.deepEqual([...objects], [...before.objects])
  passed(`${name}: rejected without reference mutation or leaked internal values`)
}

for (const [name, mutation] of [
  ['version changes during processing', () => { state.products[0].updatedAt = new Date(initialVersion.getTime() + 2000) }],
  ['target source changes during processing', () => { state.images[0].sourceFileId = null }],
  ['source status changes during processing', () => { state.sources[0].securityStatus = 'QUARANTINED' }],
  ['source metadata changes during processing', () => { state.sources[0].sha256 = 'f'.repeat(64) }],
  ['target visibility changes during processing', () => { state.images[0].isCustomerVisible = !state.images[0].isCustomerVisible }],
]) {
  reset(); let afterRace
  control.onPut = () => { mutation(); afterRace = structuredClone(state) }
  const oldBytes = Buffer.from(objects.get(originalKey)); const result = safe(await optimize(input()))
  assert.equal(result.success, false, name); assert.deepEqual(state, afterRace); assert.deepEqual(objects.get(originalKey), oldBytes)
  assert.equal(objects.size, 2, 'Only fresh uncommitted object cleaned'); assert.equal(control.storageCalls.filter(call => call.method === 'delete').length, 1)
  passed(`${name}: transactional snapshot re-check preserves concurrent change and cleans fresh object`)
}

for (const [name, setup] of [
  ['source create failure', () => { control.failCreate = true }],
  ['marker failure', () => { control.failSetting = true }],
  ['audit failure', () => { control.failAudit = true }],
  ['transaction rollback', () => { control.transactionFailure = 'rollback' }],
]) {
  reset(); setup(); const before = snapshot(); const result = safe(await optimize(input()))
  assert.equal(result.success, false); assert.deepEqual(state, before.state, `${name}: DB writes fully roll back`)
  assert.deepEqual([...objects], [...before.objects], `${name}: only uncommitted fresh object deleted`)
  assert.equal(control.storageCalls.filter(call => call.method === 'delete').length, 1)
  passed(`${name}: DB atomicity and fresh-object cleanup`)
}

reset(); control.transactionFailure = 'committed'; const beforeCommit = snapshot(); const committedRequest = input()
const committed = safe(await optimize(committedRequest))
assert.equal(committed.success, true, 'Lost commit acknowledgement reconciles completed operation')
assert.equal(state.sources.length, 2); assert.ok(objects.has(state.sources.find(source => source.id === committed.data.sourceFileId).objectKey))
assert.equal(control.storageCalls.some(call => call.method === 'delete'), false); assertHistory(beforeCommit)
control.transactionFailure = ''; assert.deepEqual(safe(await optimize(committedRequest)), committed)
passed('Lost commit acknowledgement reconciles replay and preserves committed object')

reset(); control.transactionFailure = 'unknown'; const beforeUnknown = snapshot(); const uncertain = safe(await optimize(input()))
assert.equal(uncertain.success, false); assert.equal(uncertain.code, 'INTERNAL_ERROR')
assert.equal(control.storageCalls.some(call => call.method === 'delete'), false, 'Unknown outcome must never delete possibly committed object')
assert.equal(state.sources.length, 2); assert.equal(objects.size, 3); assertHistory(beforeUnknown)
passed('Unresolvable commit ambiguity returns safe failure and retains possibly committed object')

reset(); const beforeShared = snapshot(); const first = safe(await optimize(input())); assert.equal(first.success, true)
const second = safe(await optimize(input({ productId: otherProductId, imageId: otherImageId }))); assert.equal(second.success, true)
assert.notEqual(first.data.sourceFileId, second.data.sourceFileId)
assert.equal(state.images.find(image => image.id === imageId).sourceFileId, first.data.sourceFileId)
assert.equal(state.images.find(image => image.id === secondImageId).sourceFileId, sourceId)
for (const key of immutableKeys) assert.deepEqual(state[key], beforeShared.state[key])
assert.deepEqual(state.sources.find(source => source.id === sourceId), beforeShared.state.sources[0]); assert.deepEqual(objects.get(originalKey), beforeShared.objects.get(originalKey))
passed('Two products sharing an original optimize independently while other images and saved quotes retain old source')

reset(); const cuidSource = cuid(8765); state.sources[0].id = cuidSource
state.images.forEach(image => { image.sourceFileId = cuidSource }); state.assets.forEach(asset => { asset.sourceFileId = cuidSource })
const cuidOptimized = safe(await optimize(input({ sourceFileId: cuidSource })))
assert.equal(cuidOptimized.success, true); assert.equal(cuidOptimized.data.originalSourceFileId, cuidSource)
assert.ok(state.settings.some(setting => setting.key === pinPrefix + cuidSource))
passed('Historical CUID source optimizes with exact original lineage and retention pin')

for (const id of [sourceId, cuid(9876)]) {
  reset(); control.requireBoundedRead = false; state.sources[0].id = id
  const response = await imageGET(new Request(`http://fixture.invalid/api/admin/quotation-images/${id}?kind=source`), { params: Promise.resolve({ id }) })
  assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), fixtures.jpeg.bytes)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(response.headers.get('content-type'), 'image/jpeg')
  assert.match(response.headers.get('content-disposition'), /^inline;.*product\.jpg/)
}
reset(); control.requireBoundedRead = false; state.sources[0].displayName = '../../unsafe\r\nX-Evil: injected "name".jpg'
const filenameResponse = await imageGET(new Request(`http://fixture.invalid/api/admin/quotation-images/${sourceId}?kind=source`), { params: Promise.resolve({ id: sourceId }) })
assert.equal(filenameResponse.status, 200); assert.deepEqual(Buffer.from(await filenameResponse.arrayBuffer()), fixtures.jpeg.bytes)
assert.match(filenameResponse.headers.get('content-disposition'), /^inline;/); assert.equal(/[\r\n]/.test(filenameResponse.headers.get('content-disposition')), false)
assert.equal(filenameResponse.headers.has('x-evil'), false)
for (const [id, kind] of [['invalid-id', 'source'], [sourceId, 'asset']]) {
  reset(); const response = await imageGET(new Request(`http://fixture.invalid/api/admin/quotation-images/${id}?kind=${kind}`), { params: Promise.resolve({ id }) })
  assert.equal(response.status, 400); assert.equal(safe(await response.json()).success, false); assert.equal(control.dbCalls.length, 0); assert.equal(control.storageCalls.length, 0)
}
for (const guard of ['admin', 'enabled']) {
  reset(); control[guard] = false
  const response = await imageGET(new Request(`http://fixture.invalid/api/admin/quotation-images/${sourceId}?kind=source`), { params: Promise.resolve({ id: sourceId }) })
  assert.equal(response.status, 400); assert.equal(safe(await response.json()).success, false); assert.equal(control.dbCalls.length, 0); assert.equal(control.storageCalls.length, 0)
}
passed('Private image GET serves exact UUID/CUID original bytes; rejects invalid/UUID-asset IDs; auth and feature precede reads')

reset()
const hugePng = await sharp({ create: { width: 8001, height: 5000, channels: 3, background: '#0f766e' } }).png().toBuffer()
const hugeBytes = Buffer.concat([hugePng, Buffer.alloc(Math.max(0, 600 * 1024 - hugePng.length))])
Object.assign(state.sources[0], { displayName: 'over-pixels.png', originalFilename: 'over-pixels.png', contentType: 'image/png', sizeBytes: hugeBytes.length, sha256: hash(hugeBytes) })
state.images.forEach(image => Object.assign(image, { displayName: 'over-pixels.png', contentType: 'image/png', sizeBytes: hugeBytes.length, sha256: hash(hugeBytes) }))
objects.set(originalKey, hugeBytes)
const beforePixels = snapshot(); const tooManyPixels = safe(await optimize(input()))
assert.equal(tooManyPixels.success, false); assert.deepEqual(state, beforePixels.state); assert.equal(control.storageCalls.some(call => call.method === 'put'), false)
passed('Actual >40-million-pixel PNG is rejected by Sharp before any replacement or storage write')

// Exercise the actual storage adapters against only a local fixture directory and an in-memory S3 transport.
const s3 = { mode: 'exact', signals: [], sends: 0, cancelled: 0, released: 0, legacyReads: 0 }
const sdkSource = `
export class S3Client{constructor(config){this.config=config}send(command,options){return require('bounded-storage-fixture').send(command,options)}}
${['DeleteObjectCommand', 'DeleteObjectsCommand', 'GetObjectCommand', 'ListObjectsV2Command', 'PutObjectCommand'].map(name => `export class ${name}{constructor(input){this.input=input}}`).join('\n')}
`
const adapterBuild = await build({
  stdin: { contents: 'export {getQuotationPrivateStorage} from "./src/lib/quotation/private-storage"', loader: 'ts', resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'process.env': '{}' },
  plugins: [{ name: 'bounded-storage-only-fixture', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path }) => path === '@aws-sdk/client-s3' || path === 'next/navigation' ? { path, namespace: 'fixture' } : path === 'bounded-storage-fixture' ? { path, external: true } : undefined)
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: path === '@aws-sdk/client-s3' ? sdkSource : 'export function unstable_rethrow(){}', loader: 'js', resolveDir: process.cwd() }))
  } }],
})
const adapterModule = { exports: {} }
const send = async (_command, options) => {
  s3.sends++; const signal = options?.abortSignal; if (signal) s3.signals.push(signal)
  if (s3.mode === 'timeout-request') return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('Isolated request timeout')), { once: true }))
  let index = 0
  const chunks = s3.mode === 'stream-over' ? [new Uint8Array(6), new Uint8Array(5)] : [new Uint8Array([1, 2, 3, 4]), new Uint8Array([5, 6, 7, 8, 9, 10])]
  return {
    ContentType: 'image/png', ...(s3.mode === 'length-over' ? { ContentLength: 11 } : s3.mode === 'exact' ? { ContentLength: 10 } : {}),
    Body: {
      transformToByteArray: async () => { s3.legacyReads++; return new Uint8Array([1, 2, 3]) },
      transformToWebStream: () => ({ getReader: () => ({
        read: async () => s3.mode === 'timeout-body' ? new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('Isolated stream timeout')), { once: true })) : index < chunks.length ? { done: false, value: chunks[index++] } : { done: true },
        cancel: async () => { s3.cancelled++ },
        releaseLock: () => { s3.released++ },
      }) }),
    },
  }
}
new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', adapterBuild.outputFiles[0].text)(
  name => name === 'bounded-storage-fixture' ? { send } : require(name), adapterModule, adapterModule.exports,
  (callback, delay) => setTimeout(callback, delay === 20_000 ? 10 : delay), clearTimeout,
)
const localStorage = adapterModule.exports.getQuotationPrivateStorage({ NODE_ENV: 'test', QUOTATION_PRIVATE_STORAGE_PROVIDER: 'local', QUOTATION_PRIVATE_LOCAL_ROOT: resolve(output, 'local-adapter-fixture') })
const localKey = `quotation/${randomUUID()}/bounded.bin`; const exactBytes = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
await localStorage.put(localKey, exactBytes, 'image/png')
const exactLocal = await localStorage.get(localKey, 'image/png', { maxBytes: 10 }); assert.deepEqual(exactLocal.bytes, exactBytes); assert.equal(exactLocal.sha256, hash(exactBytes))
await assert.rejects(() => localStorage.get(localKey, 'image/png', { maxBytes: 9 }), error => error.code === 'FILE_TOO_LARGE')
assert.deepEqual((await localStorage.get(localKey, 'image/png')).bytes, exactBytes, 'Legacy unbounded adapter contract unchanged')
await assert.rejects(() => localStorage.get(localKey, 'image/png', { maxBytes: 0 }), error => error.code === 'VALIDATION_FAILED')
await localStorage.delete(localKey)
passed('Real local adapter: exact bound succeeds, overflow/invalid bounds reject, legacy reads unchanged')
const r2Storage = adapterModule.exports.getQuotationPrivateStorage({ QUOTATION_PRIVATE_STORAGE_PROVIDER: 'r2-private', QUOTATION_PRIVATE_R2_ENDPOINT: 'https://fixture.invalid', QUOTATION_PRIVATE_R2_ACCESS_KEY_ID: 'dummy', QUOTATION_PRIVATE_R2_SECRET_ACCESS_KEY: 'dummy', QUOTATION_PRIVATE_R2_BUCKET: 'fixture' })
assert.deepEqual((await r2Storage.get('quotation/fake.png', 'image/png', { maxBytes: 10 })).bytes, exactBytes); assert.equal(s3.released, 1)
for (const mode of ['length-over', 'stream-over', 'timeout-request', 'timeout-body']) {
  s3.mode = mode; const cancelled = s3.cancelled; const released = s3.released
  await assert.rejects(() => r2Storage.get('quotation/fake.png', 'image/png', { maxBytes: 10 }), error => mode.endsWith('over') ? error.code === 'FILE_TOO_LARGE' : /timeout/.test(error.message))
  assert.equal(s3.signals.at(-1).aborted, true, `${mode}: abort signal fired`)
  if (mode === 'stream-over' || mode === 'timeout-body') { assert.equal(s3.cancelled, cancelled + 1); assert.equal(s3.released, released + 1) }
}
s3.mode = 'exact'; const beforeLegacySignal = s3.signals.length
assert.deepEqual((await r2Storage.get('quotation/fake.png', 'image/png')).bytes, Buffer.from([1, 2, 3])); assert.equal(s3.legacyReads, 1); assert.equal(s3.signals.length, beforeLegacySignal)
passed('Mock S3 transport + real R2 adapter: exact stream bound, ContentLength/chunk overflow, request/body timeouts, cancel/release, legacy reads')

await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report.compression, null, 2))
console.log(`PASS: ${report.cases.length} backend case groups; real Sharp, exact retained originals/history, isolated DB/storage and local adapter fixture.`)
