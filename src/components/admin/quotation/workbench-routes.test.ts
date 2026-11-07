import assert from 'node:assert/strict'
import test from 'node:test'
import { getWorkbenchDestination, WORKBENCH_DESTINATIONS } from './workbench-routes'

test('each workbench page and its descendants retain the same navigation destination', () => {
  for (const destination of WORKBENCH_DESTINATIONS) {
    assert.equal(getWorkbenchDestination(destination.href), destination.href)
    assert.equal(getWorkbenchDestination(`${destination.href}/new`), destination.href)
    assert.equal(getWorkbenchDestination(`${destination.href}/existing-id`), destination.href)
  }
})

test('legacy workbench entry highlights the quotation list during its redirect', () => {
  assert.equal(getWorkbenchDestination('/admin/quotation-workbench'), '/admin/sales-quotations')
})

test('other admin paths and overlapping names never show workbench navigation', () => {
  for (const pathname of [null, '/', '/admin', '/admin/quotes', '/admin/customers', '/admin/products', '/admin/sales-quotations-old', '/admin/quotation-products-extra', '/admin/quotation-workbench-extra']) {
    assert.equal(getWorkbenchDestination(pathname), null)
  }
})
