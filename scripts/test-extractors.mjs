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
    const idx = p.indexOf('='); if (idx === -1) return null
    const name = p.slice(0, idx).trim(); const value = p.slice(idx + 1).trim()
    return name ? { name, value, domain: '.1688.com', path: '/' } : null
  }).filter(Boolean)
  await context.addCookies(cookies)
}

const page = await context.newPage()
page.setDefaultTimeout(3000)

console.log('Loading...')
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForSelector('.module-od-title', { timeout: 15000 }).catch(() => {})
await page.waitForTimeout(500)

// autoScroll
await page.evaluate(async () => {
  await new Promise(resolve => {
    const cap = setTimeout(() => { window.scrollTo(0,0); resolve() }, 2500)
    let h = 0
    const t = setInterval(() => {
      window.scrollBy(0, 500); h += 500
      if (h >= document.body.scrollHeight || h > 10000) {
        clearInterval(t); clearTimeout(cap); window.scrollTo(0,0); resolve()
      }
    }, 200)
  })
}).catch(() => {})

console.log('\n--- NAME ---')
const name = await page.locator('.module-od-title').first().innerText().catch(() => '')
console.log(name.trim().slice(0, 100))

console.log('\n--- DESCRIPTION ---')
const desc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => '')
console.log(desc?.slice(0, 100))

console.log('\n--- PRICE ---')
const priceText = await page.locator('.module-od-main-price').first().innerText().catch(() => '')
console.log(JSON.stringify(priceText.replace(/\s+/g, ' ')))

console.log('\n--- MAIN IMAGES ---')
const mainImgs = await page.evaluate(() => {
  return [...document.querySelectorAll('img.od-gallery-img')]
    .map(img => img.src)
    .filter(src => src && src.includes('alicdn.com') && src.includes('cib.jpg'))
    .filter(src => src.endsWith('_b.jpg') || !src.includes('_.'))
}).catch(() => [])
const uniqMain = [...new Set(mainImgs)]
console.log('Count:', uniqMain.length)
uniqMain.slice(0,3).forEach(u => console.log(' ', u.slice(0,80)))

console.log('\n--- SKU VARIANTS ---')
const groups = page.locator('.module-od-sku-selection .feature-item')
const groupCount = await groups.count().catch(() => 0)
console.log('Groups:', groupCount)
for (let i = 0; i < groupCount; i++) {
  const name2 = await groups.nth(i).locator('.feature-item-label h3').first().innerText().catch(() => '')
  const opts = groups.nth(i).locator('.expand-view-item')
  const optCount = await opts.count().catch(() => 0)
  console.log(`  [${name2}] ${optCount} options`)
  for (let j = 0; j < Math.min(optCount, 3); j++) {
    const val = (await opts.nth(j).innerText().catch(() => '')).trim().split('\n')[0]
    console.log(`    - ${val}`)
  }
}

console.log('\n--- SPECIFICATIONS ---')
const attrRows = page.locator('.module-od-product-attributes tr')
const rowCount = await attrRows.count().catch(() => 0)
console.log('Rows:', rowCount)
for (let i = 0; i < Math.min(rowCount, 5); i++) {
  const cells = attrRows.nth(i).locator('td, th')
  const cc = await cells.count().catch(() => 0)
  if (cc >= 2) {
    const k = await cells.nth(0).innerText().catch(() => '')
    const v = await cells.nth(1).innerText().catch(() => '')
    console.log(`  ${k.trim()}: ${v.trim()}`)
  }
}

console.log('\n--- DETAIL IMAGES ---')
await page.evaluate(() => {
  const el = document.querySelector('.module-od-product-description')
  if (el) el.scrollIntoView({ behavior: 'instant' })
}).catch(() => {})
await page.waitForSelector('#detail-shadow-vender-top img', { timeout: 5000 }).catch(() => console.log('  (detail imgs timeout)'))
await page.waitForTimeout(1000)

const detailImgs = await page.evaluate(() => {
  const c = document.querySelector('#detail-shadow-vender-top')
  if (!c) return []
  return [...c.querySelectorAll('img')].map(img => img.src || img.dataset.src || '').filter(s => s && !s.includes('data:image'))
}).catch(() => [])
console.log('Count:', detailImgs.length)
detailImgs.slice(0, 3).forEach(u => console.log(' ', u.slice(0,80)))

await browser.close()
console.log('\nDone.')
