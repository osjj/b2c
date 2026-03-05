import 'dotenv/config'
import { chromium } from 'playwright'

const URL = 'https://detail.1688.com/offer/936904897668.html'

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'zh-CN',
})

const cookie = process.env.SCRAPER_1688_COOKIE || ''
if (cookie) {
  const cookies = cookie.split(';').map(p => {
    const idx = p.indexOf('=')
    if (idx === -1) return null
    const name = p.slice(0, idx).trim()
    const value = p.slice(idx + 1).trim()
    return name ? { name, value, domain: '.1688.com', path: '/' } : null
  }).filter(Boolean)
  await context.addCookies(cookies)
}

const page = await context.newPage()
page.setDefaultTimeout(5000)

console.log('Loading page...')
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(2000)

console.log('\n=== TITLE CANDIDATES ===')
for (const sel of ['h1', '.title-text', '[class*="title"]', '[class*="offerTitle"]', '[class*="offer-title"]']) {
  const els = page.locator(sel)
  const count = await els.count().catch(() => 0)
  for (let i = 0; i < Math.min(count, 3); i++) {
    const text = await els.nth(i).textContent().catch(() => '')
    const cls = await els.nth(i).getAttribute('class').catch(() => '')
    if (text?.trim()) console.log(`  ${sel}[${i}] class="${cls}" => "${text.trim().slice(0, 80)}"`)
  }
}

console.log('\n=== PRICE CANDIDATES ===')
for (const sel of ['[class*="price"]', '[class*="Price"]', '[class*="ladder"]', '[class*="Ladder"]']) {
  const count = await page.locator(sel).count().catch(() => 0)
  if (count > 0 && count < 20) {
    const text = await page.locator(sel).first().textContent().catch(() => '')
    const cls = await page.locator(sel).first().getAttribute('class').catch(() => '')
    if (text?.trim()) console.log(`  ${sel} class="${cls}" => "${text.trim().slice(0, 100)}"`)
  }
}

console.log('\n=== SKU / VARIANT AREA ===')
for (const sel of ['[class*="sku"]', '[class*="Sku"]', '[class*="prop"]', '[class*="Prop"]', '[class*="spec"]']) {
  const count = await page.locator(sel).count().catch(() => 0)
  if (count > 0 && count < 30) {
    const cls = await page.locator(sel).first().getAttribute('class').catch(() => '')
    console.log(`  ${sel} => ${count} elements, first class="${cls}"`)
  }
}

console.log('\n=== DETAIL / DESCRIPTION IFRAMES ===')
const frames = page.frames()
console.log(`  Total frames: ${frames.length}`)
for (const f of frames) {
  console.log(`  Frame url: ${f.url().slice(0, 100)}`)
}

console.log('\n=== DETAIL IMAGE CONTAINERS ===')
for (const sel of [
  '#desc-lazyload-container',
  '[class*="detail"]',
  '[class*="Detail"]',
  '[class*="description"]',
  '[class*="Description"]',
  '#mod-detail',
  '.offer-detail',
]) {
  const count = await page.locator(sel).count().catch(() => 0)
  if (count > 0 && count < 10) {
    const cls = await page.locator(sel).first().getAttribute('class').catch(() => '')
    const id = await page.locator(sel).first().getAttribute('id').catch(() => '')
    const imgCount = await page.locator(`${sel} img`).count().catch(() => 0)
    console.log(`  ${sel} (id="${id}" class="${cls}") => imgs: ${imgCount}`)
  }
}

console.log('\n=== MAIN IMAGE AREA ===')
for (const sel of [
  '[class*="main-img"]', '[class*="mainImg"]', '[class*="gallery"]',
  '[class*="Gallery"]', '[class*="swipe"]', '[class*="carousel"]',
  '[class*="thumb"]', '[class*="Thumb"]',
]) {
  const count = await page.locator(sel).count().catch(() => 0)
  if (count > 0 && count < 20) {
    const imgCount = await page.locator(`${sel} img`).count().catch(() => 0)
    const cls = await page.locator(sel).first().getAttribute('class').catch(() => '')
    console.log(`  ${sel} (class="${cls}") => ${count} els, ${imgCount} imgs`)
  }
}

// Dump the full page HTML to a file for manual inspection
import { writeFileSync } from 'fs'
const html = await page.content()
writeFileSync('scripts/page-dump.html', html)
console.log('\n✓ Full HTML dumped to scripts/page-dump.html')

await browser.close()
