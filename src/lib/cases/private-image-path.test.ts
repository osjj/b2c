import assert from 'node:assert/strict'
import test from 'node:test'

import { casePrivateImageUrl, isCasePrivateImage, parseCasePrivateImage } from './private-image-path'

const caseId = 'c123456789012345678901234'
const hash = 'a'.repeat(64)

test('private case image paths are typed exact identifiers', () => {
  const url = casePrivateImageUrl(caseId, hash, 'png')
  assert.equal(isCasePrivateImage(url), true)
  assert.deepEqual(parseCasePrivateImage(url), { caseId, sha256: hash, extension: 'png' })
  assert.equal(casePrivateImageUrl(caseId, hash, 'jpg').endsWith('.jpg'), true)
})

test('private paths reject foreign namespaces, traversal, queries, malformed ids and hashes', () => {
  const url = casePrivateImageUrl(caseId, hash, 'png')
  for (const bad of [`${url}?x=1`, `${url}#x`, `/${url}`, url.replace(caseId, 'bad'), url.replace(hash, 'short'), url.replace('.png', '.jpeg'), url.replace(hash, 'A'.repeat(64)), url.replace(hash, '../x'), url.replace('case-images', 'quotation-images'), `https://www.laifappe.com${url}`, url.replace(caseId, `${caseId}%2fother`)]) {
    assert.equal(parseCasePrivateImage(bad), null, bad)
    assert.equal(isCasePrivateImage(bad), false, bad)
  }
  assert.throws(() => casePrivateImageUrl('../case', hash, 'png'))
  assert.throws(() => casePrivateImageUrl(caseId, '../hash', 'jpg'))
})
