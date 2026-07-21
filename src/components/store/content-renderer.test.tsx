import assert from 'node:assert/strict'
import test from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import {
  ContentRenderer,
  getImageSpacingClass,
  isJoinableDetailImageBlock,
  type ContentBlock,
} from './content-renderer'

function imageBlock(id: string, overrides: Record<string, unknown> = {}): ContentBlock {
  return {
    id,
    type: 'image',
    data: {
      file: { url: `/details/${id}.webp` },
      caption: '',
      stretched: true,
      withBorder: false,
      withBackground: false,
      ...overrides,
    },
  }
}

test('joins only the internal margins of consecutive plain stretched images', () => {
  const blocks = [imageBlock('one'), imageBlock('two'), imageBlock('three')]

  assert.equal(getImageSpacingClass(blocks[0], undefined, blocks[1], true), 'mt-6 mb-0')
  assert.equal(getImageSpacingClass(blocks[1], blocks[0], blocks[2], true), 'mt-0 mb-0')
  assert.equal(getImageSpacingClass(blocks[2], blocks[1], undefined, true), 'mt-0 mb-6')
})

test('keeps the existing spacing for a single image or when seamless mode is disabled', () => {
  const first = imageBlock('one')
  const second = imageBlock('two')

  assert.equal(getImageSpacingClass(first, undefined, undefined, true), 'my-6')
  assert.equal(getImageSpacingClass(first, undefined, second, false), 'my-6')
})

test('captions, borders, backgrounds, non-stretched images, and invalid URLs break a run', () => {
  const captioned = imageBlock('captioned', { caption: 'Independent image' })
  const bordered = imageBlock('bordered', { withBorder: true })
  const background = imageBlock('background', { withBackground: true })
  const notStretched = imageBlock('not-stretched', { stretched: false })
  const invalid = imageBlock('invalid', { file: { url: 'not-a-valid-url' } })

  for (const block of [captioned, bordered, background, notStretched, invalid]) {
    assert.equal(isJoinableDetailImageBlock(block), false)
  }

  const before = imageBlock('before')
  const after = imageBlock('after')
  assert.equal(getImageSpacingClass(before, undefined, invalid, true), 'my-6')
  assert.equal(getImageSpacingClass(after, invalid, undefined, true), 'my-6')
})

test('treats whitespace and br-only captions as empty', () => {
  assert.equal(isJoinableDetailImageBlock(imageBlock('spaces', { caption: '  <br />  ' })), true)
})

test('a paragraph splits image runs', () => {
  const paragraph: ContentBlock = { id: 'copy', type: 'paragraph', data: { text: 'Details' } }
  const before = imageBlock('before')
  const after = imageBlock('after')

  assert.equal(getImageSpacingClass(before, undefined, paragraph, true), 'my-6')
  assert.equal(getImageSpacingClass(after, paragraph, undefined, true), 'my-6')
})

test('ContentRenderer applies seamless classes only when explicitly enabled', () => {
  const content = { blocks: [imageBlock('one'), imageBlock('two')] }
  const seamlessMarkup = renderToStaticMarkup(
    <ContentRenderer content={content} seamlessDetailImages />
  )
  const defaultMarkup = renderToStaticMarkup(<ContentRenderer content={content} />)

  assert.match(seamlessMarkup, /<figure class="mt-6 mb-0 leading-none w-full "/)
  assert.match(seamlessMarkup, /<figure class="mt-0 mb-6 leading-none w-full "/)
  assert.equal((defaultMarkup.match(/<figure class="my-6 leading-none w-full "/g) ?? []).length, 2)
})
