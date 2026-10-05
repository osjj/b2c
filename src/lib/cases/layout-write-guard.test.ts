import assert from 'node:assert/strict'
import test from 'node:test'

import { caseLayoutWriteErrors } from './layout-write-guard'
import type { CaseInput } from './types'

function fixture(): Pick<CaseInput, 'sections' | 'gallery'> {
  return {
    sections: [
      { key: 'buyer-visit', title: 'Buyer visit', body: 'Recorded sample review.' },
      { key: 'packing', title: 'Packing', body: 'Recorded packing progress.' },
    ],
    gallery: [
      { url: '/cases/visit.png', alt: 'Visit', caption: 'Original visit', placement: 'section:buyer-visit' },
      { url: '/cases/packing.png', alt: 'Packing', caption: 'Original packing', placement: 'section:packing' },
    ],
  }
}

test('omitted metadata on retained records is refused without mutating either input', () => {
  const existing = fixture()
  const incoming = {
    sections: existing.sections.map(({ title, body }) => ({ title, body })),
    gallery: existing.gallery.map(({ url, alt, caption }) => ({ url, alt, caption })),
  }
  const snapshots = structuredClone({ existing, incoming })
  assert.deepEqual(Object.keys(caseLayoutWriteErrors(existing, incoming)), [
    'sections.0.key', 'sections.1.key', 'gallery.0.placement', 'gallery.1.placement',
  ])
  assert.deepEqual({ existing, incoming }, snapshots)
})

test('omissions are detected by retained title, body and image URL rather than position', () => {
  const existing = fixture()
  const incoming = {
    sections: [
      { title: 'Packing', body: 'Updated packing text.' },
      { title: 'Renamed visit', body: 'Recorded sample review.' },
    ],
    gallery: [...existing.gallery].reverse().map(({ url, alt, caption }) => ({ url, alt, caption })),
  }
  assert.deepEqual(Object.keys(caseLayoutWriteErrors(existing, incoming)), [
    'sections.0.key', 'sections.1.key', 'gallery.0.placement', 'gallery.1.placement',
  ])
})

test('stable keys support reorder and simultaneous title/body edits', () => {
  const existing = fixture()
  const incoming = {
    sections: [...existing.sections].reverse().map((section) => ({ ...section, title: `Updated ${section.title}`, body: `Updated ${section.body}` })),
    gallery: [...existing.gallery].reverse(),
  }
  assert.deepEqual(caseLayoutWriteErrors(existing, incoming), {})
})

test('explicit blanks, deleted records and new unassigned records remain supported', () => {
  const existing = fixture()
  const incoming = {
    sections: [{ ...existing.sections[0], key: '' }, { title: 'New chapter', body: 'New verified record.' }],
    gallery: [{ ...existing.gallery[0], placement: '' }, { url: '/cases/new.png', alt: 'New photo', caption: 'New record' }],
  }
  assert.deepEqual(caseLayoutWriteErrors(existing, incoming), {})
  assert.deepEqual(caseLayoutWriteErrors(existing, { sections: [], gallery: [] }), {})
})

test('section deletion can explicitly release its retained images', () => {
  const existing = fixture()
  const incoming = {
    sections: [existing.sections[1]],
    gallery: [{ ...existing.gallery[0], placement: '' }, existing.gallery[1]],
  }
  assert.deepEqual(caseLayoutWriteErrors(existing, incoming), {})
})

test('legacy records without metadata remain writable while unreadable records fail closed', () => {
  const legacy = {
    sections: [{ title: 'Legacy chapter', body: 'Recorded text.' }],
    gallery: [{ url: '/cases/legacy.png', alt: 'Legacy photo', caption: 'Original record' }],
  }
  assert.deepEqual(caseLayoutWriteErrors(legacy, legacy), {})
  assert.deepEqual(caseLayoutWriteErrors({ sections: null, gallery: [] }, legacy), {
    _form: ['Existing image layout could not be checked. Reload the case before saving.'],
  })
})
