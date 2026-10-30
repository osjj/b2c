import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { build } from 'esbuild'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Bundle the real case renderer for Node; CSS is not part of these HTML assertions.
const require = createRequire(import.meta.url)
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('./case-detail.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'css-for-node-render', setup(plugin) {
    plugin.onLoad({ filter: /\.module\.css$/ }, () => ({ contents: 'export default {}', loader: 'js' }))
  } }],
})
const compiled = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, compiled, compiled.exports)
const { CaseDetail } = compiled.exports

function renderProse(buyerProfile, sectionBody = '') {
  return renderToStaticMarkup(createElement(CaseDetail, { caseStudy: {
    id: 'test-case', slug: 'source-links', title: 'Source links', summary: '', country: '', industry: '',
    cooperationDate: '', buyerProfile, coverImage: '', coverAlt: '', procurement: [], customization: '',
    sections: sectionBody ? [{ key: 'sources', title: 'Sources', body: sectionBody }] : [],
    timeline: [], gallery: [], relatedLinks: [], featured: false, sortOrder: 0,
    seoTitle: '', seoDescription: '', version: 1, publishedAt: null,
    createdAt: '2026-10-30T00:00:00.000Z', updatedAt: '2026-10-30T00:00:00.000Z',
  } }))
}

const annual = 'https://www.abujaelectricity.com/wp-content/uploads/2025/10/Signed-2024-AEDC-FS.pdf'
const tender = 'https://www.abujaelectricity.com/wp-content/uploads/2020/06/Invitation_to_Bid_PPE_2020.pdf'

test('case buyer background and story render the existing AEDC PDF URLs as safe new-tab anchors', () => {
  const html = renderProse(`Company background — ${annual}`, `Procurement source — ${tender}`)
  for (const url of [annual, tender]) {
    const anchor = [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]).find(tag => tag.includes(`href="${url}"`))
    assert.ok(anchor, `Missing source anchor for ${url}`)
    assert.match(anchor, /\btarget="_blank"/)
    const rel = anchor.match(/\brel="([^"]*)"/)?.[1].split(/\s+/) || []
    assert.ok(rel.includes('noopener'))
    assert.ok(rel.includes('noreferrer'))
    assert.equal(html.split(`href="${url}"`).length - 1, 1)
  }
  assert.equal((html.match(/opens in a new tab/g) || []).length, 2)
})

test('source anchors keep query and fragment values while leaving sentence punctuation outside', () => {
  const html = renderProse('See (https://example.com/report_(2024).pdf?lang=en&view=full#page=4), then http://example.org/source.pdf.')
  assert.ok(html.includes('href="https://example.com/report_(2024).pdf?lang=en&amp;view=full#page=4"'))
  assert.ok(html.includes('href="http://example.org/source.pdf"'))
  assert.ok(html.includes('</a>), then '))
  assert.ok(html.includes('</a>.</p>'))
})

test('ordinary text and paragraph breaks survive without markdown or HTML interpretation', () => {
  const html = renderProse('First paragraph.\n\nSecond paragraph with <script>alert(1)</script> & notes.')
  assert.ok(html.includes('<p>First paragraph.</p><p>Second paragraph with &lt;script&gt;alert(1)&lt;/script&gt; &amp; notes.</p>'))
  assert.equal(html.includes('<script>'), false)
})

test('unsafe schemes, embedded schemes, credentials and malformed destinations remain text', () => {
  const examples = [
    'javascript:alert(1)', 'data:text/html,<svg/onload=alert(1)>',
    'javascript:https://example.com/file.pdf', 'ftp://example.org/file.pdf',
    'https://user:password@example.com/file.pdf', 'https://', 'https://.',
    'https://example.com\\evil.pdf', 'https://example.com/\u0000file.pdf',
  ]
  const html = renderProse(examples.join('\n'))
  assert.equal(/href="(?:https?:|javascript:|data:|ftp:)/.test(html), false)
})
