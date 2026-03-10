import 'dotenv/config'
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

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

console.log('Loading page (waiting for network idle)...')
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
console.log('Page loaded. Waiting 2s for JS rendering...')
await page.waitForTimeout(2000)

// --- TITLE ---
console.log('\n=== TITLE ===')
const titleCandidates = [
  '.module-od-title',
  '[class="module-od-title"]',
]
for (const sel of titleCandidates) {
  const count = await page.locator(sel).count().catch(() => 0)
  for (let i = 0; i < count; i++) {
    const text = await page.locator(sel).nth(i).innerText().catch(() => '')
    console.log(`  ${sel}[${i}] => "${text.slice(0, 100)}"`)
  }
}

// --- PRICE ---
console.log('\n=== PRICE ===')
const priceEls = page.locator('.module-od-main-price')
const priceCount = await priceEls.count().catch(() => 0)
for (let i = 0; i < priceCount; i++) {
  const text = await priceEls.nth(i).innerText().catch(() => '')
  console.log(`  .module-od-main-price[${i}] => "${text.slice(0,200).replace(/\n/g,' ')}"`)
}

// --- MAIN IMAGES (background-image on ms-thumb) ---
console.log('\n=== MAIN IMAGES (ms-thumb) ===')
const thumbCount = await page.locator('.ms-thumb').count().catch(() => 0)
console.log('  .ms-thumb count:', thumbCount)
// Get actual background-image via JS
const bgImages = await page.evaluate(() => {
  return [...document.querySelectorAll('.ms-thumb')].map(el => {
    const style = window.getComputedStyle(el)
    return style.backgroundImage
  })
}).catch(() => [])
console.log('  background-images:', bgImages.slice(0,5))

// Also check for img tags with data-src
const imgDataSrc = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-src]')].slice(0,10).map(el => ({
    tag: el.tagName,
    dataSrc: el.getAttribute('data-src'),
    src: el.getAttribute('src'),
    class: el.className.slice(0,50),
  }))
}).catch(() => [])
console.log('  [data-src] elements:', JSON.stringify(imgDataSrc, null, 2))

// Check for img elements in gallery area
const galleryImgs = await page.evaluate(() => {
  const gallery = document.querySelector('.module-od-picture-gallery')
  if (!gallery) return 'NOT FOUND'
  const imgs = [...gallery.querySelectorAll('img')]
  const itemsWithBg = [...gallery.querySelectorAll('[style*="background"]')]
  return {
    imgCount: imgs.length,
    imgs: imgs.slice(0,5).map(img => ({ src: img.src, dataSrc: img.dataset.src })),
    bgCount: itemsWithBg.length,
    bgs: itemsWithBg.slice(0,5).map(el => ({ class: el.className.slice(0,50), style: el.getAttribute('style')?.slice(0,100) }))
  }
}).catch(e => 'ERROR: ' + e.message)
console.log('  Gallery area:', JSON.stringify(galleryImgs, null, 2))

// --- DETAIL DESCRIPTION ---
console.log('\n=== DETAIL DESCRIPTION ===')
// Scroll to detail area first
await page.evaluate(() => {
  const el = document.querySelector('.module-od-product-description')
  if (el) el.scrollIntoView()
})
await page.waitForTimeout(2000)

const descArea = await page.evaluate(() => {
  const desc = document.querySelector('.module-od-product-description')
  if (!desc) return 'NOT FOUND'
  const imgs = [...desc.querySelectorAll('img')]
  return {
    innerHTML: desc.innerHTML.slice(0, 500),
    imgCount: imgs.length,
    imgs: imgs.slice(0,5).map(img => ({
      src: img.src?.slice(0,100),
      dataSrc: img.dataset.src?.slice(0,100),
      dataLazySrc: img.dataset.lazySrc?.slice(0,100),
    }))
  }
}).catch(e => 'ERROR: ' + e.message)
console.log('  Description area:', JSON.stringify(descArea, null, 2))

// Check all img tags in whole page
const allImgs = await page.evaluate(() => {
  return [...document.querySelectorAll('img')].map(img => ({
    src: img.src?.slice(0,100),
    dataSrc: img.dataset?.src?.slice(0,100),
    alt: img.alt?.slice(0,30),
    class: img.className?.slice(0,40),
  })).filter(img => img.src || img.dataSrc)
}).catch(() => [])
console.log('\n=== ALL IMGS on page ===')
console.log('  Total:', allImgs.length)
allImgs.slice(0,20).forEach(img => console.log(' ', JSON.stringify(img)))

// --- SKU ---
console.log('\n=== SKU AREA ===')
const skuArea = await page.evaluate(() => {
  const sku = document.querySelector('.module-od-sku-selection')
  if (!sku) return 'NOT FOUND'
  return {
    innerHTML: sku.innerHTML.slice(0, 1000),
    childCount: sku.children.length,
  }
}).catch(e => 'ERROR: ' + e.message)
console.log('  SKU innerHTML:', typeof skuArea === 'object' ? skuArea.innerHTML?.slice(0,300) : skuArea)

await browser.close()
console.log('\nDone.')
