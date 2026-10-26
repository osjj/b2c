// Run with ego-browser nodejs after starting:
// node scripts/case-editor-upload-fixture.mjs --publication --port=8771
// Uses the real CaseForm with local, controllable action doubles. No live writes.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const task = await taskSpace('simple case publication 20261026')
const page = task.page('p1')
console.log({ taskSpaceId: task.spaceId, page: page.label })
await page.goto(`http://127.0.0.1:8771/?run=${Date.now().toString(36)}`)
await page.waitForSelector('#case-title', { state: 'visible' })
console.log((await page.snapshot()).slice(0, 1800))
const initial = await page.evaluate(() => ({
  original: window.__initialCase,
  status: document.querySelector('#case-status').value,
  approvalControl: Boolean(document.querySelector('#case-publicationApproved')),
  dialogs: document.querySelectorAll('[role="alertdialog"]').length,
  buttons: [...document.querySelectorAll('button')].map((button) => ({ text: button.textContent, type: button.type })),
}))
assert.equal(initial.status, 'DRAFT', 'Start a fresh publication fixture before this regression')
assert.equal(initial.original.gallery.length, 3)
assert.equal(initial.original.coverImage, initial.original.gallery[0].url)
assert.equal(initial.approvalControl, false, 'Publishing has no separate editorial approval control')
assert.equal(initial.dialogs, 0)

// Saving a private-image draft must never prepare public copies.
await page.click('button[type="submit"] >> nth=0', { label: 'save isolated private draft' })
await page.waitForFunction(() => window.__caseSaves === 1, undefined, { timeout: 10000 })
assert.equal(await page.evaluate(() => window.__casePreparationCalls?.length || 0), 0)

await page.fill('#case-summary', 'Preserved unsaved publication edit')
const paddedCover = `  ${initial.original.coverImage}  `
const paddedGallery = `  ${initial.original.gallery[1].url}  `
await page.fill('#case-coverImage', paddedCover)
await page.fill('[name="gallery.1.url"]', paddedGallery)
await page.selectOption('#case-status', 'PUBLISHED')
assert.equal(await page.evaluate(() => window.__casePreparationCalls?.length || 0), 0, 'Selecting Published alone does not submit')
await page.evaluate(() => {
  window.__casePreparationMode = 'hold'
  window.__casePreparationFailure = window.__initialCase.gallery[1].url
})

async function submitPublication() {
  await page.click('button[type="submit"] >> nth=0', { label: 'publish isolated case directly' })
}

async function heldImage(expectedCalls, expectedProgress) {
  await page.waitForFunction((count) => window.__casePreparationCalls?.length === count && typeof window.__releaseCasePreparation === 'function', expectedCalls, { timeout: 10000 })
  const locked = await page.evaluate(() => ({
    title: document.querySelector('#case-title').matches(':disabled'),
    status: document.querySelector('#case-status').matches(':disabled'),
    upload: document.querySelector('#case-cover-upload').matches(':disabled'),
    saves: [...document.querySelectorAll('button[type="submit"]')].every((button) => button.disabled),
    rows: [...document.querySelectorAll('button[aria-label^="Remove Image"], button[aria-label^="Move Image"]')].every((button) => button.matches(':disabled')),
    progress: [...document.querySelectorAll('[role="status"]')].map((node) => node.textContent).join(' '),
    dialogs: document.querySelectorAll('[role="alertdialog"]').length,
  }))
  assert.ok(locked.title && locked.status && locked.upload && locked.saves && locked.rows, 'Editing, uploads and structural controls remain locked throughout preparation')
  assert.ok(locked.progress.includes(expectedProgress), locked.progress)
  assert.equal(locked.dialogs, 0, 'One submission starts preparation without a confirmation dialog')
}

await submitPublication()
await heldImage(1, 'Preparing image 1 of 3')
await page.evaluate(() => document.querySelector('form').requestSubmit())
assert.equal(await page.evaluate(() => window.__casePreparationCalls.length), 1, 'Duplicate submission is synchronously blocked')
await page.evaluate(() => window.__releaseCasePreparation())
await heldImage(2, 'Preparing image 2 of 3')
await page.evaluate(() => window.__releaseCasePreparation())
await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('Image 2 of 3 could not be prepared.'), undefined, { timeout: 10000 })
const failed = await page.evaluate(() => ({
  attempts: window.__caseSaveAttempts,
  saves: window.__caseSaves,
  summary: document.querySelector('#case-summary').value,
  cover: document.querySelector('#case-coverImage').value,
  gallery: [...document.querySelectorAll('input[name^="gallery."][name$=".url"]')].map((input) => input.value),
  editable: !document.querySelector('#case-title').matches(':disabled'),
  text: document.querySelector('[role="alert"]').textContent,
}))
assert.equal(failed.attempts, 1, 'Failed preparation never reaches the publication save')
assert.equal(failed.saves, 1)
assert.equal(failed.summary, 'Preserved unsaved publication edit')
assert.equal(failed.cover, paddedCover)
assert.deepEqual(failed.gallery, initial.original.gallery.map((image, index) => index === 1 ? paddedGallery : image.url))
assert.ok(failed.editable)
assert.match(failed.text, /Your edits are still here/)

// Retry starts with the original candidate; the media helper can reuse copies.
await submitPublication()
for (let index = 0; index < 3; index++) {
  await heldImage(index + 3, `Preparing image ${index + 1} of 3`)
  await page.evaluate(() => window.__releaseCasePreparation())
}
await page.waitForFunction(() => (window.__caseSaves === 2 && document.body.innerText.includes('Case saved as published.')) || Boolean(document.querySelector('[role="alert"]')), undefined, { timeout: 10000 })
const outcome = await page.evaluate(() => ({ saves: window.__caseSaves, error: document.querySelector('[role="alert"]')?.textContent, saveAttempts: window.__caseSaveAttempts }))
assert.equal(outcome.saves, 2, `Publication result: ${JSON.stringify(outcome)}`)
const published = await page.evaluate(() => ({
  saved: window.__savedCase,
  calls: window.__casePreparationCalls,
  copies: window.__casePublicCopies,
  expectedVersion: window.__saveVersion,
  cover: document.querySelector('#case-coverImage').value,
  gallery: [...document.querySelectorAll('input[name^="gallery."][name$=".url"]')].map((input) => input.value),
  dirty: document.body.innerText.includes('Unsaved edits'),
}))
assert.equal(published.saved.status, 'PUBLISHED')
assert.equal(published.saved.publicationApproved, true)
assert.equal(published.saved.summary, 'Preserved unsaved publication edit')
assert.equal(published.expectedVersion, 2)
assert.equal(published.calls.length, 5, 'Cover and gallery duplicates prepare once per attempt')
assert.equal(published.copies.length, 3, 'Retry reuses the first verified copy')
assert.deepEqual(published.calls.slice(-3).map((call) => call.sourceUrl), initial.original.gallery.map((image) => image.url))
assert.ok(published.calls.every((call) => call.input.coverImage === paddedCover), 'Each action receives the unchanged candidate; source URLs are normalized separately')
for (const [index, image] of published.saved.gallery.entries()) {
  const { url: originalUrl, ...metadata } = initial.original.gallery[index]
  const { url, ...savedMetadata } = image
  assert.deepEqual(savedMetadata, metadata)
  assert.equal(url, `https://shop.laifappe.com/cases/${initial.original.id}/${originalUrl.split('/').at(-1)}`)
}
assert.deepEqual(published.saved.sections, initial.original.sections)
assert.deepEqual(published.saved.procurement, initial.original.procurement)
assert.equal(published.saved.coverImage, published.saved.gallery[0].url)
assert.equal(published.cover, published.saved.coverImage)
assert.deepEqual(published.gallery, published.saved.gallery.map((image) => image.url))
assert.equal(published.dirty, false, 'Successful save resets to prepared public URLs')

await page.reload()
await page.waitForFunction(() => document.querySelector('#case-status')?.value === 'PUBLISHED', undefined, { timeout: 10000 })
const reopened = await page.evaluate(() => ({
  cover: document.querySelector('#case-coverImage').value,
  summary: document.querySelector('#case-summary').value,
  dirty: document.body.innerText.includes('Unsaved edits'),
}))
assert.equal(reopened.cover, published.saved.coverImage)
assert.equal(reopened.summary, published.saved.summary)
assert.equal(reopened.dirty, false)

// Published cases remain directly editable without another review or image preparation.
await page.fill('#case-summary', 'Edited after publication')
await submitPublication()
await page.waitForFunction(() => window.__caseSaves === 1 && document.body.innerText.includes('Case saved as published.'), undefined, { timeout: 10000 })
const updated = await page.evaluate(() => ({
  summary: window.__savedCase.summary,
  expectedVersion: window.__saveVersion,
  preparations: window.__casePreparationCalls?.length || 0,
  dialogs: document.querySelectorAll('[role="alertdialog"]').length,
}))
assert.equal(updated.summary, 'Edited after publication')
assert.equal(updated.expectedVersion, 3)
assert.equal(updated.preparations, 0)
assert.equal(updated.dialogs, 0)

// A new case can publish on its first save; optional content may be reviewed later.
await page.goto(`http://127.0.0.1:8771/?new=1&run=${Date.now().toString(36)}`)
await page.waitForSelector('#case-title', { state: 'visible' })
console.log((await page.snapshot()).slice(0, 700))
const newCase = await page.evaluate(() => ({
  title: document.querySelector('#case-title').value,
  publishedDisabled: document.querySelector('#case-status option[value="PUBLISHED"]').disabled,
  approvalControl: Boolean(document.querySelector('#case-publicationApproved')),
  uploadApprovals: document.querySelectorAll('[id$="-permission"]').length,
  coverUploadEnabled: !document.querySelector('#case-cover-upload').disabled,
}))
assert.equal(newCase.title, '')
assert.equal(newCase.publishedDisabled, false)
assert.equal(newCase.approvalControl, false)
assert.equal(newCase.uploadApprovals, 0, 'Uploads have no permission-checkbox step')
assert.equal(newCase.coverUploadEnabled, true, 'The new-case cover file input is ready immediately')
await page.fill('#case-title', 'Publish before review')
await page.fill('#case-slug', 'publish-before-review')

// Exercise the actual uploader with a local file and a local-only fake response.
const uploadDirectory = new URL('../output/simple-case-publishing-qa/', import.meta.url)
await mkdir(uploadDirectory, { recursive: true })
const coverFile = new URL('cover.png', uploadDirectory)
await writeFile(coverFile, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY1sAAAAASUVORK5CYII=', 'base64'))
await page.evaluate(() => {
  if (location.origin !== 'http://127.0.0.1:8771') throw new Error('Upload fixture origin required')
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href)
    if (url.origin === location.origin && url.pathname === '/api/upload') {
      window.__caseUploadCalls = (window.__caseUploadCalls || 0) + 1
      window.__caseUploadFileName = options?.body?.get('file')?.name
      return new Response(JSON.stringify({ url: 'https://shop.laifappe.com/cases/fixture-uploaded-cover.png' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return originalFetch(input, options)
  }
})
await page.setInputFiles('#case-cover-upload', [fileURLToPath(coverFile)])
console.log(await page.evaluate(() => ({ uploadButton: [...document.querySelectorAll('button')].find(button => button.textContent === 'Upload cover image')?.textContent })))
await page.click('loc=role:button[name="Upload cover image"]', { label: 'upload local cover without approval' })
await page.waitForFunction(() => document.querySelector('#case-coverImage').value === 'https://shop.laifappe.com/cases/fixture-uploaded-cover.png', undefined, { timeout: 10000 })
const uploadedCover = await page.evaluate(() => ({
  calls: window.__caseUploadCalls,
  fileName: window.__caseUploadFileName,
  alt: document.querySelector('#case-coverAlt').value,
  dialogs: document.querySelectorAll('[role="alertdialog"]').length,
}))
assert.equal(uploadedCover.calls, 1)
assert.equal(uploadedCover.fileName, 'cover.png')
assert.equal(uploadedCover.alt, '', 'No description step is needed before publishing')
assert.equal(uploadedCover.dialogs, 0)
await page.selectOption('#case-status', 'PUBLISHED')
await submitPublication()
await page.waitForFunction(() => (window.__caseSaves === 1 && document.body.innerText.includes('Case saved as published.')) || Boolean(document.querySelector('[role="alert"]')), undefined, { timeout: 10000 })
const created = await page.evaluate(() => ({
  saved: window.__savedCase,
  saves: window.__caseSaves,
  error: document.querySelector('[role="alert"]')?.textContent,
  preparations: window.__casePreparationCalls?.length || 0,
  dialogs: document.querySelectorAll('[role="alertdialog"]').length,
  header: document.body.innerText.slice(0, 700),
}))
assert.equal(created.saves, 1, `First-save publication: ${JSON.stringify(created)}`)
assert.equal(created.saved.status, 'PUBLISHED')
assert.equal(created.saved.publicationApproved, true)
assert.equal(created.saved.coverImage, 'https://shop.laifappe.com/cases/fixture-uploaded-cover.png')
assert.equal(created.saved.coverAlt, 'Publish before review — cover image')
assert.equal(created.saved.summary, '')
assert.equal(created.saved.country, '')
assert.equal(created.saved.industry, '')
assert.deepEqual(created.saved.procurement, [])
assert.deepEqual(created.saved.sections, [])
assert.equal(created.preparations, 0)
assert.equal(created.dialogs, 0)
assert.ok(created.header.includes('Version 1'))
// The coordinating QA turn finishes this space after any additional checks.
console.log('PASS: direct one-submit publication without review controls/dialogs, first-save new-case publication, post-publication editing, private-image deduplication/progress/locks, failure preservation/retry, public URL reset/reopen and ordinary draft saving. No live DB/storage writes.')
